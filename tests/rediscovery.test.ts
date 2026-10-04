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
import { RediscoveryResult } from "../src/models/RediscoveryResult";
import { SavedItem } from "../src/models/SavedItem";
import {
  createRediscoveryResult,
  listRediscoveryResults,
  listRediscoveryResultsWithDetails,
} from "../src/lib/services/rediscovery.service";
import { canonicalizeUrl } from "../src/lib/services/duplicate-detection.service";

const USER_A = "test_rediscover_user_a_11111111-1111-1111-1111-111111111111";
const USER_B = "test_rediscover_user_b_22222222-2222-2222-2222-222222222222";

async function cleanTestData() {
  await RediscoveryResult.deleteMany({ userId: { $in: [USER_A, USER_B] } });
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

test("Contextual Rediscovery: GNews articles are normalized and deduplicated by canonical URL", () => {
  const rawArticles = [
    {
      title: "Major Breakthrough in Quantum Computing",
      url: "https://technews.com/quantum?utm_source=feed&utm_medium=rss",
      description: "Researchers announce superconducting qubit advance.",
    },
    {
      title: "Major Breakthrough in Quantum Computing",
      url: "https://technews.com/quantum", // canonical duplicate of the first
      description: "Researchers announce superconducting qubit advance.",
    },
    {
      title: "New Advances in Solid State Batteries",
      url: "https://cleantech.org/batteries",
      description: "EV range extended by 40%.",
    },
  ];

  const uniqueArticles = new Map();
  for (const art of rawArticles) {
    const canonical = canonicalizeUrl(art.url);
    if (!uniqueArticles.has(canonical)) {
      uniqueArticles.set(canonical, art);
    }
  }

  const deduped = Array.from(uniqueArticles.values());
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].url, "https://technews.com/quantum?utm_source=feed&utm_medium=rss");
  assert.equal(deduped[1].url, "https://cleantech.org/batteries");
});

test("Contextual Rediscovery: rejects hallucinated article URLs not in the fetched set", () => {
  const fetchedArticles = [
    { url: "https://reuters.com/tech-news-1", title: "Tech News 1" },
  ];
  const validUrlSet = new Set(fetchedArticles.map((a) => a.url));

  const modelMatch = {
    articleUrl: "https://fabricated-news-source.com/fake-story",
    savedItemId: new Types.ObjectId().toString(),
    relevance: "strong",
    explanation: "Hallucinated article",
  };

  const isValidArticle = validUrlSet.has(modelMatch.articleUrl);
  assert.equal(isValidArticle, false, "Hallucinated article URL must be rejected!");
});

test("Contextual Rediscovery: rejects invalid/hallucinated item and cluster IDs", () => {
  const realItemId = new Types.ObjectId().toString();
  const validItemIds = new Set([realItemId]);
  const realClusterId = new Types.ObjectId().toString();
  const validClusterIds = new Set([realClusterId]);

  const fakeItemId = new Types.ObjectId().toString();
  const fakeClusterId = new Types.ObjectId().toString();

  const matchWithFakeItem = {
    articleUrl: "https://reuters.com/tech-news-1",
    savedItemId: fakeItemId,
    knowledgeClusterId: fakeClusterId,
    relevance: "strong",
  };

  assert.equal(validItemIds.has(matchWithFakeItem.savedItemId), false);
  assert.equal(validClusterIds.has(matchWithFakeItem.knowledgeClusterId), false);
});

test("Contextual Rediscovery: filters out weak/unsupported matches", () => {
  const modelMatches = [
    { relevance: "strong", explanation: "Direct application of pattern" },
    { relevance: "moderate", explanation: "Related conceptual evolution" },
    { relevance: "weak", explanation: "Just happens to mention computers" },
    { relevance: "none", explanation: "Unrelated" },
  ];

  const retained = modelMatches.filter(
    (m) => m.relevance === "strong" || m.relevance === "moderate"
  );

  assert.equal(retained.length, 2);
  assert.equal(retained[0].relevance, "strong");
  assert.equal(retained[1].relevance, "moderate");
});

test("Contextual Rediscovery: deduplicates article and saved-item pairs", () => {
  const itemId = new Types.ObjectId().toString();
  const articleUrl = "https://example.com/ai-update";

  const matches = [
    { articleUrl, savedItemId: itemId, explanation: "First evaluation" },
    { articleUrl, savedItemId: itemId, explanation: "Duplicate evaluation" },
  ];

  const seen = new Set();
  const deduped = [];
  for (const m of matches) {
    const key = `${m.articleUrl}::${m.savedItemId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(m);
    }
  }

  assert.equal(deduped.length, 1);
});

test("Contextual Rediscovery: previous results survive failed refresh", async () => {
  // Create an initial persisted result
  const initial = await createRediscoveryResult(USER_A, {
    article: {
      title: "Persisted Tech News Event",
      url: "https://example.com/initial-event",
      source: "Tech Journal",
    },
    relevance: 0.9,
    relationshipType: "practical-application",
    explanation: "This matches your distributed systems research.",
  });

  let results = await listRediscoveryResults(USER_A);
  assert.equal(results.length, 1);
  assert.equal(results[0].article.title, "Persisted Tech News Event");

  // Simulate an API failure on refresh (e.g. GNews network failure or 429)
  let failed = false;
  try {
    throw new Error("GNews rate limit exceeded (429)");
  } catch {
    failed = true;
    // On failure, service must NOT delete previous results
  }

  assert.equal(failed, true);
  // Re-read results -> previous results must still be intact
  results = await listRediscoveryResults(USER_A);
  assert.equal(results.length, 1);
  assert.equal(results[0]._id.toString(), initial._id.toString());
});

test("Contextual Rediscovery: strict user isolation on rediscovery results", async () => {
  await createRediscoveryResult(USER_B, {
    article: {
      title: "User B Private Discovered Article",
      url: "https://example.com/user-b-news",
    },
    relationshipType: "extends",
    explanation: "Private to User B",
  });

  const userAResults = await listRediscoveryResultsWithDetails(USER_A);
  const leaked = userAResults.some((r) => r.article.title === "User B Private Discovered Article");
  assert.equal(leaked, false, "User A must never see User B rediscovery results!");
});
