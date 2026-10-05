"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ContentType } from "@/types";
import { NormalizedExtraction } from "@/lib/extractors/types";
import { DuplicateCheckResult } from "@/lib/services/duplicate-detection.service";
import { PotentialConnectionCandidate } from "@/lib/services/potential-connections.service";

const CONTENT_TYPE_OPTIONS: Array<{
  type: ContentType;
  label: string;
  icon: string;
  description: string;
}> = [
  { type: "Article", label: "Article", icon: "📰", description: "Web page, essay, or blog post" },
  { type: "Video", label: "Video", icon: "▶️", description: "YouTube video or Short" },
  { type: "Repository", label: "Repository", icon: "💻", description: "GitHub or GitLab repo" },
  { type: "URL", label: "URL", icon: "🔗", description: "General web destination" },
  { type: "Document", label: "Document", icon: "📄", description: "PDF, DOCX, PPTX, XLSX" },
  { type: "Image", label: "Image", icon: "🖼️", description: "PNG, JPG, WEBP visual asset" },
  { type: "Note", label: "Note", icon: "📝", description: "Raw thoughts or text excerpt" },
  { type: "Other", label: "Other", icon: "📦", description: "Multi-source knowledge composite" },
];

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(",")[1] || res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AddClient() {
  const router = useRouter();

  // Primary Choice
  const [selectedType, setSelectedType] = useState<ContentType>("Article");

  // Single-source Inputs
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Multi-source Inputs for "Other"
  const [otherText, setOtherText] = useState("");
  const [otherUrls, setOtherUrls] = useState<string[]>([]);
  const [newUrlInput, setNewUrlInput] = useState("");
  const [otherDocuments, setOtherDocuments] = useState<File[]>([]);
  const [otherImages, setOtherImages] = useState<File[]>([]);
  const [otherImagePreviews, setOtherImagePreviews] = useState<string[]>([]);

  // Extraction State
  const [extraction, setExtraction] = useState<NormalizedExtraction | null>(null);

  // Duplicate Check
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);

  // Potential Connections (Deterministic Non-AI)
  const [potentialConnections, setPotentialConnections] = useState<PotentialConnectionCandidate[]>([]);

  // Metadata Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  // AI & Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasAiSuggestions, setHasAiSuggestions] = useState(false);
  const [aiGeneratedTags, setAiGeneratedTags] = useState<string[]>([]);

  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Stale request counter
  const activeRequestIdRef = useRef<number>(0);

  // Handle Type Change
  const handleTypeSelect = (type: ContentType) => {
    if (type === selectedType) return;
    setSelectedType(type);
    setExtraction(null);
    setDuplicateCheck(null);
    setPotentialConnections([]);
    clearAiSuggestions();
  };

  const clearAiSuggestions = () => {
    setHasAiSuggestions(false);
    setAiGeneratedTags([]);
    setGenerationError(null);
  };

  // Handle single file input for Document / Image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setExtraction(null);
    setDuplicateCheck(null);
    clearAiSuggestions();

    if (file && (file.type.startsWith("image/") || selectedType === "Image")) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviewUrl(reader.result as string);
        setPreviewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreviewUrl(null);
    }
  };

  // Handlers for "Other" multi-source inputs
  const handleAddOtherUrl = () => {
    const trimmed = newUrlInput.trim();
    if (!trimmed) return;
    if (!otherUrls.includes(trimmed)) {
      setOtherUrls([...otherUrls, trimmed]);
    }
    setNewUrlInput("");
    setExtraction(null);
    setDuplicateCheck(null);
  };

  const handleRemoveOtherUrl = (index: number) => {
    setOtherUrls(otherUrls.filter((_, i) => i !== index));
    setExtraction(null);
    setDuplicateCheck(null);
  };

  const handleOtherDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setOtherDocuments((prev) => [...prev, ...filesArray]);
      setExtraction(null);
      setDuplicateCheck(null);
    }
  };

  const handleRemoveOtherDocument = (index: number) => {
    setOtherDocuments(otherDocuments.filter((_, i) => i !== index));
    setExtraction(null);
    setDuplicateCheck(null);
  };

  const handleOtherImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setOtherImages((prev) => [...prev, ...filesArray]);

      filesArray.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setOtherImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      setExtraction(null);
      setDuplicateCheck(null);
    }
  };

  const handleRemoveOtherImage = (index: number) => {
    setOtherImages(otherImages.filter((_, i) => i !== index));
    setOtherImagePreviews(otherImagePreviews.filter((_, i) => i !== index));
    setExtraction(null);
    setDuplicateCheck(null);
  };

  /**
   * Unified Generation Workflow:
   * validate source/input
   * → source-specific extraction
   * → duplicate detection/canonicalization/fingerprinting
   * → Gemma metadata generation
   * → deterministic Potential Connections
   */
  const handleGenerateMetadata = async () => {
    const currentRequestId = ++activeRequestIdRef.current;
    setGenerationError(null);
    setDuplicateCheck(null);

    // 1. Validate Input
    if (selectedType === "Other") {
      const pendingUrl = newUrlInput.trim();
      const allUrls = pendingUrl && !otherUrls.includes(pendingUrl) ? [...otherUrls, pendingUrl] : otherUrls;
      if (!otherText.trim() && allUrls.length === 0 && otherDocuments.length === 0 && otherImages.length === 0) {
        setGenerationError("Please provide at least one source input (notes, URL, document, or image).");
        return;
      }
    } else if (["Article", "Video", "Repository", "URL"].includes(selectedType)) {
      if (!inputUrl.trim()) {
        setGenerationError("Please enter a valid URL.");
        return;
      }
    } else if (["Document", "Image"].includes(selectedType)) {
      if (!selectedFile) {
        setGenerationError(`Please select a ${selectedType.toLowerCase()} file to upload.`);
        return;
      }
    } else if (selectedType === "Note") {
      if (!inputText.trim()) {
        setGenerationError("Please enter note or reference text.");
        return;
      }
    }

    setIsGenerating(true);

    try {
      // 2. Perform Extraction + Duplicate Checking
      let extractRes: Response;

      if (selectedType === "Other") {
        const pendingUrl = newUrlInput.trim();
        const allUrls = pendingUrl && !otherUrls.includes(pendingUrl) ? [...otherUrls, pendingUrl] : otherUrls;
        if (pendingUrl && !otherUrls.includes(pendingUrl)) {
          setOtherUrls(allUrls);
          setNewUrlInput("");
        }

        const sourcesPayload: Array<{
          type: "text" | "url" | "document" | "image";
          content?: string;
          fileName?: string;
          fileMimeType?: string;
          fileBase64?: string;
        }> = [];

        if (otherText.trim()) {
          sourcesPayload.push({ type: "text", content: otherText.trim() });
        }

        for (const u of allUrls) {
          sourcesPayload.push({ type: "url", content: u });
        }

        for (const doc of otherDocuments) {
          const b64 = await fileToBase64(doc);
          sourcesPayload.push({
            type: "document",
            fileName: doc.name,
            fileMimeType: doc.type,
            fileBase64: b64,
          });
        }

        for (const img of otherImages) {
          const b64 = await fileToBase64(img);
          sourcesPayload.push({
            type: "image",
            fileName: img.name,
            fileMimeType: img.type,
            fileBase64: b64,
          });
        }

        extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: "Other",
            otherSources: sourcesPayload,
          }),
        });
      } else if (selectedFile) {
        const formData = new FormData();
        formData.append("contentType", selectedType);
        formData.append("file", selectedFile);
        if (inputUrl) formData.append("url", inputUrl);
        if (inputText) formData.append("text", inputText);

        extractRes = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });
      } else {
        extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: selectedType,
            url: inputUrl.trim() || undefined,
            text: inputText.trim() || undefined,
          }),
        });
      }

      if (!extractRes.ok) {
        const errData = await extractRes.json();
        throw new Error(errData.error || "Failed to extract source content");
      }

      const extractData = await extractRes.json();
      if (currentRequestId !== activeRequestIdRef.current) return;

      const ext: NormalizedExtraction = extractData.extraction;
      setExtraction(ext);
      setDuplicateCheck(extractData.duplicateCheck || null);
      if (extractData.potentialConnections) {
        setPotentialConnections(extractData.potentialConnections);
      }

      // Pre-fill initial extraction hints if fields are empty
      if (!title && ext.titleHint) setTitle(ext.titleHint);
      if (!description && ext.descriptionHint) setDescription(ext.descriptionHint);
      if (!previewImageUrl && ext.previewImageUrl) setPreviewImageUrl(ext.previewImageUrl);

      // 3. Call Gemma for structured metadata generation
      const gemmaRes = await fetch("/api/smart-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction: ext }),
      });

      if (!gemmaRes.ok) {
        const errData = await gemmaRes.json();
        throw new Error(errData.error || "AI metadata generation failed");
      }

      const gemmaData = await gemmaRes.json();
      if (currentRequestId !== activeRequestIdRef.current) return;

      const aiMeta = gemmaData.metadata;
      setTitle(aiMeta.title);
      setDescription(aiMeta.description);
      setAiGeneratedTags(aiMeta.tags || []);
      setTagsInput((aiMeta.tags || []).join(", "));
      setHasAiSuggestions(true);

      // Keep preview image from Gemma if suggested, or fallback to extraction preview
      if (aiMeta.previewImageUrl) {
        setPreviewImageUrl(aiMeta.previewImageUrl);
      } else if (ext.previewImageUrl && !previewImageUrl) {
        setPreviewImageUrl(ext.previewImageUrl);
      }

      // Refresh potential connections with Gemma's synthesized tags
      if (gemmaData.potentialConnections) {
        setPotentialConnections(gemmaData.potentialConnections);
      }
    } catch (err: unknown) {
      if (currentRequestId === activeRequestIdRef.current) {
        setGenerationError(err instanceof Error ? err.message : "Metadata generation failed");
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setIsGenerating(false);
      }
    }
  };

  // Step 3: Save Item
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setSaveError("Please provide a title for this item.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const isOther = selectedType === "Other";
      const source = {
        type:
          selectedType === "Document" || selectedType === "Image"
            ? ("file" as const)
            : selectedType === "Note"
            ? ("text" as const)
            : isOther
            ? otherDocuments.length > 0 || otherImages.length > 0
              ? ("file" as const)
              : otherUrls.length > 0
              ? ("url" as const)
              : ("text" as const)
            : ("url" as const),
        url: extraction?.canonicalUrl || inputUrl.trim() || otherUrls[0] || undefined,
        fileName: selectedFile?.name || otherDocuments[0]?.name || otherImages[0]?.name,
        fileSize: selectedFile?.size || otherDocuments[0]?.size || otherImages[0]?.size,
        mimeType: selectedFile?.type || otherDocuments[0]?.type || otherImages[0]?.type,
        textSnippet:
          inputText.trim() ||
          otherText.trim() ||
          extraction?.text?.slice(0, 500) ||
          undefined,
      };

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        contentType: selectedType,
        source,
        metadata: {
          imageUrl: previewImageUrl.trim() || extraction?.previewImageUrl || undefined,
          author: extraction?.authorHint,
          siteName: extraction?.siteNameHint,
        },
        tags,
        canonicalUrl: extraction?.canonicalUrl || (inputUrl.trim() ? inputUrl.trim() : undefined),
        contentFingerprint: extraction?.contentFingerprint,
      };

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save item.");
      }

      const { item } = await res.json();
      router.push(`/items/${item._id}`);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error saving knowledge asset");
      setIsSaving(false);
    }
  };

  const isUrlBased = ["Article", "Video", "Repository", "URL"].includes(selectedType);
  const isFileBased = ["Document", "Image"].includes(selectedType);
  const isNoteBased = selectedType === "Note";
  const isOtherBased = selectedType === "Other";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#16382E]">
        <h1 className="text-2xl font-bold tracking-tight text-[#F0FDF4]">
          Save New Knowledge Asset
        </h1>
        <p className="text-xs sm:text-sm text-[#9FE1CB]/70 mt-1">
          Capture content from URLs, repositories, videos, documents, or notes with AI enrichment.
        </p>
      </div>

      {/* 1. What are you saving? */}
      <div className="bg-[#081712] border border-[#16382E] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9FE1CB] mb-3">
          1. What are you saving?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONTENT_TYPE_OPTIONS.map((opt) => {
            const isSelected = selectedType === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => handleTypeSelect(opt.type)}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-[#10B981] bg-[#0E241D] text-[#F0FDF4] shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "border-[#16382E] bg-[#040D0A]/70 text-[#9FE1CB] hover:border-[#235343] hover:bg-[#081712]"
                }`}
              >
                <span className="text-xl mb-1.5">{opt.icon}</span>
                <span className={`text-xs font-bold ${isSelected ? "text-[#34D399]" : "text-[#F0FDF4]"}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] mt-0.5 text-[#5E8275] line-clamp-1">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Source Input */}
      <div className="bg-[#081712] border border-[#16382E] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9FE1CB]">
          2. Provide Source Content
        </label>

        {isUrlBased && (
          <div>
            <label className="block text-xs font-semibold text-[#F0FDF4] mb-1.5">
              {selectedType === "Video"
                ? "YouTube URL (Video, Short, or Share link)"
                : selectedType === "Repository"
                ? "GitHub or GitLab Repository URL"
                : "Webpage URL"}
            </label>
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setExtraction(null);
                setDuplicateCheck(null);
              }}
              placeholder={
                selectedType === "Video"
                  ? "https://www.youtube.com/watch?v=..."
                  : selectedType === "Repository"
                  ? "https://github.com/owner/repo"
                  : "https://example.com/article"
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
            />
          </div>
        )}

        {isFileBased && (
          <div>
            <label className="block text-xs font-semibold text-[#F0FDF4] mb-1.5">
              {selectedType === "Document"
                ? "Upload Document (PDF, DOCX, PPTX, XLSX, TXT, MD)"
                : "Upload Image (PNG, JPG, WEBP)"}
            </label>
            <input
              type="file"
              accept={
                selectedType === "Document"
                  ? ".pdf,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.txt,.md"
                  : "image/png,image/jpeg,image/webp"
              }
              onChange={handleFileChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0E241D] file:text-[#34D399] hover:file:bg-[#16382E] cursor-pointer"
            />
            {imagePreviewUrl && (
              <div className="mt-3 relative aspect-video w-48 rounded-xl overflow-hidden border border-[#16382E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {isNoteBased && (
          <div>
            <label className="block text-xs font-semibold text-[#F0FDF4] mb-1.5">
              Note / Reference Text
            </label>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setExtraction(null);
                setDuplicateCheck(null);
              }}
              placeholder="Paste notes, excerpts, code snippets, or thoughts..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
            />
          </div>
        )}

        {/* Refined Other: Multi-Source Inputs */}
        {isOtherBased && (
          <div className="space-y-4">
            <p className="text-xs text-[#9FE1CB]/70">
              Combine one or more sources (text, URLs, documents, images) into a single unified knowledge asset. At least one input is required.
            </p>

            {/* A. Text / Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#F0FDF4]">
                📝 Notes & Thoughts
              </label>
              <textarea
                rows={3}
                value={otherText}
                onChange={(e) => {
                  setOtherText(e.target.value);
                  setExtraction(null);
                  setDuplicateCheck(null);
                }}
                placeholder="Add context notes, observations, or key takeaways..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-xs focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
              />
            </div>

            {/* B. URLs */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#F0FDF4]">
                🔗 Reference URLs (Articles, YouTube, Repositories, Links)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOtherUrl();
                    }
                  }}
                  placeholder="https://..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-xs focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddOtherUrl}
                  disabled={!newUrlInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#0E241D] text-[#34D399] hover:bg-[#16382E] border border-[#16382E] text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Add URL
                </button>
              </div>

              {otherUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {otherUrls.map((urlItem, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0E241D] text-[#9FE1CB] border border-[#16382E] text-xs max-w-full"
                    >
                      <span className="truncate max-w-xs">{urlItem}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherUrl(idx)}
                        className="text-[#5E8275] hover:text-[#F0FDF4] ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* C. Documents */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#F0FDF4]">
                📄 Upload Documents (PDF, DOCX, TXT, MD)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.txt,.md"
                onChange={handleOtherDocumentsChange}
                className="w-full px-3.5 py-2 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#0E241D] file:text-[#34D399] hover:file:bg-[#16382E] cursor-pointer"
              />
              {otherDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {otherDocuments.map((doc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0E241D] text-[#9FE1CB] border border-[#16382E] text-xs"
                    >
                      <span>📄 {doc.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherDocument(idx)}
                        className="text-[#5E8275] hover:text-[#F0FDF4] ml-1 font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* D. Images */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#F0FDF4]">
                🖼️ Upload Images (PNG, JPG, WEBP)
              </label>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                onChange={handleOtherImagesChange}
                className="w-full px-3.5 py-2 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#0E241D] file:text-[#34D399] hover:file:bg-[#16382E] cursor-pointer"
              />
              {otherImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {otherImagePreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#16382E] group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center text-xs hover:bg-black"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Primary Action Button: Generate Metadata */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGenerateMetadata}
            disabled={isGenerating}
            className="py-2.5 px-5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#040D0A] border-t-transparent animate-spin" />
                <span>Enriching with Smart Capture...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Generate Metadata</span>
              </>
            )}
          </button>
        </div>

        {generationError && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
            <span className="text-red-400 font-bold">•</span>
            <span>{generationError}</span>
          </div>
        )}

        {/* Duplicate Warning Banner */}
        {duplicateCheck?.isDuplicate && duplicateCheck.existingItem && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start justify-between gap-3">
            <div>
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <span>⚠️</span>
                <span>This appears to already exist in your library.</span>
              </p>
              <p className="mt-1 text-amber-200/80">
                You already saved &ldquo;{duplicateCheck.existingItem.title}&rdquo; on{" "}
                {new Date(duplicateCheck.existingItem.createdAt).toLocaleDateString()}.
              </p>
            </div>
            <Link
              href={`/items/${duplicateCheck.existingItem.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-amber-900/60 text-amber-200 border border-amber-700/60 font-semibold hover:bg-amber-800/80 shrink-0 transition-colors"
            >
              View Existing Item &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* 3. Review & Save */}
      <form onSubmit={handleSave} className="bg-[#081712] border border-[#16382E] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#16382E] pb-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9FE1CB]">
              3. Review & Enrich Asset Metadata
            </label>
            <p className="text-xs text-[#5E8275] mt-0.5">
              Review and customize title, description, tags, and preview image before saving.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasAiSuggestions && (
              <button
                type="button"
                onClick={clearAiSuggestions}
                className="py-1.5 px-3 rounded-lg border border-[#16382E] bg-[#040D0A] text-xs font-medium text-[#9FE1CB] hover:bg-[#0E241D] hover:text-[#F0FDF4] transition-colors"
              >
                Clear AI Suggestions
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateMetadata}
              disabled={isGenerating}
              className="py-1.5 px-3.5 rounded-lg bg-[#0E241D] text-[#34D399] border border-[#16382E] hover:bg-[#16382E] hover:text-[#F0FDF4] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>Re-run Smart Capture</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB]">
                Title *
              </label>
              {hasAiSuggestions && (
                <span className="text-[10px] text-[#34D399] font-medium flex items-center gap-1">
                  <span>✨</span> Smart Capture Generated
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descriptive title for this knowledge asset"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5">
              Description / Summary
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Concise contextual summary of why this knowledge is valuable"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB]">
                Tags (comma separated)
              </label>
              {aiGeneratedTags.length > 0 && (
                <span className="text-[10px] text-[#34D399]">
                  {aiGeneratedTags.length} AI tags suggested
                </span>
              )}
            </div>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="architecture, nextjs, security, ai"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
            />
          </div>

          {/* Preserved Preview Image URL Field */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9FE1CB] mb-1.5">
              Preview Image URL (Optional)
            </label>
            <input
              type="url"
              value={previewImageUrl}
              onChange={(e) => setPreviewImageUrl(e.target.value)}
              placeholder="https://example.com/thumbnail.jpg"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#16382E] bg-[#040D0A] text-[#F0FDF4] placeholder-[#5E8275] text-sm focus:outline-none focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] transition-colors"
            />
          </div>
        </div>

        {/* 4. Potential Connections Section (Deterministic Non-AI) */}
        {potentialConnections.length > 0 && (
          <div className="border-t border-[#16382E] pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9FE1CB] flex items-center gap-1.5">
                <span>🔗</span> Potential Connections in Your Shelf ({potentialConnections.length})
              </h3>
              <span className="text-[10px] text-[#5E8275]">
                Deterministic candidate matching
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {potentialConnections.map((candidate) => (
                <div
                  key={candidate.id}
                  className="p-3.5 rounded-xl border border-[#16382E] bg-[#040D0A]/70 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#0E241D] text-[#34D399] border border-[#16382E]">
                        {candidate.contentType}
                      </span>
                      {candidate.overlappingTags.length > 0 && (
                        <span className="text-[10px] text-[#9FE1CB] font-medium">
                          Shared: {candidate.overlappingTags.join(", ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-[#F0FDF4] line-clamp-1">
                      {candidate.title}
                    </p>
                  </div>
                  <Link
                    href={`/items/${candidate.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#34D399] hover:underline mt-2 self-start flex items-center gap-1 font-semibold"
                  >
                    <span>Open in New Tab</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-start gap-2">
            <span className="text-red-400 font-bold">•</span>
            <span>{saveError}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-[#16382E]">
          <Link
            href="/library"
            className="py-2.5 px-4 rounded-xl border border-[#16382E] bg-[#040D0A] text-xs font-semibold text-[#9FE1CB] hover:bg-[#0E241D] hover:text-[#F0FDF4] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="py-2.5 px-6 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#040D0A] text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] disabled:opacity-50 active:scale-[0.98]"
          >
            {isSaving ? "Saving to Vault..." : "Save Item to Vault"}
          </button>
        </div>
      </form>
    </div>
  );
}
