# Echo Shelf 2.0

> **An intelligent personal knowledge vault that transforms passive bookmarks into an interconnected, living second brain.**

Echo Shelf 2.0 reimagines personal knowledge management around a three-stage intelligence loop: **Capture → Connect → Resurface**. Rather than letting saved bookmarks, videos, and documents gather digital dust, Echo Shelf automatically extracts structured context, maps conceptual relationships across your vault, clusters related assets into pillars, and continuously monitors live world news to resurface forgotten insights when they become relevant again.

---

## The Problem

Modern knowledge workers and developers constantly encounter valuable information across fragmented channels: technical articles, YouTube deep dives, GitHub repositories, PDF research papers, screenshots, and fleeting notes. 

Existing bookmark managers and "read-it-later" apps suffer from critical flaws:
1. **Passive Graves**: Content is saved into arbitrary folders or tag clouds and rarely revisited.
2. **Context Fragmentation**: Assets are treated as isolated silos; relationships between a saved architecture paper, a practical GitHub repo, and a conference talk remain invisible.
3. **Relevance Decay**: Without active re-engagement, knowledge quickly fades from working memory, depriving you of valuable context when real-world events or project decisions require it.

---

## The Solution

**Echo Shelf 2.0** provides an end-to-end knowledge intelligence system that actively closes the loop:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     CAPTURE     │  ───► │     CONNECT     │  ───► │    RESURFACE    │
│ Source-grounded │       │ AI & heuristic  │       │ Real-world news │
│ metadata engine │       │ semantic graphs │       │ contextual loop │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Grounded Smart Capture**: Extract clean content and structured metadata directly from raw sources without AI hallucinations.
2. **Deterministic & Semantic Connecting**: Discover immediate overlaps during capture, then run deep AI semantic graph evaluations after saving.
3. **Continuous Contextual Rediscovery**: Cross-reference high-level knowledge clusters against real-time global news to answer: *"What is happening in the world today that makes something I saved before relevant again?"*

---

## Core Features

- **Personal Knowledge Library**: Searchable, filterable, and responsive library supporting 8 rich content types with instant view transitions.
- **Smart Capture**: Dynamic ingestion form with specialized extraction pipelines tailored to each source format.
- **Multi-Format Source Extraction**: Dedicated server-side extractors for web pages, YouTube videos, GitHub/GitLab repositories, PDFs, Office documents, images, and notes.
- **Gemma Intelligence Layer**: Powered by Google's open `gemma-4-26b-a4b-it` model for metadata generation, multimodal image understanding, semantic relationship analysis, clustering, and news matching.
- **Exact Duplicate Prevention**: Per-user canonical URL normalization and cryptographic SHA-256 content fingerprinting to eliminate duplicates before persistence.
- **Potential Connections**: Fast, deterministic candidate suggestions surfaced during capture based on tag and keyword overlap.
- **AI Smart Connections**: Deep, on-demand semantic relationship mapping evaluated by Gemma (`prerequisite`, `extends`, `complementary`, `conceptual-overlap`, `practical-application`, `contrast`, `alternative-approach`, `implementation-detail`).
- **Knowledge Clusters**: Unsupervised thematic clustering that synthesizes disparate saved items into cohesive conceptual knowledge pillars.
- **Contextual Rediscovery**: Paced live news discovery via GNews API cross-referenced with your knowledge clusters to surface timely, actionable takeaways.
- **Enterprise-Grade Security**: Server-verified Supabase authentication, strict per-user MongoDB tenant scoping, SSRF protection, and zero client-supplied identity trust.

### Potential Connections vs. Smart Connections

| Feature | Stage | Engine | Purpose |
| :--- | :--- | :--- | :--- |
| **Potential Connections** | During capture (`/add`) | Deterministic heuristic (tag & keyword overlap) | Instant, zero-latency feedback showing related library assets before saving. |
| **Smart Connections** | After saving (`/items/[id]`) | Gemma 4 26B semantic reasoning | In-depth AI analysis establishing qualified relationship types, strengths, and human-readable rationales. |

