# Smart Document Generator
### Incursion Hackathon — Track 01 ("Requirements in, branded club documents out")

> **AI-powered document generation and workflow automation SaaS for university clubs, student organizations, and academic departments.**

---

## 🌟 Key Highlights & Core Principles

1. **"Ask, Don't Invent" (Zero Factual Fabrication):**
   Official institutional data—dates, timings, laboratory rooms, faculty coordinators, HODs, and budgets—are **never fabricated**. When details are missing or ambiguous, the deterministic validation gate prompts targeted clarification questions.

2. **Native OpenXML (.docx) & Vectorized (.pdf) Output:**
   Unlike generic chat wrappers that output plain text or unformatted Markdown, Smart Document Generator generates **actual binary `.docx` and `.pdf` files** utilizing real university templates with headers, footers, typography, tables, and club metadata preserved.

3. **Single-Entry Batch Reusability:**
   Organizers describe an event once in natural language. The system extracts structured parameters and simultaneously compiles **Event Proposals**, **Venue/Lab Permission Letters**, and **Speaker Invitations**.

4. **Interactive Document Review & Version History:**
   Side-by-side editing studio allows tweaking event parameters and clicking **Regenerate**, producing incremented versions (`v1` → `v2`) while preserving historical file binaries and data snapshots.

5. **No-Code Dynamic Template Management:**
   Administrators can upload standard `.docx` templates via `/templates`. The system automatically parses XML placeholders (e.g. `{eventName}`, `{venue}`) and activates the template with zero code changes.

6. **Faculty Endorsement & Approvals:**
   Faculty coordinators can inspect generated documents in the approval queue, leave review comments, and formally approve or request changes.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling & UI:** Tailwind CSS v4 + Institutional SaaS Design System + Lucide Icons
- **Document Engine:** `docxtemplater` + `pizzip` (Native DOCX compilation)
- **PDF Engine:** Headless LibreOffice CLI runner with built-in Institutional PDFKit Vector Engine fallback
- **Archiving:** In-memory `pizzip` streaming for multi-document batch ZIP exports
- **Schema & Validation:** Zod runtime validation
- **AI Integration:** OpenAI API (`gpt-4o-mini` Structured Outputs) with deterministic Smart Mock AI fallback for offline/demo reliability
- **Database & Persistence:** MongoDB Atlas (Mongoose models) with cached persistent local store

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20+)
- npm or pnpm

### 2. Installation
```bash
git clone <repo-url>
cd document_generator
npm install
```

### 3. Environment Configuration (Optional)
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
*Note: If no `.env.local` is provided, the application runs out of the box in local demo mode with persistent local storage and deterministic smart AI extraction!*

### 4. Running the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗺️ Application Routes

| Path | Purpose |
| :--- | :--- |
| `/` | Product landing page highlighting workflow, benefits, and preview |
| `/dashboard` | Main administrative dashboard with statistics, events, and recent documents |
| `/events/new` | Event Creation Studio with dual-mode entry (Plain English & Form) + Clarification Gate |
| `/events` | Listing of all single-entry event records |
| `/documents/[id]` | Split-screen Review Studio: left editable fields, right embedded live PDF viewer |
| `/documents` | Documents archive with status filters, batch ZIP export, and downloads |
| `/templates` | Administrator template manager with DOCX uploader and tag parser |
| `/approvals` | Faculty coordinator review queue with approval lifecycle |
| `/settings` | Club branding, letterhead metadata, and faculty signatory credentials |
| `/api/health` | Diagnostic health check (AI mode, PDF engine, storage status) |

---

## 🧪 Verified Acceptance Tests

- **Test A (Plain English Ingestion):** Natural language prompts accurately extract event title, category, date, timing, venue, and resource person.
- **Test B ("Ask, Don't Invent"):** Incomplete prompts omit missing mandatory fields and prompt targeted clarification queries before document compilation.
- **Test C (Batch Generation):** Generates separate `.docx` and `.pdf` files for Event Proposal and Permission Letter from 1 event profile.
- **Test D (One-Click ZIP Export):** Batch downloads package both DOCX and PDF formats into structured directories (`DOCX/` and `PDF/`).
- **Test E (Version History):** Modifying fields in the review studio increments the version number (`v1` → `v2`) and preserves the previous version's snapshot and download links.
- **Test F (Faculty Approval):** Status transitions from `DRAFT` → `SUBMITTED` → `APPROVED` with reviewer remarks and timestamp.
