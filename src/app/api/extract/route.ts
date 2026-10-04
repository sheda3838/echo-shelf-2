import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { extractSource, OtherSourceItem } from "@/lib/extractors";
import { checkDuplicate } from "@/lib/services/duplicate-detection.service";
import { findPotentialConnections } from "@/lib/services/potential-connections.service";
import { ContentType } from "@/types";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  try {
    const contentTypeHeader = request.headers.get("content-type") || "";

    let contentType: ContentType = "Article";
    let url: string | undefined;
    let text: string | undefined;
    let fileBuffer: Buffer | undefined;
    let fileName: string | undefined;
    let fileMimeType: string | undefined;
    let otherSources: OtherSourceItem[] | undefined;

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      contentType = (formData.get("contentType") as ContentType) || "Document";
      url = (formData.get("url") as string) || undefined;
      text = (formData.get("text") as string) || undefined;

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        fileName = file.name;
        fileMimeType = file.type;
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }

      const otherSourcesRaw = formData.get("otherSources");
      if (otherSourcesRaw && typeof otherSourcesRaw === "string") {
        try {
          const parsed = JSON.parse(otherSourcesRaw);
          if (Array.isArray(parsed)) {
            otherSources = [];
            for (let i = 0; i < parsed.length; i++) {
              const item = parsed[i];
              let itemBuffer: Buffer | undefined;
              const subFile = formData.get(`file_${i}`) as File | null;
              if (subFile && subFile.size > 0) {
                const ab = await subFile.arrayBuffer();
                itemBuffer = Buffer.from(ab);
              } else if (item.fileBase64) {
                itemBuffer = Buffer.from(item.fileBase64, "base64");
              }
              otherSources.push({
                type: item.type,
                content: item.content,
                fileName: subFile?.name || item.fileName,
                fileMimeType: subFile?.type || item.fileMimeType,
                fileBuffer: itemBuffer,
              });
            }
          }
        } catch (e) {
          console.warn("Failed to parse multipart otherSources:", e);
        }
      }
    } else {
      const body = await request.json();
      contentType = body.contentType || "Article";
      url = body.url;
      text = body.text;
      fileName = body.fileName;
      fileMimeType = body.fileMimeType;
      if (body.fileBase64) {
        fileBuffer = Buffer.from(body.fileBase64, "base64");
      }
      if (body.otherSources && Array.isArray(body.otherSources)) {
        otherSources = body.otherSources.map(
          (item: {
            type: "text" | "url" | "document" | "image";
            content?: string;
            fileName?: string;
            fileMimeType?: string;
            fileBase64?: string;
          }) => ({
            type: item.type,
            content: item.content,
            fileName: item.fileName,
            fileMimeType: item.fileMimeType,
            fileBuffer: item.fileBase64 ? Buffer.from(item.fileBase64, "base64") : undefined,
          })
        );
      }
    }

    // 1. Perform deterministic source extraction
    const extraction = await extractSource({
      contentType,
      url,
      text,
      fileBuffer,
      fileName,
      fileMimeType,
      otherSources,
    });

    // 2. Perform duplicate check strictly scoped to user
    const duplicateCheck = await checkDuplicate(user.id, {
      rawUrl: url,
      canonicalUrl: extraction.canonicalUrl,
      contentFingerprint: extraction.contentFingerprint,
    });

    // 3. Find non-AI potential connection candidates
    const potentialConnections = await findPotentialConnections(user.id, {
      title: extraction.titleHint,
      description: extraction.descriptionHint,
      limit: 5,
    });

    return NextResponse.json({
      extraction,
      duplicateCheck,
      potentialConnections,
    });
  } catch (err: unknown) {
    console.error("Source extraction error:", err);
    const message = err instanceof Error ? err.message : "Failed to extract source content";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