---

## Supported Content Types

Echo Shelf 2.0 accommodates the diverse modalities of technical knowledge:

- **Article**: Web articles and blog posts parsed with Readability into clean text, stripping navigation, ads, and sidebars.
- **Video**: YouTube video URLs parsed server-side via YouTube Data API v3 for high-res thumbnails, channel names, and durations.
- **Repository**: GitHub and GitLab repositories parsed via official APIs for descriptions, star counts, primary languages, and READMEs.
- **URL**: Generic web links with secure server-side metadata extraction.
- **Image**: Visual assets (diagrams, architecture charts, screenshots) analyzed directly via Gemma multimodal vision.
- **Document**: PDFs, DOCX, PPTX, and XLSX files parsed into grounded text context (capped at 20MB / 15,000 chars).
- **Note**: Quick thoughts, code snippets, or quotes written directly in markdown.
- **Other (Composite Multi-Source)**: Advanced multi-source capture allowing users to combine notes, reference URLs, documents, and images into a single cohesive knowledge asset.

---

## Smart Capture Architecture

Raw URLs and untrusted content are **never** blindly handed to AI models. Echo Shelf 2.0 enforces a strict deterministic extraction pipeline prior to AI reasoning:

```
[ User Source Input ]
        │
        ▼
[ SSRF & Protocol Safety Gate ]
(Blocks private subnets, loopback, metadata endpoints, non-http(s))
        │
        ▼
[ Source-Specific Extractor ]
(Readability / YouTube Data API / GitHub API / PDF & Office Parsers)
        │
        ▼
[ Normalized Text & Visual Context ]
(Clean Markdown excerpt capped to context budget)
        │
        ▼
[ Gemma 4 26B (gemma-4-26b-a4b-it) ]
(System-prompt protected inside <untrusted_content> boundary tags)
        │
        ▼
[ Structured JSON Metadata (Title, Summary, Tags) ]
        │
        ▼
[ Deterministic Duplicate Detection & Potential Connections ]
        │
        ▼
[ User Review & Atomic Persistence to MongoDB ]
```

---

## Smart Connections

Triggered on demand from any item's detail view (`/items/[id]`):

1. **Deterministic Candidate Filter**: Queries the user's library for the top 5 items exhibiting the highest tag and keyword overlap, excluding the target item itself.
2. **Gemma Semantic Reasoning**: Evaluates the candidate shortlist against the target item to identify genuine conceptual connections.
3. **Structured Taxonomy**: Connections are classified into specific relationship types (`prerequisite`, `extends`, `complementary`, `conceptual-overlap`, `practical-application`, `contrast`, `alternative-approach`, `implementation-detail`) with strength ratings (`strong` or `moderate`) and single-sentence explanations.
4. **Bidirectional Reciprocal Graph**: When an item establishes a relationship (e.g. Item A is a `prerequisite` of Item B), the reciprocal link (Item B `extends` Item A) is atomically mirrored.

---

## Knowledge Clusters

Available at `/clusters`, Knowledge Clusters synthesizes disparate library items into macro-level thematic groups:

- Formats user items into lightweight summaries to maintain token efficiency.
- Gemma analyzes conceptual intersections across the vault, forming unified clusters (capped at 6 cohesive themes) while eliminating superficial singletons.
- Each cluster includes a concise theme title, an overview summary, a list of member item IDs, and unifying semantic tags.
- Uses atomic database persistence: successful cluster synthesis replaces outdated clusters, while network or provider errors strictly preserve previous valid clusters.

---

## Contextual Rediscovery

Available at `/rediscover`, Contextual Rediscovery bridges your personal shelf with current world events:

```
[ Knowledge Clusters ]
        │ (Extract high-signal topic keywords)
        ▼
[ Paced GNews API v4 Search ]
(1,100ms pacing respecting free-tier 1 req/sec rate limits)
        │
        ▼
[ Canonical Normalization & Deduplication ]
        │
        ▼
[ Gemma 4 26B Relevance Matching ]
("What is happening now that makes a saved asset relevant again?")
        │
        ▼
[ Contextual Resurfacing Cards ]
(Live article link + matched shelf item + "Why this matters to your shelf" takeaway)
```

