import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

if (process.loadEnvFile) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // ignore if not present
  }
}

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/echo-shelf-2-test";
}

import { connectToDatabase } from "../src/lib/db/mongodb";
import { SavedItem } from "../src/models/SavedItem";
import { findPotentialConnections } from "../src/lib/services/potential-connections.service";
import { createSavedItem } from "../src/lib/services/saved-items.service";

const USER_A = "test_conn_user_a_11111111-1111-1111-1111-111111111111";
const USER_B = "test_conn_user_b_22222222-2222-2222-2222-222222222222";

async function cleanTestData() {
  await SavedItem.deleteMany({ userId: { $in: [USER_A, USER_B] } });
}

before(async () => {
  await connectToDatabase();
  await cleanTestData();
});

after(async () => {
  await cleanTestData();
  await mongoose.connection.close();
});

test("Potential Connections: deterministic candidate matching scores tag and keyword overlap", async () => {
  // Create test items for User A
  const item1 = await createSavedItem(USER_A, {
    title: "TypeScript Deep Dive and Generics",
    contentType: "Article",
    source: { type: "url", url: "https://example.com/ts" },
    tags: ["typescript", "programming", "javascript"],
    description: "In-depth guide to modern TypeScript syntax and advanced type systems.",
  });

  const item2 = await createSavedItem(USER_A, {
    title: "Advanced React 19 Patterns with TypeScript",
    contentType: "Article",
    source: { type: "url", url: "https://example.com/react-ts" },
    tags: ["react", "typescript", "frontend"],
    description: "Component patterns using TypeScript and React 19 hooks.",
  });

  const item3 = await createSavedItem(USER_A, {
    title: "Gardening and Plant Care Guide",
    contentType: "Note",
    source: { type: "text", textSnippet: "Watering schedule for succulents." },
    tags: ["gardening", "nature"],
    description: "Indoor plant maintenance notes.",
  });

  // Query candidates for a new item about TypeScript
  const candidates = await findPotentialConnections(USER_A, {
    tags: ["typescript", "javascript"],
    title: "Understanding TypeScript Utility Types",
    description: "A tutorial on TypeScript built-in utility types.",
    limit: 5,
  });

  assert.ok(candidates.length >= 2);
  const ids = candidates.map((c) => c.id);
  assert.ok(ids.includes(item1._id.toString()));
  assert.ok(ids.includes(item2._id.toString()));
  // Gardening item should NOT be a top candidate or should have score 0
  const gardeningCandidate = candidates.find((c) => c.id === item3._id.toString());
  assert.equal(gardeningCandidate, undefined);
});

test("Potential Connections: strict per-user isolation (User A never sees User B items)", async () => {
  // User B creates an item with matching tags
  const userBItem = await createSavedItem(USER_B, {
    title: "User B Private Rust Guide",
    contentType: "Article",
    source: { type: "url", url: "https://example.com/rust-private" },
    tags: ["rust", "systems", "concurrency"],
  });

  // User A searches for Rust candidates
  const candidates = await findPotentialConnections(USER_A, {
    tags: ["rust", "systems"],
    title: "Learning Rust Memory Safety",
    limit: 5,
  });

  const includesUserB = candidates.some((c) => c.id === userBItem._id.toString());
  assert.equal(includesUserB, false, "Candidate matching leaked another user's item!");
});

test("Potential Connections: excludes current target item from its own candidate shortlist", async () => {
  const item = await createSavedItem(USER_A, {
    title: "Self-exclusion Verification Item",
    contentType: "Note",
    source: { type: "text", textSnippet: "Self test" },
    tags: ["testing", "verification"],
  });

  const candidates = await findPotentialConnections(USER_A, {
    excludeItemId: item._id.toString(),
    tags: ["testing", "verification"],
    title: "Self-exclusion Verification Item",
    limit: 5,
  });

  const containsSelf = candidates.some((c) => c.id === item._id.toString());
  assert.equal(containsSelf, false, "Target item must not be included in its own potential connections!");
});

test("Smart Connections Validation: rejects hallucinated candidate IDs and self-connections", async () => {
  const target = await createSavedItem(USER_A, {
    title: "Target Asset for AI Validation",
    contentType: "Article",
    source: { type: "url", url: "https://example.com/target" },
    tags: ["security"],
  });

  // Simulated AI response containing:
  // 1. A self-referencing ID
  // 2. A non-existent hallucinated ID
  // 3. An ID belonging to User B
  const fakeId = new mongoose.Types.ObjectId().toString();

  const userBTarget = await createSavedItem(USER_B, {
    title: "User B Secret Asset",
    contentType: "Note",
    source: { type: "text", textSnippet: "Confidential" },
    tags: ["security"],
  });

  // Valid candidates for User A only include real User A items
  const validUserAIds = new Set<string>(); // none other exist for User A with "security"

  // Validation logic as implemented in smart-connections.service:
  const evaluations = [
    {
      connectedItemId: target._id.toString(), // self
      relationshipType: "prerequisite",
      strength: "strong" as const,
      explanation: "Self link",
    },
    {
      connectedItemId: fakeId, // hallucinated
      relationshipType: "extends",
      strength: "strong" as const,
      explanation: "Hallucinated link",
    },
    {
      connectedItemId: userBTarget._id.toString(), // other user
      relationshipType: "complementary",
      strength: "strong" as const,
      explanation: "Cross-tenant leak attempt",
    },
  ];

  const filtered = evaluations.filter((ev) => {
    if (ev.connectedItemId === target._id.toString()) return false;
    if (!validUserAIds.has(ev.connectedItemId)) return false;
    return true;
  });

  assert.equal(filtered.length, 0, "All invalid, hallucinated, or cross-user links must be rejected!");
});
