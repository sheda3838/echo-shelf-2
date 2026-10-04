# Echo Shelf 2.0 — Build Log

This document records the design decisions, architectural foundations, security considerations, testing results, and real implementation notes for **Echo Shelf 2.0** (Hacktoberfest 2026 Weekend Challenge).

---

## Phase 1: Secure Application Foundation

### 1. Foundation Architecture
The core architectural principle of Echo Shelf 2.0 is **zero-trust client identity paired with an isolated domain persistence layer**:

```
[ Browser / Client ]
        │  (HTTP / SSR Cookies)
        ▼
[ Next.js App Router & Middleware ]
        │  (Calls Supabase Auth `getUser()` to verify JWT signature)
        ▼
[ Server-Verified Supabase Identity (user.id) ]
        │  (Injected as immutable tenant scope)
        ▼
[ Centralized Data Access / Service Layer ]
        │  (All queries: { _id, userId: authenticatedUser.id })
        ▼
[ MongoDB Persistence Layer (Mongoose) ]
```

- **Authentication Provider**: Supabase Auth (Email/Password & Google OAuth) handles credential storage, session tokens, and identity management.
- **Application Persistence Layer**: Local MongoDB (with immediate compatibility for MongoDB Atlas) handles knowledge asset storage, relationships, embedded connections, and future cluster/rediscovery data.

---

### 2. Architectural Decisions

#### Why MongoDB Was Selected
1. **Dynamic & Polymorphic Knowledge Models**: Saved assets span articles, videos, repositories, screenshots, PDFs, documents, and notes. MongoDB's schema flexibility accommodates varying metadata schemas (e.g. video durations, repository stars, article read times) without table explosion or complex joins.
2. **Embedded Graph Connections**: Phase 1 embeds connections directly inside `SavedItem` (`connections: [{ connectedItemId, strength, relationshipType, explanation }]`). Embedding eliminates multi-table joins for item relationship graphs, enabling fast atomic reads when displaying an item and its immediate connections.
3. **Compound Tenant Indexing**: MongoDB compound indexes (`{ userId: 1, createdAt: -1 }`, `{ userId: 1, canonicalUrl: 1 }`) guarantee high-speed, strictly partitioned queries per user.

#### Why Supabase Auth is Separate from Application Persistence
1. **Separation of Concerns**: Supabase Auth provides battle-tested token rotation, password hashing, multi-factor support, and OAuth integrations out of the box. By relying on Supabase for auth, our application database never stores passwords, OAuth tokens, or credential secrets.
2. **Portability & Ownership**: Application data is owned in MongoDB under our direct operational control. We can migrate or reconfigure hosting independently of the authentication provider.
3. **Canonical Identity**: The Supabase `user.id` (UUID) serves as the immutable foreign key across all MongoDB collections (`userId`).

#### Why User Isolation Was Implemented from Day One
The predecessor project encountered friction by retrofitting tenant boundaries later in the lifecycle. In Echo Shelf 2.0:
- Every document in MongoDB enforces a required, indexed `userId`.
- No user-facing API or page performs unscoped queries (e.g., `SavedItem.findById(id)` is strictly prohibited).
- All operations flow through a centralized service layer (`src/lib/services/`) that requires `userId` derived from server-verified authentication.
- Authorization failures mask resource existence: if User A queries User B's item ID, the system returns `404 Not Found` / `null` rather than `403 Forbidden`, preventing resource enumeration attacks.

---

### 3. Models Created

All models are defined with Mongoose in `src/models/`:

1. **`User`** (`src/models/User.ts`):
   - `supabaseUserId` (String, required, unique, indexed): Maps to Supabase `user.id`.
   - `displayName`, `avatarUrl`: Application profile details.
   - Timestamps: `createdAt`, `updatedAt`.
   - Excludes passwords, tokens, and secrets.

2. **`SavedItem`** (`src/models/SavedItem.ts`):
   - `userId` (String, required, indexed): Owner UUID.
   - `title` (String, required), `description` (String, optional).
   - `contentType`: Enum (`Article`, `Video`, `Repository`, `URL`, `Image`, `Screenshot`, `PDF`, `Document`, `Note`, `Other`).
   - `source`: Subdocument supporting URL, file metadata, and text snippets.
   - `metadata`: Preview metadata (image URL, author, published date, site name).
   - `tags`: Array of strings.
   - `connections`: Embedded subdocuments (`connectedItemId`, `strength`, `relationshipType`, `explanation`).
   - `canonicalUrl`, `contentFingerprint`, `lastOpened`.
   - Compound indexes: `{ userId: 1, createdAt: -1 }`, `{ userId: 1, canonicalUrl: 1 }`.

