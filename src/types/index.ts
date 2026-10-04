export const CONTENT_TYPES = [
  "Article",
  "Video",
  "Repository",
  "URL",
  "Image",
  "Screenshot",
  "PDF",
  "Document",
  "Note",
  "Other",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const SOURCE_TYPES = ["url", "file", "text"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface IConnection {
  connectedItemId: string;
  strength?: number;
  relationshipType: string;
  explanation?: string;
}

export interface ISource {
  type: SourceType;
  url?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  textSnippet?: string;
}

export interface IPreviewMetadata {
  imageUrl?: string;
  author?: string;
  publishedAt?: string;
  siteName?: string;
  favicon?: string;
}

export interface SavedItemDTO {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  source: ISource;
  metadata?: IPreviewMetadata;
  tags: string[];
  connections: IConnection[];
  canonicalUrl?: string;
  contentFingerprint?: string;
  lastOpened?: string;
  createdAt: string;
  updatedAt: string;
}
