import test from "node:test";
import assert from "node:assert/strict";
import { extractDocument, computeFingerprint } from "../src/lib/extractors/document";

test("Document Extractor: parses plain text and markdown documents", async () => {
  const sampleMarkdown = `# Software Architecture Guide
  
Event-driven systems decouple producers from consumers using message brokers.
Key components:
- Event Producers
- Event Brokers (e.g. Kafka, RabbitMQ)
- Event Consumers

Fault tolerance is achieved through partitions and consumer groups.`;

  const buffer = Buffer.from(sampleMarkdown, "utf-8");
  const result = await extractDocument({
    buffer,
    fileName: "architecture-guide.md",
    mimeType: "text/markdown",
  });

  assert.equal(result.contentType, "Document");
  assert.equal(result.titleHint, "Architecture Guide");
  assert.ok(result.text.includes("Event-driven systems decouple"));
  assert.equal(result.contentFingerprint, computeFingerprint(buffer));
});

test("Document Extractor: throws informative error on empty buffer", async () => {
  await assert.rejects(
    async () => {
      await extractDocument({
        buffer: Buffer.alloc(0),
        fileName: "empty.pdf",
      });
    },
    /Document file is empty/
  );
});

test("Document Extractor: throws informative error on corrupt or empty text document", async () => {
  // A tiny buffer containing only whitespace
  const whitespaceBuffer = Buffer.from("   \n\t  \n  ", "utf-8");
  await assert.rejects(
    async () => {
      await extractDocument({
        buffer: whitespaceBuffer,
        fileName: "blank.txt",
        mimeType: "text/plain",
      });
    },
    /yielded no readable text/
  );
});

test("Document Extractor: rejects files exceeding maximum size limit (25MB)", async () => {
  // Fake oversized buffer reference (mocked length without allocating 26MB real memory)
  const fakeBigBuffer = {
    length: 26 * 1024 * 1024,
  } as Buffer;

  await assert.rejects(
    async () => {
      await extractDocument({
        buffer: fakeBigBuffer,
        fileName: "giant.pdf",
      });
    },
    /Document exceeds maximum size limit/
  );
});
