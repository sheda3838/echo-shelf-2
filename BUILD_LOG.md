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