3. **`KnowledgeCluster`** (`src/models/KnowledgeCluster.ts`):
   - `userId` (String, required, indexed).
   - `title` (String, required), `summary` (String), `tags` (`[String]`).
   - `itemIds`: Array of ObjectIds referencing `SavedItem`.
   - Compound index: `{ userId: 1, createdAt: -1 }`.

4. **`RediscoveryResult`** (`src/models/RediscoveryResult.ts`):
   - `userId` (String, required, indexed).
   - `article`: Subdocument (title, url, source, publishedAt, snippet).
   - `relevance` (Number 0-1), `relationshipType`, `explanation`.
   - `savedItemId`, `knowledgeClusterId` references.
   - Compound index: `{ userId: 1, createdAt: -1 }`.

---

### 4. Security Boundaries

- **Zero Client Trust**: Route handlers (`/api/items`, `/api/items/[id]`) and Server Components call `getAuthenticatedUser()` / `requireUser()` which validates the session with `supabase.auth.getUser()`. A spoofed `userId` passed in request bodies, query strings, or headers is discarded.
- **Client Bundle Isolation**: Client components (`"use client"`) never import Mongoose models or database connection singletons. Domain constants and interfaces live in `src/types/index.ts`, preventing database drivers (`mongodb`, `tls`, `net`) from leaking into client browser bundles.
- **Credential Protection**: `MONGODB_URI` is accessed exclusively in server-side modules (`src/lib/db/mongodb.ts`). `.env.local` is gitignored, and only `.env.example` with empty placeholders is tracked.
- **Mass-Assignment Defense**: Service layer update functions explicitly whitelist mutable fields (`title`, `description`, `tags`, etc.) and reject attempts to overwrite `userId` or `_id`.

---

### 5. Real Problems Encountered & Solved

1. **Turbopack Google Font Internal Resolution Error**:
   - *Problem*: Next.js 16 defaulted to Turbopack (`next dev`), which attempted to resolve `@vercel/turbopack-next/internal/font/google/font` for `next/font/google`. On Windows, this failed with `Module not found`.
   - *Solution*: Configured `--font-geist-sans` and `--font-geist-mono` directly in `src/app/globals.css` with clean system fallbacks and removed the runtime Google Font fetch in `src/app/layout.tsx`. Build and dev compilation became instantaneous (compilation time dropped from 23s to 2s).

2. **React 19 / ESLint Hook Boundary Rule (`react-hooks/set-state-in-effect`)**:
   - *Problem*: `LibraryClient.tsx` initially invoked an asynchronous `fetchItems()` inside `useEffect` on mount, triggering an ESLint error under React 19 rules regarding synchronous `setState` in effects.
   - *Solution*: Shifted initial data loading to the Server Component `src/app/library/page.tsx`, which queries `listSavedItems(user.id)` on the server and passes `initialItems` as props. This eliminated the effect warning, avoided layout shift, and enabled full server-side hydration.

3. **Mongoose Driver Leak into Browser Bundle**:
   - *Problem*: `LibraryClient.tsx` imported `CONTENT_TYPES` from `@/models/SavedItem`. Turbopack attempted to bundle the Mongoose model for client browsers, causing missing module errors for Node core packages (`tls`, `net`, `timers/promises`).
   - *Solution*: Extracted domain constants and DTO types into `src/types/index.ts`. Server models now re-export from this file, keeping Mongoose exclusively on the server.

4. **Mongoose 9 Deprecation Notice**:
   - *Problem*: Mongoose 9 deprecated `{ new: true }` in favor of `{ returnDocument: "after" }`.
   - *Solution*: Updated all `findOneAndUpdate()` calls across services to use `{ returnDocument: "after", runValidators: true }`.

---

### 6. Verification and Test Results

Automated test suites were developed using the Node 22 native test runner via `tsx`:

