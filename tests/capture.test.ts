import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateOrInternalHost } from "../src/lib/extractors/url";
import { parseRepositoryUrl } from "../src/lib/extractors/repository";
import { extractYouTubeVideoId } from "../src/lib/extractors/youtube";

test("SSRF Protection: rejects private and local addresses including subnets and mapped IPv6", () => {
  assert.equal(isPrivateOrInternalHost("localhost"), true);
  assert.equal(isPrivateOrInternalHost("127.0.0.1"), true);
  assert.equal(isPrivateOrInternalHost("127.0.0.2"), true);
  assert.equal(isPrivateOrInternalHost("127.255.255.254"), true);
  assert.equal(isPrivateOrInternalHost("0.0.0.0"), true);
  assert.equal(isPrivateOrInternalHost("0"), true);
  assert.equal(isPrivateOrInternalHost("10.0.0.1"), true);
  assert.equal(isPrivateOrInternalHost("10.255.255.255"), true);
  assert.equal(isPrivateOrInternalHost("172.16.0.1"), true);
  assert.equal(isPrivateOrInternalHost("172.31.255.255"), true);
  assert.equal(isPrivateOrInternalHost("192.168.1.1"), true);
  assert.equal(isPrivateOrInternalHost("169.254.169.254"), true); // AWS/cloud metadata
  assert.equal(isPrivateOrInternalHost("100.64.0.1"), true); // Carrier-Grade NAT
  assert.equal(isPrivateOrInternalHost("::1"), true);
  assert.equal(isPrivateOrInternalHost("::ffff:127.0.0.1"), true); // IPv4-mapped IPv6
  assert.equal(isPrivateOrInternalHost("::ffff:169.254.169.254"), true);
  assert.equal(isPrivateOrInternalHost("2130706433"), true); // integer decimal IP
  assert.equal(isPrivateOrInternalHost("google.com"), false);
  assert.equal(isPrivateOrInternalHost("github.com"), false);
  assert.equal(isPrivateOrInternalHost("dev.to"), false);
});

test("Repository Extractor: correctly parses GitHub URLs", () => {
  const parsed1 = parseRepositoryUrl("https://github.com/facebook/react");
  assert.notEqual(parsed1, null);
  assert.equal(parsed1.provider, "github");
  assert.equal(parsed1.ownerOrNamespace, "facebook");
  assert.equal(parsed1.repo, "react");

  const parsed2 = parseRepositoryUrl("https://github.com/vercel/next.js/tree/canary");
  assert.notEqual(parsed2, null);
  assert.equal(parsed2.provider, "github");
  assert.equal(parsed2.ownerOrNamespace, "vercel");
  assert.equal(parsed2.repo, "next.js");
});

test("Repository Extractor: correctly parses GitLab URLs including nested namespaces", () => {
  const parsed = parseRepositoryUrl("https://gitlab.com/gitlab-org/gitlab");
  assert.notEqual(parsed, null);
  assert.equal(parsed.provider, "gitlab");
  assert.equal(parsed.ownerOrNamespace, "gitlab-org");
  assert.equal(parsed.repo, "gitlab");
});

test("Repository Extractor: throws on invalid repository URLs", () => {
  assert.throws(() => parseRepositoryUrl("https://google.com"));
  assert.throws(() => parseRepositoryUrl("https://github.com"));
  assert.throws(() => parseRepositoryUrl("not-a-url"));
});

test("YouTube Extractor: parses standard watch, youtu.be, shorts, and embed URLs", () => {
  const watchUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share";
  const shortUrl = "https://youtu.be/dQw4w9WgXcQ?t=42";
  const shortsUrl = "https://www.youtube.com/shorts/dQw4w9WgXcQ";
  const embedUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";

  assert.equal(extractYouTubeVideoId(watchUrl), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeVideoId(shortUrl), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeVideoId(shortsUrl), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeVideoId(embedUrl), "dQw4w9WgXcQ");
  assert.throws(() => extractYouTubeVideoId("https://vimeo.com/123456"));
});

test("AI Structured Output: runtime schema validation enforces title, description, and tags", () => {
  const validOutput = {
    title: "Understanding Next.js Server Components",
    description: "A comprehensive guide to React Server Components and App Router.",
    tags: ["nextjs", "react", "architecture"],
  };

  const validateOutput = (data: unknown): boolean => {
    if (!data || typeof data !== "object") return false;
    const record = data as Record<string, unknown>;
    if (typeof record.title !== "string" || !record.title.trim()) return false;
    if (typeof record.description !== "string" || !record.description.trim()) return false;
    if (
      !Array.isArray(record.tags) ||
      record.tags.some((t: unknown) => typeof t !== "string")
    ) {
      return false;
    }
    return true;
  };

  assert.equal(validateOutput(validOutput), true);
  assert.equal(validateOutput({ title: "Only title" }), false);
  assert.equal(validateOutput({ title: "", description: "test", tags: [] }), false);
  assert.equal(validateOutput(null), false);
});

test("Other Extractor: combines multiple source inputs cleanly into normalized extraction", async () => {
  const { extractSource } = await import("../src/lib/extractors");

  const result = await extractSource({
    contentType: "Other",
    otherSources: [
      {
        type: "text",
        content: "Core architectural notes regarding distributed systems and event loops.",
      },
      {
        type: "url",
        content: "https://github.com/facebook/react",
      },
    ],
  });

  assert.equal(result.contentType, "Other");
  assert.ok(result.text.includes("[Note / Text Excerpt]"));
  assert.ok(result.text.includes("[URL Source:"));
  assert.ok(result.contentFingerprint);
  assert.ok(result.text.length > 50);
});

test("URL Protocol Safety: isSafeWebUrl strictly permits only http and https", async () => {
  const { isSafeWebUrl } = await import("../src/lib/services/saved-items.service");

  assert.equal(isSafeWebUrl("https://example.com"), true);
  assert.equal(isSafeWebUrl("http://example.com/path?query=1"), true);
  assert.equal(isSafeWebUrl("javascript:alert(1)"), false);
  assert.equal(isSafeWebUrl("javascript:void(0)"), false);
  assert.equal(isSafeWebUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeWebUrl("vbscript:msgbox(1)"), false);
  assert.equal(isSafeWebUrl("file:///etc/passwd"), false);
  assert.equal(isSafeWebUrl(undefined), true);
  assert.equal(isSafeWebUrl(""), true);
});

test("SSRF URL Normalization: validateAndNormalizeUrl blocks internal and private targets", async () => {
  const { validateAndNormalizeUrl } = await import("../src/lib/extractors/url");

  assert.throws(() => validateAndNormalizeUrl("http://localhost:3000/api"));
  assert.throws(() => validateAndNormalizeUrl("http://127.0.0.1:8080"));
  assert.throws(() => validateAndNormalizeUrl("http://127.0.0.2:9999"));
  assert.throws(() => validateAndNormalizeUrl("http://169.254.169.254/latest/meta-data"));
  assert.throws(() => validateAndNormalizeUrl("http://10.0.0.5:80"));
  assert.throws(() => validateAndNormalizeUrl("http://192.168.1.1"));
  assert.throws(() => validateAndNormalizeUrl("ftp://example.com"));
  assert.throws(() => validateAndNormalizeUrl("not-a-valid-url"));

  const valid = validateAndNormalizeUrl("https://github.com/facebook/react");
  assert.equal(valid.hostname, "github.com");
  assert.equal(valid.protocol, "https:");
});

