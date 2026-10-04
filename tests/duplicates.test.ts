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
import {
  canonicalizeUrl,
  computeContentFingerprint,
  checkForDuplicate,
} from "../src/lib/services/duplicate-detection.service";
import { createSavedItem } from "../src/lib/services/saved-items.service";

const USER_A = "test_user_dup_a_11111111-1111-1111-1111-111111111111";
const USER_B = "test_user_dup_b_22222222-2222-2222-2222-222222222222";

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

test("Duplicate Detection: canonicalizeUrl strips query trackers and normalizes paths", () => {
  const url1 = "https://example.com/blog/article?utm_source=twitter&utm_medium=social#heading";
  const url2 = "https://example.com/blog/article";
  const url3 = "HTTPS://EXAMPLE.COM/blog/article/?ref=producthunt&fbclid=123456";

  const canon1 = canonicalizeUrl(url1);
  const canon2 = canonicalizeUrl(url2);
  const canon3 = canonicalizeUrl(url3);

  assert.equal(canon1, "https://example.com/blog/article");
  assert.equal(canon2, "https://example.com/blog/article");
  assert.equal(canon3, "https://example.com/blog/article");
  assert.equal(canon1, canon2);
  assert.equal(canon1, canon3);
});

test("Duplicate Detection: computeContentFingerprint produces deterministic SHA-256 hash", () => {
  const text1 = "  This is a personal knowledge note about React 19 server components.  \n";
  const text2 = "This is a personal knowledge note about React 19 server components.";
  const text3 = "Different text content.";

  const fp1 = computeContentFingerprint(text1);
  const fp2 = computeContentFingerprint(text2);
  const fp3 = computeContentFingerprint(text3);

  assert.equal(fp1, fp2);
  assert.notEqual(fp1, fp3);
  assert.equal(fp1.length, 64); // SHA-256 hex string
});

test("Duplicate Detection: detects URL duplicate for the SAME authenticated user", async () => {
  const originalUrl = "https://github.com/facebook/react?utm_campaign=hackathon";
  const canonical = canonicalizeUrl(originalUrl);

  const created = await createSavedItem(USER_A, {
    title: "React Repository",
    contentType: "Repository",
    source: { type: "url", url: originalUrl },
    canonicalUrl: canonical,
    tags: ["react", "library"],
  });

  // Check with tracking param variation
  const testUrl = "https://github.com/facebook/react?ref=devto";
  const dupCheck = await checkForDuplicate(USER_A, { url: testUrl });

  assert.equal(dupCheck.isDuplicate, true);
  assert.equal(dupCheck.matchType, "url");
  assert.equal(dupCheck.existingItem?.id, created._id.toString());
  assert.equal(dupCheck.existingItem?.title, "React Repository");
});

test("Duplicate Detection: strict per-user isolation (User A does NOT detect User B item)", async () => {
  const testUrl = "https://nextjs.org/docs";
  const canonical = canonicalizeUrl(testUrl);

  // User B creates an item
  await createSavedItem(USER_B, {
    title: "User B's Private Next.js Docs",
    contentType: "Article",
    source: { type: "url", url: testUrl },
    canonicalUrl: canonical,
    tags: ["nextjs"],
  });

  // User A checks the exact same URL -> must NOT be flagged as duplicate for User A
  const dupCheck = await checkForDuplicate(USER_A, { url: testUrl });

  assert.equal(dupCheck.isDuplicate, false);
  assert.equal(dupCheck.existingItem, undefined);
});

test("Duplicate Detection: detects content fingerprint duplicate for text/notes", async () => {
  const noteText = "Important architecture decision: always sanitize SSRF on web fetchers.";
  const fingerprint = computeContentFingerprint(noteText);

  const created = await createSavedItem(USER_A, {
    title: "Architecture Note 1",
    contentType: "Note",
    source: { type: "text", textSnippet: noteText },
    contentFingerprint: fingerprint,
    tags: ["architecture", "security"],
  });

  // Check with whitespace variation of same text
  const checkText = "  Important architecture decision: always sanitize SSRF on web fetchers. \n";
  const dupCheck = await checkForDuplicate(USER_A, { textContent: checkText });

  assert.equal(dupCheck.isDuplicate, true);
  assert.equal(dupCheck.matchType, "fingerprint");
  assert.equal(dupCheck.existingItem?.id, created._id.toString());
});