1. **`npm run test:auth`** (11 tests, 0 failures):
   - `GET /api/items` returns 401 when unauthenticated.
   - `POST /api/items` returns 401 when unauthenticated.
   - `GET /api/items/[id]` returns 401 when unauthenticated.
   - `PATCH /api/items/[id]` returns 401 when unauthenticated.
   - `DELETE /api/items/[id]` returns 401 when unauthenticated.
   - `requireUser` throws `UnauthorizedError` when unauthenticated.
   - `createSavedItem` requires non-empty `userId`.
   - Malicious client data sending spoofed `userId` is ignored; verified server identity is strictly used.
   - Malicious attempts to overwrite `userId` via update payload are blocked.

2. **`npm run test:isolation`** (27 tests, 0 failures):
   - User A and User B create isolated SavedItems.
   - User A list query returns only User A items; never User B items.
   - User B list query returns only User B items; never User A items.
   - User A cannot read User B item (returns `null` / 404 masked).
   - User A cannot update User B item (returns `null`, document untouched).
   - User A cannot delete User B item (returns `false`, document untouched).
   - User B can update and delete their own item.
   - KnowledgeCluster partition, cross-user read/update/delete protection.
   - RediscoveryResult partition, cross-user read/delete protection.
   - Schema validation: `userId` required on `SavedItem`, `KnowledgeCluster`, `RediscoveryResult`, and `supabaseUserId` required on `User`.
   - Schema validation: Invalid `contentType` and invalid `source.type` rejected.

3. **Code Quality Gates**:
   - `npx tsc --noEmit`: Passed with 0 errors.
   - `npm run lint`: Passed with 0 errors and 0 warnings.
   - `npm run build`: Production build succeeded in 2.2s with all App Router pages and route handlers compiled.

---

## Phase 2: Core Product & AI Intelligence Layer

### 1. Architectural Philosophy: CAPTURE → CONNECT → RESURFACE

Phase 2 implements the complete intelligence lifecycle of Echo Shelf 2.0:

```
[ USER INPUT ]
      │
      ▼
[ SOURCE-SPECIFIC EXTRACTION LAYER ]
(Readability / GitHub-GitLab APIs / YouTube Data API v3 / PDF-Office Parsers / Image Multimodal)
      │
      ▼
[ NORMALIZED EXTRACTED CONTEXT ]
      │
      ▼
[ GEMMA 4 26B (models/gemma-4-26b-a4b-it) ]
      │
      ▼
[ STRICT SCHEMA VALIDATION ]
      │
      ▼
[ USER REVIEW / PERSISTENCE ]
```

**Key Architectural Rule**: The AI is **never** asked to hallucinate or guess the contents of a raw URL, repository, YouTube video, or document. Deterministic source extraction occurs first; Gemma operates strictly on grounded, normalized text and metadata.

---

### 2. Exact AI Model Selection & Connectivity Results

- **Model Identifier**: `models/gemma-4-26b-a4b-it`
- **Inference Endpoint**: Google Gemini Developer API (`GEMINI_API_KEY`)
- **Connectivity Verification**:
  - Live server-side text inference test was executed against `models/gemma-4-26b-a4b-it`.
  - The model returned valid, structured JSON responses.
  - **Thought Token Handling**: `gemma-4-26b-a4b-it` emits reasoning tokens in candidate parts flagged with `thought: true`. The low-level Gemma service (`src/lib/ai/gemma.ts`) cleanly filters out all `thought: true` parts before extracting the final structured JSON, preventing reasoning leakage.
- **Image Strategy Selected**:
  - Hosted `gemma-4-26b-a4b-it` was tested with multimodal input using standard `inlineData` (base64 image payload).
  - The model successfully analyzed the visual contents of images directly without requiring external OCR fallbacks. Native multimodal image analysis is used for image assets.

---

### 3. Source-Specific Extraction Layer (`src/lib/extractors/`)

1. **Article & Generic Webpage Extractor (`src/lib/extractors/url.ts`)**:
   - SSRF Protection: Inspects resolved hostnames and IP addresses against RFC 1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.1, ::1, localhost), and cloud link-local metadata endpoints (169.254.169.254). Internal targets are blocked.
   - Parsing: Server-side `fetch` with 10s timeout, parsed into a DOM using `jsdom` and processed by `@mozilla/readability`.
   - Content normalization: Extracts title, site name, author, publication date, and clean article body text capped at 15,000 characters.
