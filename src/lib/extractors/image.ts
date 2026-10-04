import { computeFingerprint } from "./document";
import { NormalizedExtraction } from "./types";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ImageInput {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}

const SUPPORTED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export async function extractImage(input: ImageInput): Promise<NormalizedExtraction> {
  const { buffer, fileName, mimeType } = input;

  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded image is empty.");
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image exceeds maximum size limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  const detectedMime =
    mimeType?.toLowerCase() ||
    (fileName.toLowerCase().endsWith(".png")
      ? "image/png"
      : fileName.toLowerCase().endsWith(".webp")
      ? "image/webp"
      : "image/jpeg");

  if (!SUPPORTED_IMAGE_MIMES.includes(detectedMime)) {
    throw new Error(`Unsupported image type: ${detectedMime}. Supported formats: PNG, JPG, WEBP.`);
  }

  const fingerprint = computeFingerprint(buffer);
  const base64Data = buffer.toString("base64");
  const dataUrl = `data:${detectedMime};base64,${base64Data}`;

  const cleanTitle = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return {
    contentType: "Image",
    titleHint: cleanTitle,
    text: `Image file: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`,
    previewImageUrl: dataUrl,
    contentFingerprint: fingerprint,
    sourceMetadata: {
      fileName,
      fileSize: buffer.length,
      mimeType: detectedMime,
      imageBase64: base64Data,
    },
  };
}
