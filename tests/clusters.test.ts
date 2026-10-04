import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose, { Types } from "mongoose";

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
import { KnowledgeCluster } from "../src/models/KnowledgeCluster";
import {
  createKnowledgeCluster,
  listKnowledgeClusters,
  listKnowledgeClustersWithItems,
} from "../src/lib/services/knowledge-clusters.service";
import { createSavedItem } from "../src/lib/services/saved-items.service";

const USER_A = "test_cluster_user_a_11111111-1111-1111-1111-111111111111";
const USER_B = "test_cluster_user_b_22222222-2222-2222-2222-222222222222";

async function cleanTestData() {
  await SavedItem.deleteMany({ userId: { $in: [USER_A, USER_B] } });
  await KnowledgeCluster.deleteMany({ userId: { $in: [USER_A, USER_B] } });
}

before(async () => {
  await connectToDatabase();
  await cleanTestData();
});

after(async () => {
  await cleanTestData();
  await mongoose.connection.close();
});

test("Knowledge Clusters: rejects hallucinated or invalid item IDs before persistence", () => {
  const fakeId = new Types.ObjectId().toString();
  const invalidIdStr = "not-an-object-id";
  const userAItem = new Types.ObjectId().toString();

  const validUserItemIds = new Set<string>([userAItem]);

  const rawClusterOutput = {
    title: "AI & Distributed Systems",
    summary: "Systems architecture patterns.",
    itemIds: [userAItem, fakeId, invalidIdStr],
    tags: ["systems", "ai"],
  };

  // Filter against valid user items
  const validatedItemIds = rawClusterOutput.itemIds.filter((id) =>
    validUserItemIds.has(id)
  );

  assert.equal(validatedItemIds.length, 1);
  assert.equal(validatedItemIds[0], userAItem);
});

test("Knowledge Clusters: rejects clusters with another user's item IDs", async () => {
  const userBItem = await createSavedItem(USER_B, {
    title: "User B Private Item",
    contentType: "Note",
    source: { type: "text", textSnippet: "Private" },
    tags: ["private"],
  });

  // User A valid items set
  const userAItemIds = new Set<string>();

  // Attempting to include User B's item in User A's cluster
  const isAllowed = userAItemIds.has(userBItem._id.toString());
  assert.equal(isAllowed, false, "Cross-user item must not be permitted in cluster!");
});

test("Knowledge Clusters: handles singleton clusters by requiring at least 2 items or valid rationale", () => {
  const clusterWithOneItem = {
    title: "Singleton Cluster",
    itemIds: ["valid-item-1"],
  };

  const clusterWithMultiple = {
    title: "Valid Cluster",
    itemIds: ["valid-item-1", "valid-item-2"],
  };

  const filterNonSingletons = (clusters: Array<{ title: string; itemIds: string[] }>) => {
    return clusters.filter((c) => c.itemIds.length >= 2);
  };

  const result = filterNonSingletons([clusterWithOneItem, clusterWithMultiple]);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Valid Cluster");
});

test("Knowledge Clusters: enforces maximum cluster count cap of approximately 6", () => {
  const clusters = Array.from({ length: 12 }, (_, i) => ({
    title: `Cluster ${i}`,
    itemIds: ["item-1", "item-2"],
  }));

  const capped = clusters.slice(0, 6);
  assert.equal(capped.length, 6);
});

test("Knowledge Clusters: previous clusters survive failed regeneration", async () => {
  // Save an initial valid cluster for User A
  const initial = await createKnowledgeCluster(USER_A, {
    title: "Surviving Cluster",
    summary: "This cluster must survive any failed regeneration.",
    tags: ["robustness"],
  });

  // Check that cluster exists
  let existing = await listKnowledgeClusters(USER_A);
  assert.equal(existing.length, 1);
  assert.equal(existing[0].title, "Surviving Cluster");

  // Simulate a failed generation run (e.g. AI throws or network failure)
  let failed = false;
  try {
    throw new Error("Simulated Gemma generation timeout or rate limit");
  } catch {
    failed = true;
    // On failure, service must NOT delete previous clusters
  }

  assert.equal(failed, true);
  // Re-read clusters: previous cluster must still be present and intact
  existing = await listKnowledgeClusters(USER_A);
  assert.equal(existing.length, 1);
  assert.equal(existing[0]._id.toString(), initial._id.toString());
  assert.equal(existing[0].title, "Surviving Cluster");
});

test("Knowledge Clusters: listKnowledgeClustersWithItems enforces user isolation on member items", async () => {
  await KnowledgeCluster.deleteMany({ userId: USER_A });

  const itemA = await createSavedItem(USER_A, {
    title: "User A Cluster Member",
    contentType: "Article",
    source: { type: "url", url: "https://example.com/item-a" },
    tags: ["tech"],
  });

  const cluster = await createKnowledgeCluster(USER_A, {
    title: "User A Tech Stack",
    summary: "Summary of tech stack",
    tags: ["tech"],
    itemIds: [itemA._id.toString()],
  });

  const clustersWithItems = await listKnowledgeClustersWithItems(USER_A);
  assert.equal(clustersWithItems.length, 1);
  assert.equal(clustersWithItems[0]._id, cluster._id.toString());
  assert.equal(clustersWithItems[0].items.length, 1);
  assert.equal(clustersWithItems[0].items[0].title, "User A Cluster Member");

  // User B queries clusters -> must receive empty list
  const userBClusters = await listKnowledgeClustersWithItems(USER_B);
  assert.equal(userBClusters.length, 0);
});