2. **Repository Extractor (`src/lib/extractors/repository.ts`)**:
   - Supports both GitHub and GitLab URLs, including nested namespaces.
   - Uses official REST APIs (`api.github.com`, `gitlab.com/api/v4`) to fetch repository metadata (description, language, stars, topics) and raw README contents.
3. **YouTube Video Extractor (`src/lib/extractors/youtube.ts`)**:
   - Parses watch URLs, youtu.be shortlinks, `/shorts/`, and `/embed/` links.
   - Queries YouTube Data API v3 (`videos.list?part=snippet,contentDetails`) server-side via `YOUTUBE_API_KEY`.
   - Extracts title, channel, publication date, high-resolution thumbnail (16:9), duration, and capped description.
4. **Document Extractor (`src/lib/extractors/document.ts`)**:
   - Parses PDF documents using `pdf-parse`.
   - Parses DOCX, PPTX, and XLSX files using `officeparser`.
   - Enforces a 20MB file size limit and 15,000-character context ceiling. Disables macro/script execution.
   - Computes deterministic SHA-256 fingerprint for duplicate detection.
5. **Image Extractor (`src/lib/extractors/image.ts`)**:
   - Validates MIME types (PNG, JPEG, WEBP) and 10MB file size limits.
   - Base64 encodes images for direct multimodal processing by Gemma.

---

### 4. Smart Capture & Dynamic Add Item (`/add`)

- **Dynamic Form**: First meaningful choice is "What are you saving?" (Article, Video, Repository, URL, Image, Document, Note, Other). The form dynamically alters required inputs based on content type.
- **Separate AI & User State**: AI-generated metadata is tracked separately from user edits. User edits are preserved, while stale AI suggestions are automatically invalidated if the user switches source inputs.
- **Stale Request Guard**: Incremental request IDs prevent slow or out-of-order asynchronous AI requests from overwriting newer user selections.
- **Potential Connections (Non-AI)**: Computes cheap deterministic candidate matches based on tag and keyword overlap against the current user's library before persisting.

---

### 5. Duplicate Detection Service (`src/lib/services/duplicate-detection.service.ts`)

- **URL Sources**: Canonicalizes URLs by stripping tracking parameters (`utm_*`, `fbclid`, `gclid`, `ref`, `si`), lowercasing hostnames, normalizing trailing slashes, and removing URL fragments.
- **Content Sources**: Calculates deterministic SHA-256 fingerprints across notes and document contents.
- **Per-User Isolation**: Duplicate checks are strictly partitioned by `userId`. User A's checks never scan or expose User B's knowledge assets.

---

### 6. Smart Connections (Two-Stage AI Linking)

- User-triggered via the **"Check Connections"** button on `/items/[id]`.
- **Stage 1 (Deterministic Candidate Shortlist)**: Identifies top 5 candidate items in the user's library with highest tag/title/keyword overlap.
- **Stage 2 (Gemma Semantic Analysis)**: Sends only target and candidate summaries to Gemma to determine conceptual links (`prerequisite`, `extends`, `complementary`, `conceptual-overlap`, `practical-application`, `contrast`, `alternative-approach`, `implementation-detail`).
- **Reciprocal Links**: Reciprocal relationships are mirrored bidirectionally (e.g. `prerequisite` ↔ `extends`) with strict anti-hallucination validation.

---

### 7. Knowledge Clusters (`/clusters`)

- User-triggered via **"Generate Clusters"** / **"Refresh Clusters"**.
- Summarizes saved items into lightweight tokens (ID, title, description, tags, contentType) to maintain strict token discipline.
- Gemma synthesizes thematic clusters (capped at ~6 clusters, avoiding superficial singletons or mega-clusters).
- **Atomic Persistence**: On successful synthesis, new clusters replace old clusters; if an error or rate limit occurs, existing valid clusters are strictly preserved.

---

### 8. Contextual Rediscovery (`/rediscover`)

- User-triggered via **"Check What's Relevant Now"** / **"Check Again"**. Zero API calls on passive page loads.
- Generates clean search queries from user Knowledge Clusters, fetches recent news via GNews API v4 (`GNEWS_API_KEY`), normalizes and deduplicates articles.
- Gemma evaluates semantic relationships between live news and saved assets. Only `strong` and `moderate` matches are retained with a grounded "Why this matters to your shelf" explanation.
- Persists results per-user; preserves previous results on provider error.

