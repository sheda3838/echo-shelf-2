import { ContentType } from "@/types";

export interface OtherSourceItem {
  type: "text" | "url" | "document" | "image";
  content?: string; // text or URL string
  fileBuffer?: Buffer;
  fileName?: string;
  fileMimeType?: string;
}

export interface SourceInput {
  contentType: ContentType;
  url?: string;
  text?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  fileMimeType?: string;
  otherSources?: OtherSourceItem[];
}

export interface NormalizedExtraction {
  contentType: ContentType;
  titleHint?: string;
  text: string;
  descriptionHint?: string;
  previewImageUrl?: string;
  canonicalUrl?: string;
  contentFingerprint?: string;
  sourceMetadata: Record<string, unknown>;
  authorHint?: string;
  siteNameHint?: string;
}
