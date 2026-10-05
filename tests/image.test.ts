import test from "node:test";
import assert from "node:assert/strict";
import { extractImage } from "../src/lib/extractors/image";

test("Image Extractor: validates supported MIME types and produces clean extraction", async () => {
  // 1x1 transparent PNG buffer
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

  const result = await extractImage({
    buffer: png1x1,
    fileName: "screenshot-test.png",
    mimeType: "image/png",
  });

  assert.equal(result.contentType, "Image");
  assert.equal(result.titleHint, "Screenshot Test");
  assert.ok(result.previewImageUrl?.startsWith("data:image/png;base64,"));
  assert.ok(result.contentFingerprint);
  assert.equal(result.sourceMetadata.mimeType, "image/png");
});

test("Image Extractor: rejects unsupported image extensions and MIME types", async () => {
  const dummyBuffer = Buffer.from("dummy image data");

  await assert.rejects(
    async () => {
      await extractImage({
        buffer: dummyBuffer,
        fileName: "animation.gif",
        mimeType: "image/gif",
      });
    },
    /Unsupported image type/
  );

  await assert.rejects(
    async () => {
      await extractImage({
        buffer: dummyBuffer,
        fileName: "vector.svg",
        mimeType: "image/svg+xml",
      });
    },
    /Unsupported image type/
  );
});

test("Image Extractor: rejects empty image buffer", async () => {
  await assert.rejects(
    async () => {
      await extractImage({
        buffer: Buffer.alloc(0),
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
      });
    },
    /Uploaded image is empty/
  );
});

test("Image Extractor: rejects images exceeding 10MB limit", async () => {
  const fakeBigImage = {
    length: 11 * 1024 * 1024,
  } as Buffer;

  await assert.rejects(
    async () => {
      await extractImage({
        buffer: fakeBigImage,
        fileName: "large-photo.jpg",
        mimeType: "image/jpeg",
      });
    },
    /Image exceeds maximum size limit/
  );
});