---

### 9. Complete Verification & Quality Gates

All automated test suites executed cleanly:

```bash
> npm run test:auth          # 11 tests passed
> npm run test:isolation     # 27 tests passed
> npm run test:duplicates    # 5 tests passed
> npm run test:connections   # 4 tests passed
> npm run test:clusters      # 6 tests passed
> npm run test:rediscovery   # 7 tests passed
> npm run test:capture       # 6 tests passed
> npx tsc --noEmit           # 0 type errors
> npm run lint               # 0 lint errors, 0 warnings
> npm run build              # Production build passed (all 16 routes compiled)
```

---

### 10. Real Problems Encountered & Solved in Phase 2

1. **Gemma Thought Token Output Separation**:
   - *Problem*: `models/gemma-4-26b-a4b-it` includes internal chain-of-thought tokens in candidate parts marked with `thought: true`. Directly reading `response.text` resulted in mixed output containing raw thinking traces.
   - *Solution*: Filtered candidate parts for `!part.thought` before concatenating text in `src/lib/ai/gemma.ts`. Added a fallback regular expression strip `/<thought>[\s\S]*?<\/thought>/gi` for markdown fence cleaning.
2. **Next.js Turbopack Client/Server Model Isolation**:
   - *Problem*: Client components (`"use client"`) importing types from `@/models/*` caused Turbopack to attempt bundling Mongoose into the browser, failing on Node built-ins (`net`, `tls`).
   - *Solution*: Maintained strict boundary where client components import domain types exclusively from `@/types` and communicate via typed JSON API routes.
3. **Mongoose Lean Object Type Compatibility**:
   - *Problem*: In `saved-items.service.ts`, `getSavedItemWithConnections` combined lean query results with an interface extending `ISavedItem` (which inherits Mongoose `Document`), causing TypeScript errors.
   - *Solution*: Defined a clean DTO interface `SavedItemWithConnections` matching the lean plain-object shape returned from database queries.
4. **Test Runner State Cleanliness**:
   - *Problem*: `tests/clusters.test.ts` verified cluster survival across failed runs, leaving a cluster in the test tenant that shifted count assertions in subsequent tests.
   - *Solution*: Added explicit tenant data cleanups before subtests to ensure complete deterministic isolation.

---

## Phase 2: Refinements & Bug Fixes Pass

### 1. Multi-Source "Other" Content Type Support
- **Architecture**: Refined `extractSource` (`src/lib/extractors/index.ts`) for `contentType === "Other"` to support composite knowledge inputs. Users can provide one or more combinations of:
  - Text / Notes (observations, thoughts, takeaways)
  - Reference URLs (YouTube videos, GitHub/GitLab repositories, web articles)
  - Uploaded Documents (PDF, DOCX, TXT, MD)
  - Uploaded Images (PNG, JPG, WEBP)
- **Extraction Pipeline**: Each input is routed through its appropriate specialized extractor (`extractYouTubeVideo`, `extractRepository`, `extractArticleOrUrl`, `extractDocument`, `extractImage`).
- **Context Normalization & Token Discipline**: Combines extracted texts into clean structured sections (`[Note / Text Excerpt]`, `[URL Source: ...]`, `[Document: ...]`, `[Image: ...]`) capped at 15,000 characters to prevent overflowing LLM context limits. Computes deterministic SHA-256 fingerprint from the combined content.
- **Preview Image Preservation**: Extracts and propagates thumbnail preview from the first visual or URL source if available.

### 2. Removal of Redundant Extraction/Duplicate Action & Unified "Generate Metadata" Flow
- **User Experience**: Removed the separate "Extract Content & Check Duplicates" button from `/add`. Extraction and duplicate checks are internal implementation details.
- **Unified Pipeline**: Clicking the single primary action **"Generate Metadata"** executes:
  1. Validate source input(s) (ensuring at least one meaningful input is supplied).
  2. Perform source-specific extraction via `/api/extract`.
  3. Run deterministic duplicate detection & content fingerprinting against user's library.
  4. Call Gemma AI (`/api/smart-capture`) to generate title, description, and suggested tags.
  5. Compute deterministic Potential Connections candidate matches.
