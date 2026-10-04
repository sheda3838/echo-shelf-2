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
import {
  SavedItem,
  KnowledgeCluster,
  RediscoveryResult,
  User,
} from "../src/models";
import { ContentType, SourceType } from "../src/types";
import {
  createSavedItem,
  listSavedItems,
  getSavedItemById,
  updateSavedItem,
  deleteSavedItem,
} from "../src/lib/services/saved-items.service";
import {
  createKnowledgeCluster,
  listKnowledgeClusters,
  getKnowledgeClusterById,
  updateKnowledgeCluster,
  deleteKnowledgeCluster,
} from "../src/lib/services/knowledge-clusters.service";
import {
  createRediscoveryResult,
  listRediscoveryResults,
  getRediscoveryResultById,
  deleteRediscoveryResult,
} from "../src/lib/services/rediscovery.service";

const USER_A = "user_test_tenant_a_11111111-1111-1111-1111-111111111111";
const USER_B = "user_test_tenant_b_22222222-2222-2222-2222-222222222222";

async function cleanTestData() {
  await SavedItem.deleteMany({ userId: { $in: [USER_A, USER_B] } });
  await KnowledgeCluster.deleteMany({ userId: { $in: [USER_A, USER_B] } });
  await RediscoveryResult.deleteMany({ userId: { $in: [USER_A, USER_B] } });
  await User.deleteMany({ supabaseUserId: { $in: [USER_A, USER_B] } });
}

before(async () => {
  await connectToDatabase();
  await cleanTestData();
});

after(async () => {
  await cleanTestData();
  await mongoose.disconnect();
});

test("TENANT ISOLATION: SavedItem CRUD and Access Control", async (t) => {
  let userAItemId: string;
  let userBItemId: string;

  await t.test("User A can create a SavedItem and ownership is strictly assigned", async () => {
    const itemA = await createSavedItem(USER_A, {
      title: "User A Next.js Notes",
      contentType: "Note",
      source: { type: "text", textSnippet: "Tenant A secret note" },
      tags: ["nextjs", "tenantA"],
    });

    assert.ok(itemA._id);
    assert.strictEqual(itemA.userId, USER_A);
    assert.strictEqual(itemA.title, "User A Next.js Notes");
    userAItemId = itemA._id.toString();
  });

  await t.test("User B can create a SavedItem and ownership is strictly assigned", async () => {
    const itemB = await createSavedItem(USER_B, {
      title: "User B MongoDB Architecture",
      contentType: "Article",
      source: { type: "url", url: "https://example.com/b-article" },
      tags: ["mongodb", "tenantB"],
    });

    assert.ok(itemB._id);
    assert.strictEqual(itemB.userId, USER_B);
    assert.strictEqual(itemB.title, "User B MongoDB Architecture");
    userBItemId = itemB._id.toString();
  });

  await t.test("User A list query only returns User A items, never User B items", async () => {
    const itemsA = await listSavedItems(USER_A);
    assert.strictEqual(itemsA.length, 1);
    assert.strictEqual(itemsA[0]._id.toString(), userAItemId);
    assert.strictEqual(itemsA[0].userId, USER_A);

    const hasUserBItem = itemsA.some((item) => item.userId === USER_B);
    assert.strictEqual(hasUserBItem, false, "User A list contained User B data!");
  });

  await t.test("User B list query only returns User B items, never User A items", async () => {
    const itemsB = await listSavedItems(USER_B);
    assert.strictEqual(itemsB.length, 1);
    assert.strictEqual(itemsB[0]._id.toString(), userBItemId);
    assert.strictEqual(itemsB[0].userId, USER_B);

    const hasUserAItem = itemsB.some((item) => item.userId === USER_A);
    assert.strictEqual(hasUserAItem, false, "User B list contained User A data!");
  });

  await t.test("User A cannot read User B SavedItem (returns null, hiding resource existence)", async () => {
    const crossAccessResult = await getSavedItemById(USER_A, userBItemId);
    assert.strictEqual(
      crossAccessResult,
      null,
      "Unauthorized read should return null without revealing record existence"
    );
  });

  await t.test("User A cannot update User B SavedItem (returns null and leaves record unchanged)", async () => {
    const maliciousUpdate = await updateSavedItem(USER_A, userBItemId, {
      title: "Hacked by User A",
    });
    assert.strictEqual(maliciousUpdate, null, "Cross-user update must return null");

    // Verify User B's record is intact
    const originalItemB = await getSavedItemById(USER_B, userBItemId);
    assert.ok(originalItemB);
    assert.strictEqual(originalItemB.title, "User B MongoDB Architecture");
  });

  await t.test("User A cannot delete User B SavedItem (returns false and leaves record untouched)", async () => {
    const maliciousDelete = await deleteSavedItem(USER_A, userBItemId);
    assert.strictEqual(maliciousDelete, false, "Cross-user delete must return false");

    // Verify User B's record still exists
    const itemBStillExists = await getSavedItemById(USER_B, userBItemId);
    assert.ok(itemBStillExists, "User B item must still exist after unauthorized delete attempt");
  });

  await t.test("User B can legitimately update and delete their own SavedItem", async () => {
    const updated = await updateSavedItem(USER_B, userBItemId, {
      title: "User B MongoDB Architecture (Updated)",
    });
    assert.ok(updated);
    assert.strictEqual(updated.title, "User B MongoDB Architecture (Updated)");

    const deleted = await deleteSavedItem(USER_B, userBItemId);
    assert.strictEqual(deleted, true);

    const verifyDeleted = await getSavedItemById(USER_B, userBItemId);
    assert.strictEqual(verifyDeleted, null);
  });
});