Passively visiting `/rediscover` consumes zero third-party API quota; scanning is strictly user-initiated.

---

## Gemma Intelligence Layer

Echo Shelf 2.0 uses **Gemma** as its primary reasoning and semantic intelligence engine.

- **Exact Model Configured**: `gemma-4-26b-a4b-it`
- **Provider / Endpoint**: Google Gemini Developer API (`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent`)
- **Key Technical Capabilities**:
  - **Structured JSON Mode**: Enforces `responseMimeType: "application/json"` for deterministic JSON parsing.
  - **Thought Token Management**: `gemma-4-26b-a4b-it` emits internal reasoning tokens flagged with `thought: true`. The service layer isolates reasoning tokens from final response parts, preventing chain-of-thought traces from leaking into persisted application data.
  - **Multimodal Visual Analysis**: Ingests base64 image data via standard `inlineData` parts to analyze architecture diagrams, charts, and technical infographics without requiring external OCR tools.
  - **Strict Prompt Injection Boundaries**: All untrusted inputs are encapsulated within explicit `<untrusted_content>` and `<untrusted_data>` XML tags, with immutable system directives prohibiting prompt overrides or instruction execution.

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack) | High-performance React framework with server-side rendering and API routes |
| **Frontend** | React 19, TypeScript, Tailwind CSS | Type-safe, accessible user interface with custom emerald/mint visual design |
| **Authentication** | Supabase Auth | Secure session management, email/password auth, and Google OAuth |
| **Database** | MongoDB / Mongoose | Flexible document database with compound tenant indexing for per-user isolation |
| **AI Intelligence** | Gemma 4 26B (`gemma-4-26b-a4b-it`) | Smart Capture metadata, multimodal image understanding, semantic graph connections, clustering, and rediscovery matching |
| **News Intelligence** | GNews API v4 | Paced live news search for real-world contextual rediscovery |
| **Video Intelligence** | YouTube Data API v3 | High-fidelity video metadata, thumbnail, and duration extraction |
| **Extraction Tools** | `@mozilla/readability`, `jsdom`, `pdf-parse`, `officeparser` | Grounded source content extraction across articles, PDFs, and Office docs |
| **Deployment Target** | Vercel | Production cloud deployment platform with serverless route optimization |

---

## Security & Privacy Architecture

- **Zero-Trust Identity**: Every API route and server component verifies session identity with `supabase.auth.getUser()`. Client-supplied user IDs in bodies, query parameters, or headers are unconditionally ignored.
- **Strict Tenant Scoping**: Every MongoDB document requires an indexed `userId`. All database queries enforce `{ _id, userId }`.
- **Resource Masking**: Attempting to access another user's item ID returns `404 Not Found` rather than `403 Forbidden`, preventing resource enumeration attacks.
- **SSRF Defense**: The URL extractor validates hostnames, resolves DNS, blocks RFC 1918 private subnets, loopback ranges (`127.0.0.0/8`), Carrier-Grade NAT (`100.64.0.0/10`), link-local metadata endpoints (`169.254.169.254`), and strictly limits redirects to safe public targets.
- **Client Bundle Protection**: Database drivers and models are strictly isolated to server-side execution. Client components import domain types exclusively from `@/types`.
- **Server-Side Secret Isolation**: Third-party API keys (`GEMINI_API_KEY`, `GNEWS_API_KEY`, `YOUTUBE_API_KEY`, `MONGODB_URI`) are strictly server-side and never exposed to browser runtimes.

---

## System Architecture