- **Friendly Duplicate Banner**: If an existing item with the same canonical URL or content fingerprint is found, a non-blocking warning is displayed with a link to view the existing item in a new tab. Duplicate detection logic was strictly preserved.

### 3. Preservation of Existing Preview Image Behavior
- The existing preview image URL workflow was strictly preserved.
- `previewImageUrl` is maintained across models, DTOs, extraction results, Gemma outputs, and Mongoose persistence (`metadata.imageUrl`).
- The editable "Preview Image URL" field remains available in the Add Item review step.

### 4. Client-Side Confirm Password on Sign-Up
- Added `Confirm Password` field to `src/app/signup/page.tsx`.
- Strictly client-side validation: verifies `password === confirmPassword` before submission. If they differ, displays inline error and prevents form submission.
- The `confirmPassword` field is not named in form data and is never sent to Supabase, logged, or stored in MongoDB.
- Sign In and Google OAuth remain completely unchanged.

### 5. Resource-Viewing Actions Opened in New Tabs
- Audited all resource-viewing links across the application:
  - External resource links (Original URL, YouTube link, GNews articles): `target="_blank" rel="noopener noreferrer"`.
  - Internal resource exploration links ("View Connected Item", "View Saved Item", card click in Library, cluster member links, duplicate warning link): `target="_blank" rel="noopener noreferrer"`.
  - Application navigation (`/library`, `/clusters`, `/rediscover`, `/add`, `/login`, `/signup`) continues standard same-tab navigation.

### 6. Knowledge Clusters Bug: Root Cause & Resolution
- **Root Cause**: Gemma 4 26B (`models/gemma-4-26b-a4b-it`) uses internal chain-of-thought tokens tagged with `thought: true` in candidate parts. For complex synthesis across multiple items, Gemma's internal reasoning consumed ~3,000 tokens. Because `callGemma` in `src/lib/ai/gemma.ts` configured `maxOutputTokens: 2048`, generation was truncated midway through the thought phase with `finishReason: MAX_TOKENS` before emitting the final non-thought JSON part (`thought: undefined`). Consequently, the thought-filtering logic yielded 0 answer parts, causing cluster synthesis to fail or return empty arrays.
- **Fix**: Increased `maxOutputTokens` to `8192` in `src/lib/ai/gemma.ts`, allowing Gemma sufficient token budget to complete internal chain-of-thought and output valid JSON.
- **Live Verification**: Verified against live database assets for user `549a4fb6-c1ac-4c1b-9e66-0f72ccc0812b`. Gemma synthesized 3 cohesive thematic clusters ("Productivity & Knowledge Management", "Cognitive Processes & Learning", "Mental Models & Strategic Thinking") which persisted atomically.

### 7. Graceful Handling of Empty / Insufficient Cluster States
- Updated `src/lib/services/knowledge-clusters.service.ts` and `src/app/api/clusters/route.ts` so that when a user's items do not yet have enough meaningful conceptual relationships to form clusters of 2+ items, it does not throw an application error or delete previous clusters.
- Displays the clear, friendly notice: *"Not enough related knowledge yet to create meaningful clusters. Save a few related items and try again."*

### 8. End-to-End Contextual Rediscovery Verification
- With Knowledge Clusters successfully generated, executed live end-to-end Contextual Rediscovery against GNews API v4 and Gemma reasoning.
- Live GNews articles were fetched, normalized, and deduplicated. Gemma identified a grounded match with the user's saved 80/20 Rule asset, generating a tailored "Why this matters to your shelf" explanation and persisting the result.
- Rediscovery is strictly user-triggered (never triggered on page load).

### 9. Quality Gates & Regression Suite
- All automated test suites and compiler checks passed cleanly:
  - `npm run test:auth`: 11 passed (0 failed)
  - `npm run test:isolation`: 27 passed (0 failed)
  - `npm run test:duplicates`: 5 passed (0 failed)
  - `npm run test:connections`: 4 passed (0 failed)
  - `npm run test:clusters`: 6 passed (0 failed)
  - `npm run test:rediscovery`: 7 passed (0 failed)
  - `npm run test:capture`: 7 passed (0 failed) [Added test for Multi-Source Other Extractor]
  - `npx tsc --noEmit`: 0 type errors
  - `npm run lint`: 0 lint errors, 0 warnings
  - `npm run build`: Production build succeeded (all routes compiled cleanly)