test("TENANT ISOLATION: KnowledgeCluster Access Control", async (t) => {
  let userAClusterId: string;
  let userBClusterId: string;

  await t.test("User A and User B create isolated clusters", async () => {
    const clusterA = await createKnowledgeCluster(USER_A, {
      title: "Cluster A: Frontend Security",
      tags: ["frontend"],
    });
    const clusterB = await createKnowledgeCluster(USER_B, {
      title: "Cluster B: Database Indexing",
      tags: ["database"],
    });

    userAClusterId = clusterA._id.toString();
    userBClusterId = clusterB._id.toString();

    assert.strictEqual(clusterA.userId, USER_A);
    assert.strictEqual(clusterB.userId, USER_B);
  });

  await t.test("User A can read own cluster but cannot read User B cluster", async () => {
    const ownCluster = await getKnowledgeClusterById(USER_A, userAClusterId);
    assert.ok(ownCluster);
    assert.strictEqual(ownCluster.title, "Cluster A: Frontend Security");

    const result = await getKnowledgeClusterById(USER_A, userBClusterId);
    assert.strictEqual(result, null);
  });

  await t.test("User A cannot update User B cluster", async () => {
    const result = await updateKnowledgeCluster(USER_A, userBClusterId, {
      title: "Compromised Cluster",
    });
    assert.strictEqual(result, null);
  });

  await t.test("User A cannot delete User B cluster", async () => {
    const result = await deleteKnowledgeCluster(USER_A, userBClusterId);
    assert.strictEqual(result, false);

    const clusterB = await getKnowledgeClusterById(USER_B, userBClusterId);
    assert.ok(clusterB);
  });

  await t.test("User cluster lists are completely partitioned", async () => {
    const listA = await listKnowledgeClusters(USER_A);
    const listB = await listKnowledgeClusters(USER_B);

    assert.ok(listA.every((c) => c.userId === USER_A));
    assert.ok(listB.every((c) => c.userId === USER_B));
  });
});