```
[ User Browser ]
       │
       ▼ (HTTPS / Supabase Auth Session Cookie)
[ Next.js App Router (Vercel) ]
       ├─► Middleware: Session verification & route protection
       ├─► Server Components: Server-side data hydration
       └─► Route Handlers (/api/*): Authenticated DTO endpoints
              │
              ├─► Supabase Auth (Identity verification)
              ├─► Source Extractors (Readability, YouTube API, GitHub API, pdf-parse)
              ├─► Gemma 4 26B (Google Developer API - Metadata, Vision, Connections, Clusters)
              ├─► GNews API v4 (Paced news scanning)
              └─► MongoDB Persistence Layer (Scoped queries: { _id, userId })
```

---

## Local Development

### Prerequisites
- Node.js 20+ (Node 22 recommended)
- A running MongoDB instance (local or MongoDB Atlas connection string)
- A Supabase project with Email and Google OAuth enabled
- API keys for Google Gemini Developer API, YouTube Data API v3, and GNews API v4

### 1. Clone & Install
```bash
git clone https://github.com/sheda3838/echo-shelf-2.git
cd echo-shelf-2
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the project root based on `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

| Variable | Description | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable / Anon Key | Supabase Dashboard |
| `MONGODB_URI` | MongoDB Connection String | Local instance or MongoDB Atlas |
| `GEMINI_API_KEY` | Google AI Studio Key for Gemma 4 26B | [Google AI Studio](https://aistudio.google.com/) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 Key | [Google Cloud Console](https://console.cloud.google.com/) |
| `GNEWS_API_KEY` | GNews API v4 Key | [GNews.io](https://gnews.io/) |

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Gates

Echo Shelf 2.0 includes automated test suites covering authentication, tenant isolation, extraction pipelines, duplicate detection, connections, clusters, and security boundaries.

### Run Test Suites
```bash
# Run all unit and integration tests
npm test

# Run individual test suites
npm run test:auth          # Supabase auth verification and zero-trust guards
npm run test:isolation     # Multi-tenant isolation and cross-user read/write masking
npm run test:duplicates    # Canonical URL and content fingerprint deduplication
npm run test:connections   # Deterministic candidate scoring & smart connections validation
npm run test:clusters      # Cluster validation, user isolation, and atomic persistence
npm run test:rediscovery   # GNews deduplication, hallucination rejection, and user scoping
npm run test:capture       # Multi-source extraction and SSRF validation
npm run test:security      # Cross-tenant ID masking, XSS protocol checks, prompt injection boundaries
npm run test:document      # PDF and Office document parsing safeguards
npm run test:image         # Image upload and MIME type validation
```

### Run Quality Gates
```bash
npx tsc --noEmit           # TypeScript strict typechecking (0 errors)
npm run lint               # ESLint code quality pass (0 errors, 0 warnings)
npm run build              # Production build compilation check
```

---

## Project Status

Echo Shelf 2.0 is **feature-complete** and has passed all pre-deployment quality gates, browser end-to-end verifications, and adversarial security audits. The application is currently staged for immediate production deployment.

For a detailed chronological account of design decisions, obstacles encountered, and engineering solutions, please refer to the [Build Log](BUILD_LOG.md).

---

## Hacktoberfest 2026

Echo Shelf 2.0 was developed as a submission for the **Hacktoberfest 2026 Weekend Challenge**, showcasing open-weights AI integration with Google's Gemma models to solve real-world knowledge fragmentation.

---

## Screenshots & Demo

> Production screenshots and demo walk-through recordings will be updated upon final deployment.

| Screen | Description |
| :--- | :--- |
| **Personal Library** | Deep dark forest surface with emerald accents, search filters, and content-type tags |
| **Smart Capture** | Dynamic multi-source capture form with live metadata generation and duplicate detection |
| **Smart Connections** | Graph relationship mapping showing qualified connections between disparate knowledge assets |
| **Knowledge Clusters** | Macro-thematic clusters synthesizing saved library assets into unified pillars |
| **Contextual Rediscovery** | Real-world news scanning connecting live global events to personal saved knowledge |

---

## License

This project is currently private and all rights are reserved (`"private": true` in `package.json`).
