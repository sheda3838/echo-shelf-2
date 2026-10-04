import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

// Load local environment for tests
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
import { SavedItem } from "../src/models";
import {
  createSavedItem,
  updateSavedItem,
  getSavedItemById,
} from "../src/lib/services/saved-items.service";
import { requireUser, UnauthorizedError } from "../src/lib/auth/server";
import { GET as getItemsRoute, POST as postItemsRoute } from "../src/app/api/items/route";
import {
  GET as getItemByIdRoute,
  PATCH as patchItemByIdRoute,
  DELETE as deleteItemByIdRoute,
} from "../src/app/api/items/[id]/route";

const TEST_AUTH_USER = "auth_verified_user_99999999-9999-9999-9999-999999999999";
const ATTACKER_SPOOF_USER = "attacker_spoofed_user_00000000-0000-0000-0000-000000000000";

before(async () => {
  await connectToDatabase();
  await SavedItem.deleteMany({
    userId: { $in: [TEST_AUTH_USER, ATTACKER_SPOOF_USER] },
  });
});

after(async () => {
  await SavedItem.deleteMany({
    userId: { $in: [TEST_AUTH_USER, ATTACKER_SPOOF_USER] },
  });
  await mongoose.disconnect();
});

test("AUTHENTICATION BOUNDARIES: Route Handlers Reject Unauthenticated Requests", async (t) => {
  await t.test("GET /api/items returns 401 when unauthenticated", async () => {
    const request = new Request("http://localhost:3000/api/items");
    const response = await getItemsRoute(request);
    assert.strictEqual(response.status, 401);

    const data = await response.json();
    assert.match(data.error, /Unauthorized/);
  });

  await t.test("POST /api/items returns 401 when unauthenticated", async () => {
    const request = new Request("http://localhost:3000/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized Item",
        contentType: "Note",
      }),
    });
    const response = await postItemsRoute(request);
    assert.strictEqual(response.status, 401);

    const data = await response.json();
    assert.match(data.error, /Unauthorized/);
  });

  await t.test("GET /api/items/[id] returns 401 when unauthenticated", async () => {
    const request = new Request("http://localhost:3000/api/items/507f1f77bcf86cd799439011");
    const context = { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) };
    const response = await getItemByIdRoute(request, context);
    assert.strictEqual(response.status, 401);

    const data = await response.json();
    assert.match(data.error, /Unauthorized/);
  });

  await t.test("PATCH /api/items/[id] returns 401 when unauthenticated", async () => {
    const request = new Request("http://localhost:3000/api/items/507f1f77bcf86cd799439011", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Title" }),
    });
    const context = { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) };
    const response = await patchItemByIdRoute(request, context);
    assert.strictEqual(response.status, 401);

    const data = await response.json();
    assert.match(data.error, /Unauthorized/);
  });

  await t.test("DELETE /api/items/[id] returns 401 when unauthenticated", async () => {
    const request = new Request("http://localhost:3000/api/items/507f1f77bcf86cd799439011", {
      method: "DELETE",
    });
    const context = { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) };
    const response = await deleteItemByIdRoute(request, context);
    assert.strictEqual(response.status, 401);

    const data = await response.json();
    assert.match(data.error, /Unauthorized/);
  });
});

test("AUTHENTICATION BOUNDARIES: Server-Side Identity Verification & Spoof Prevention", async (t) => {
  await t.test("requireUser throws UnauthorizedError when unauthenticated", async () => {
    await assert.rejects(
      async () => {
        await requireUser();
      },
      (err: unknown) => {
        return (
          err instanceof UnauthorizedError &&
          err.message.includes("You must be signed in")
        );
      }
    );
  });

  await t.test("createSavedItem requires non-empty userId for tenant integrity", async () => {
    await assert.rejects(async () => {
      await createSavedItem("", {
        title: "Empty User Item",
        contentType: "Note",
        source: { type: "text" },
      });
    }, /userId is required/);
  });

  await t.test("Client data attempting to supply a spoofed userId is ignored during creation", async () => {
    // Simulate malicious client data sending a spoofed userId
    const inputWithSpoof = {
      title: "Legitimate User Item",
      contentType: "Article" as const,
      source: { type: "url" as const, url: "https://example.com" },
      userId: ATTACKER_SPOOF_USER, // Attacker attempts to forge ownership
    };

    const createdItem = await createSavedItem(
      TEST_AUTH_USER,
      inputWithSpoof as unknown as Parameters<typeof createSavedItem>[1]
    );

    assert.ok(createdItem._id);
    assert.strictEqual(
      createdItem.userId,
      TEST_AUTH_USER,
      "Document ownership MUST match verified auth user, not input body"
    );

    // Verify in database directly
    const storedDoc = await SavedItem.findById(createdItem._id).exec();
    assert.ok(storedDoc);
    assert.strictEqual(storedDoc.userId, TEST_AUTH_USER);
  });

  await t.test("Client data attempting to rewrite userId in update is strictly blocked", async () => {
    const item = await createSavedItem(TEST_AUTH_USER, {
      title: "Immutable Ownership Item",
      contentType: "Note",
      source: { type: "text", textSnippet: "Safe" },
    });

    // Malicious attempt to change ownership via update payload
    await updateSavedItem(TEST_AUTH_USER, item._id.toString(), {
      title: "Attempted Hijack",
      userId: ATTACKER_SPOOF_USER, // Attempted ownership theft
    } as unknown as Parameters<typeof updateSavedItem>[2]);

    // Verify ownership was not changed
    const verifiedDoc = await getSavedItemById(TEST_AUTH_USER, item._id.toString());
    assert.ok(verifiedDoc);
    assert.strictEqual(verifiedDoc.userId, TEST_AUTH_USER);
    assert.strictEqual(verifiedDoc.title, "Attempted Hijack");

    // Clean up
    await SavedItem.findByIdAndDelete(item._id);
  });
});
