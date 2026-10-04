import { NormalizedExtraction, SourceInput } from "./types";
import { extractArticleOrUrl } from "./url";
import { extractRepository } from "./repository";
import { extractYouTubeVideo } from "./youtube";
import { extractDocument, computeFingerprint } from "./document";
import { extractImage } from "./image";

export * from "./types";
export * from "./url";
export * from "./repository";
export * from "./youtube";
export * from "./document";
export * from "./image";

/**
 * Master extraction entry point.
 * Dispatches to content-specific extraction logic and returns a normalized context.
 */
export async function extractSource(input: SourceInput): Promise<NormalizedExtraction> {
  const { contentType, url, text, fileBuffer, fileName, fileMimeType } = input;

  switch (contentType) {
    case "Article":
    case "URL": {
      if (!url || !url.trim()) {
        throw new Error("URL is required for Article and URL extraction.");
      }
      return await extractArticleOrUrl(url, contentType);
    }

    case "Repository": {
      if (!url || !url.trim()) {
        throw new Error("Repository URL (GitHub or GitLab) is required.");
      }
      return await extractRepository(url);
    }

    case "Video": {
      if (!url || !url.trim()) {
        throw new Error("Video URL (YouTube) is required.");
      }
      return await extractYouTubeVideo(url);
    }

    case "Document":
    case "PDF": {
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("Document file is required.");
      }
      return await extractDocument({
        buffer: fileBuffer,
        fileName: fileName || "document.pdf",
        mimeType: fileMimeType,
      });
    }

    case "Image":
    case "Screenshot": {
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("Image file is required.");
      }
      return await extractImage({
        buffer: fileBuffer,
        fileName: fileName || "image.png",
        mimeType: fileMimeType,
      });
    }

    case "Other": {
      // If otherSources array is provided, process each item through its appropriate extractor
      if (input.otherSources && input.otherSources.length > 0) {
        const sections: string[] = [];
        let combinedTitleHint: string | undefined;
        let combinedPreviewImageUrl: string | undefined;
        let combinedCanonicalUrl: string | undefined;
        let processedCount = 0;

        for (const item of input.otherSources) {
          if (item.type === "text" && item.content && item.content.trim()) {
            const trimmed = item.content.trim();
            sections.push(`[Note / Text Excerpt]\n${trimmed}`);
            if (!combinedTitleHint) {
              const firstLine = trimmed.split("\n")[0]?.trim();
              if (firstLine) combinedTitleHint = firstLine.slice(0, 60);
            }
            processedCount++;
          } else if (item.type === "url" && item.content && item.content.trim()) {
            const urlStr = item.content.trim();
            try {
              let urlExt: NormalizedExtraction;
              if (urlStr.includes("youtube.com") || urlStr.includes("youtu.be")) {
                urlExt = await extractYouTubeVideo(urlStr);
              } else if (urlStr.includes("github.com") || urlStr.includes("gitlab.com")) {
                urlExt = await extractRepository(urlStr);
              } else {
                urlExt = await extractArticleOrUrl(urlStr, "URL");
              }

              sections.push(`[URL Source: ${urlExt.titleHint || urlStr}]\n${urlExt.text}`);
              if (!combinedTitleHint && urlExt.titleHint) {
                combinedTitleHint = urlExt.titleHint;
              }
              if (!combinedPreviewImageUrl && urlExt.previewImageUrl) {
                combinedPreviewImageUrl = urlExt.previewImageUrl;
              }
              if (!combinedCanonicalUrl && urlExt.canonicalUrl) {
                combinedCanonicalUrl = urlExt.canonicalUrl;
              }
              processedCount++;
            } catch (err: unknown) {
              console.warn(`Extraction error for Other source URL ${urlStr}:`, err);
              sections.push(`[URL Source: ${urlStr}]\nReference link: ${urlStr}`);
              processedCount++;
            }
          } else if (item.type === "document" && item.fileBuffer && item.fileBuffer.length > 0) {
            try {
              const docExt = await extractDocument({
                buffer: item.fileBuffer,
                fileName: item.fileName || "document.pdf",
                mimeType: item.fileMimeType,
              });
              sections.push(`[Document: ${item.fileName || "Uploaded Document"}]\n${docExt.text}`);
              if (!combinedTitleHint && docExt.titleHint) {
                combinedTitleHint = docExt.titleHint;
              }
              processedCount++;
            } catch (err: unknown) {
              console.warn(`Extraction error for Other document ${item.fileName}:`, err);
            }
          } else if (item.type === "image" && item.fileBuffer && item.fileBuffer.length > 0) {
            try {
              const imgExt = await extractImage({
                buffer: item.fileBuffer,
                fileName: item.fileName || "image.png",
                mimeType: item.fileMimeType,
              });
              sections.push(`[Image: ${item.fileName || "Uploaded Image"}]\n${imgExt.text}`);
              if (!combinedTitleHint && imgExt.titleHint) {
                combinedTitleHint = imgExt.titleHint;
              }
              if (!combinedPreviewImageUrl && imgExt.previewImageUrl) {
                combinedPreviewImageUrl = imgExt.previewImageUrl;
              }
              processedCount++;
            } catch (err: unknown) {
              console.warn(`Extraction error for Other image ${item.fileName}:`, err);
            }
          }
        }

        if (sections.length === 0 || processedCount === 0) {
          throw new Error("At least one meaningful source input (text, URL, document, or image) is required for Other.");
        }

        // Combine and apply sensible limit (15,000 characters)
        let combinedText = sections.join("\n\n---\n\n");
        if (combinedText.length > 15000) {
          combinedText = combinedText.slice(0, 15000) + "\n\n[Content truncated for AI context limits]";
        }

        const fingerprint = computeFingerprint(combinedText);

        return {
          contentType: "Other",
          titleHint: combinedTitleHint || "Composite Knowledge Asset",
          descriptionHint: combinedText.slice(0, 300),
          previewImageUrl: combinedPreviewImageUrl,
          canonicalUrl: combinedCanonicalUrl,
          text: combinedText,
          contentFingerprint: fingerprint,
          sourceMetadata: {
            type: "multi-source",
            sourceCount: processedCount,
            charCount: combinedText.length,
          },
        };
      }

      // Fallback if otherSources was not passed
      const trimmedText = (text || "").trim();
      if (!trimmedText && (!url || !url.trim())) {
        throw new Error("At least one source input (notes, URL, document, or image) is required for Other.");
      }

      if (url && url.trim() && !trimmedText) {
        return await extractArticleOrUrl(url, "Other");
      }

      const fingerprint = computeFingerprint(trimmedText);
      const lines = trimmedText.split("\n").filter((l) => l.trim().length > 0);
      const firstLine = lines[0] || "Custom Asset";
      const titleHint = firstLine.slice(0, 60);

      return {
        contentType: "Other",
        titleHint,
        descriptionHint: trimmedText.slice(0, 300),
        text: trimmedText,
        contentFingerprint: fingerprint,
        sourceMetadata: {
          charCount: trimmedText.length,
          type: "text",
        },
      };
    }

    case "Note":
    default: {
      const trimmedText = (text || "").trim();
      if (!trimmedText && (!url || !url.trim())) {
        throw new Error("Text content or URL is required for Notes.");
      }

      // If a URL was provided for Note, extract from URL
      if (url && url.trim() && !trimmedText) {
        return await extractArticleOrUrl(url, contentType);
      }

      const fingerprint = computeFingerprint(trimmedText);
      const lines = trimmedText.split("\n").filter((l) => l.trim().length > 0);
      const firstLine = lines[0] || "Quick Note";
      const titleHint = firstLine.slice(0, 60);

      return {
        contentType,
        titleHint,
        descriptionHint: trimmedText.slice(0, 300),
        text: trimmedText,
        contentFingerprint: fingerprint,
        sourceMetadata: {
          charCount: trimmedText.length,
          type: "text",
        },
      };
    }
  }
}
