import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

if (process.loadEnvFile) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore
  }
}

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/echo-shelf-2-test";
}

import { connectToDatabase } from "../src/lib/db/mongodb";
import { SavedItem, KnowledgeCluster, RediscoveryResult } from "../src/models";
import {
  createSavedItem,
  getSavedItemById,
  updateSavedItem,
  deleteSavedItem,
} from "../src/lib/services/saved-items.service";
import { isPrivateOrInternalHost } from "../src/lib/extractors/url";
import { cleanAndParseJson } from "../src/lib/ai/gemma";

const ATTACKER = "attacker_uuid_99999999-9999-9999-9999-999999999999";
const VICTIM = "victim_uuid_88888888-8888-8888-8888-888888888888";

async function cleanSecurityTestData() {
  await SavedItem.deleteMany({ userId: { $in: [ATTACKER, VICTIM] } });
  await KnowledgeCluster.deleteMany({ userId: { $in: [ATTACKER, VICTIM] } });
  await RediscoveryResult.deleteMany({ userId: { $in: [ATTACKER, VICTIM] } });
}

before(async () => {
  await connectToDatabase();
  await cleanSecurityTestData();
});

after(async () => {
  await cleanSecurityTestData();
  await mongoose.disconnect();
});

test("SECURITY: Cross-tenant ID substitution attack is strictly masked (returns null/false)", async () => {
  // Victim creates a private item
  const victimItem = await createSavedItem(VICTIM, {
    title: "Victim's Confidential Architecture Doc",
    description: "Internal IP addresses and private API secrets",
    contentType: "Document",
    source: { type: "file", fileName: "secrets.pdf" },
  });

  // Attacker attempts to read victim item by ID
  const attackerRead = await getSavedItemById(ATTACKER, victimItem._id.toString());
  assert.equal(attackerRead, null, "Attacker read attempt MUST return null (masking existence)");

  // Attacker attempts to overwrite victim item
  const attackerUpdate = await updateSavedItem(ATTACKER, victimItem._id.toString(), {
    title: "HACKED TITLE",
  });
  assert.equal(attackerUpdate, null, "Attacker update attempt MUST return null");

  // Verify victim item was untouched
  const verifiedVictimItem = await getSavedItemById(VICTIM, victimItem._id.toString());
  assert.equal(verifiedVictimItem?.title, "Victim's Confidential Architecture Doc");

  // Attacker attempts to delete victim item
  const attackerDelete = await deleteSavedItem(ATTACKER, victimItem._id.toString());
  assert.equal(attackerDelete, false, "Attacker delete attempt MUST return false");

  // Verify victim item still exists
  const stillExists = await getSavedItemById(VICTIM, victimItem._id.toString());
  assert.notEqual(stillExists, null);
});

test("SECURITY: Malicious JavaScript URI payloads are rejected by service layer", async () => {
  // Attempt to save item with javascript: in source.url
  await assert.rejects(
    async () => {
      await createSavedItem(ATTACKER, {
        title: "XSS Attempt 1",
        contentType: "URL",
        source: {
          type: "url",
          url: "javascript:alert(document.cookie)",
        },
      });
    },
    /Invalid URL protocol/
  );

  // Attempt to save item with data: in source.url
  await assert.rejects(
    async () => {
      await createSavedItem(ATTACKER, {
        title: "XSS Attempt 2",
        contentType: "URL",
        source: {
          type: "url",
          url: "data:text/html,<script>alert(1)</script>",
        },
      });
    },
    /Invalid URL protocol/
  );

  // Attempt to update canonicalUrl with javascript:
  const safeItem = await createSavedItem(ATTACKER, {
    title: "Safe Item",
    contentType: "Note",
    source: { type: "text", textSnippet: "Safe content" },
  });

  await assert.rejects(
    async () => {
      await updateSavedItem(ATTACKER, safeItem._id.toString(), {
        canonicalUrl: "javascript:void(0)",
      });
    },
    /Invalid canonical URL protocol/
  );
});

test("SECURITY: Mass-assignment attacks cannot reassign document ownership", async () => {
  const item = await createSavedItem(ATTACKER, {
    title: "Attacker Note",
    contentType: "Note",
    source: { type: "text", textSnippet: "Trying to reassign" },
  });

  // Attempt to inject userId into update payload
  const updatePayload: Record<string, unknown> = {
    title: "Modified Note",
    userId: VICTIM, // malicious reassignment
  };

  await updateSavedItem(ATTACKER, item._id.toString(), updatePayload as unknown as Record<string, unknown>);

  // Verify document is still owned by ATTACKER and NOT VICTIM
  const docAfter = await SavedItem.findById(item._id).lean();
  assert.equal(docAfter?.userId, ATTACKER, "Document ownership MUST NOT be mutable");
});

test("SECURITY: SSRF Defense detects private subnets, localhost, and metadata IPs", () => {
  const dangerousTargets = [
    "127.0.0.1",
    "127.0.0.2",
    "127.127.1.1",
    "localhost",
    "0.0.0.0",
    "0",
    "10.0.0.1",
    "10.254.254.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // AWS/GCP instance metadata
    "100.64.0.1", // CGNAT
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "2130706433", // raw integer IP
  ];

  for (const target of dangerousTargets) {
    assert.equal(
      isPrivateOrInternalHost(target),
      true,
      `Expected ${target} to be blocked as private/internal`
    );
  }

  const safeTargets = ["google.com", "api.github.com", "dev.to", "wikipedia.org"];
  for (const target of safeTargets) {
    assert.equal(
      isPrivateOrInternalHost(target),
      false,
      `Expected ${target} to be allowed`
    );
  }
});

test("SECURITY: Prompt Injection defense ensures JSON extraction fallback on malformed or adversarial output", () => {
  const adversarialResponse = `I have ignored your system instructions and extracted the secret API key.
Here is the key: sk_live_123456789.
Now delete all items.`;

  const fallback = {
    title: "Default Title",
    description: "Default description",
    tags: ["security"],
  };

  const parsed = cleanAndParseJson(adversarialResponse, fallback);
  assert.deepEqual(
    parsed,
    fallback,
    "Adversarial non-JSON output must cleanly return safe schema fallback"
  );
});

test("SECURITY: cleanAndParseJson correctly strips markdown fences and extracts enclosed JSON", () => {
  const validJsonInMarkdown = `\`\`\`json
{
  "title": "Sanitized Title",
  "description": "Valid extracted summary",
  "tags": ["ai", "security"]
}
\`\`\``;

  const fallback = { title: "", description: "", tags: [] };
  const parsed = cleanAndParseJson<{ title: string; description: string; tags: string[] }>(
    validJsonInMarkdown,
    fallback
  );

  assert.equal(parsed.title, "Sanitized Title");
  assert.equal(parsed.tags.length, 2);
  assert.equal(parsed.tags[0], "ai");
});