test("TENANT ISOLATION: RediscoveryResult Access Control", async (t) => {
  let userARediscoveryId: string;
  let userBRediscoveryId: string;

  await t.test("User A and User B create isolated rediscovery results", async () => {
    const resA = await createRediscoveryResult(USER_A, {
      article: {
        title: "Discovered Article for A",
        url: "https://example.com/article-a",
      },
      relationshipType: "similar-topic",
      explanation: "Matched user A interest",
    });

    const resB = await createRediscoveryResult(USER_B, {
      article: {
        title: "Discovered Article for B",
        url: "https://example.com/article-b",
      },
      relationshipType: "prerequisite",
      explanation: "Matched user B interest",
    });

    userARediscoveryId = resA._id.toString();
    userBRediscoveryId = resB._id.toString();

    assert.strictEqual(resA.userId, USER_A);
    assert.strictEqual(resB.userId, USER_B);
  });

  await t.test("User A can read own rediscovery result but cannot read User B result", async () => {
    const ownResult = await getRediscoveryResultById(USER_A, userARediscoveryId);
    assert.ok(ownResult);
    assert.strictEqual(ownResult.article.title, "Discovered Article for A");

    const crossResult = await getRediscoveryResultById(USER_A, userBRediscoveryId);
    assert.strictEqual(crossResult, null);
  });

  await t.test("User A cannot delete User B rediscovery result", async () => {
    const result = await deleteRediscoveryResult(USER_A, userBRediscoveryId);
    assert.strictEqual(result, false);

    const resB = await getRediscoveryResultById(USER_B, userBRediscoveryId);
    assert.ok(resB);
  });

  await t.test("User rediscovery lists are strictly partitioned", async () => {
    const listA = await listRediscoveryResults(USER_A);
    const listB = await listRediscoveryResults(USER_B);

    assert.ok(listA.every((r) => r.userId === USER_A));
    assert.ok(listB.every((r) => r.userId === USER_B));
  });
});

test("MODEL VALIDATION: Strict Schema Constraints", async (t) => {
  await t.test("SavedItem requires userId", async () => {
    const invalidDoc = new SavedItem({
      title: "Missing User Item",
      contentType: "Note",
      source: { type: "text", textSnippet: "No user" },
      // userId omitted
    });

    await assert.rejects(async () => {
      await invalidDoc.validate();
    }, /userId is required/);
  });

  await t.test("SavedItem rejects invalid contentType", async () => {
    const invalidDoc = new SavedItem({
      userId: USER_A,
      title: "Bad Content Type",
      contentType: "NonExistentType" as unknown as ContentType,
      source: { type: "text" },
    });

    await assert.rejects(async () => {
      await invalidDoc.validate();
    }, /not a valid contentType/);
  });

  await t.test("SavedItem rejects invalid source.type", async () => {
    const invalidDoc = new SavedItem({
      userId: USER_A,
      title: "Bad Source Type",
      contentType: "Article",
      source: { type: "unsupported_source_type" as unknown as SourceType },
    });

    await assert.rejects(async () => {
      await invalidDoc.validate();
    }, /not a supported source type/);
  });

  await t.test("KnowledgeCluster requires userId", async () => {
    const invalidDoc = new KnowledgeCluster({
      title: "Orphaned Cluster",
      // userId omitted
    });

    await assert.rejects(async () => {
      await invalidDoc.validate();
    }, /userId is required/);
  });

  await t.test("RediscoveryResult requires userId", async () => {
    const invalidDoc = new RediscoveryResult({
      article: { title: "Title", url: "https://example.com" },
      relationshipType: "topic",
      explanation: "reason",
      // userId omitted
    });

    await assert.rejects(async () => {
      await invalidDoc.validate();
    }, /userId is required/);
  });

  await t.test("User model requires supabaseUserId", async () => {
    const invalidDoc = new User({
      displayName: "No Supabase ID",
      // supabaseUserId omitted
    });

    await assert.rejects(async () => {
      await invalidDoc.validate();
    }, /supabaseUserId is required/);
  });
});
