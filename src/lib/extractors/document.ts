import crypto from "crypto";
import { parseOffice } from "officeparser";
import { NormalizedExtraction } from "./types";

const MAX_DOC_TEXT_LENGTH = 15000;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB safety limit

export interface DocumentInput {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}

/**
 * Computes a SHA-256 fingerprint for binary or text content.
 */
export function computeFingerprint(content: Buffer | string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Extracts normalized plain text from PDF, DOCX, PPTX, and XLSX files.
 */
export async function extractDocument(input: DocumentInput): Promise<NormalizedExtraction> {
  const { buffer, fileName, mimeType } = input;

  if (!buffer || buffer.length === 0) {
    throw new Error("Document file is empty.");
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Document exceeds maximum size limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  const fingerprint = computeFingerprint(buffer);
  const ext = fileName.toLowerCase().split(".").pop() || "";

  let extractedRawText = "";

  try {
    if (ext === "pdf" || mimeType === "application/pdf") {
      // Use pdf-parse for PDF
      // Dynamic import to avoid build-time issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(buffer);
      extractedRawText = pdfData.text || "";
    } else if (
      ["docx", "pptx", "xlsx", "doc", "ppt", "xls"].includes(ext) ||
      mimeType?.includes("officedocument") ||
      mimeType?.includes("msword") ||
      mimeType?.includes("excel")
    ) {
      // Use officeparser for Office formats (docx, pptx, xlsx)
      const officeText = await parseOffice(buffer);
      extractedRawText = typeof officeText === "string" ? officeText : String(officeText);
    } else if (ext === "txt" || ext === "md" || mimeType?.startsWith("text/")) {
      extractedRawText = buffer.toString("utf-8");
    } else {
      // Attempt officeparser fallback
      const officeText = await parseOffice(buffer);
      extractedRawText = typeof officeText === "string" ? officeText : String(officeText);
    }
  } catch (err: unknown) {
    throw new Error(
      `Failed to parse document '${fileName}': ${
        err instanceof Error ? err.message : "Unsupported or encrypted document format."
      }`
    );
  }

  const cleanText = extractedRawText.replace(/\s+/g, " ").trim();

  if (!cleanText || cleanText.length < 10) {
    throw new Error(
      `Document '${fileName}' yielded no readable text. It may be password-protected, scanned without embedded text, or empty.`
    );
  }

  const truncatedText =
    cleanText.length > MAX_DOC_TEXT_LENGTH
      ? cleanText.slice(0, MAX_DOC_TEXT_LENGTH) + "... [truncated]"
      : cleanText;

  // Clean title hint from filename
  const cleanTitle = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return {
    contentType: "Document",
    titleHint: cleanTitle,
    descriptionHint: truncatedText.slice(0, 300),
    text: `Document: ${fileName}\n\n${truncatedText}`,
    contentFingerprint: fingerprint,
    sourceMetadata: {
      fileName,
      fileSize: buffer.length,
      mimeType: mimeType || `application/${ext}`,
      extension: ext,
    },
  };
}
