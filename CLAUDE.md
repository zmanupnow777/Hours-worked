# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start Next.js dev server (apps/web)
pnpm build            # Build the web app
pnpm test             # Run shared package unit tests (tsx --test)
pnpm typecheck        # Type-check both packages
```

To run a single test file:
```bash
pnpm --filter @hours-worked/shared exec tsx --test src/billing.test.ts
```

## Architecture

This is a **pnpm monorepo** with two packages:

- **`packages/shared`** — Pure TypeScript (ESM). Exports types (`types.ts`), Zod schemas (`validation.ts`), and billing utilities (`billing.ts`). No Next.js dependencies. Tests live here.
- **`apps/web`** — Next.js 16 App Router. All UI and data access live here.

### Data layer

The entire app is backed by a single JSON file at `data/hours-worked.json`. All reads and writes go through `apps/web/lib/store.ts`, which is marked `"server-only"`. It exports async functions (`getAppSnapshot`, `startTimer`, `stopTimer`, `saveClient`, `saveManualSession`, `generateDraftInvoice`, `finalizeInvoice`, etc.) that read → mutate → write the JSON atomically.

`supabase/migrations` contains a cloud-ready schema for a future Supabase migration — not currently wired up.

### Server actions

`apps/web/app/actions.ts` (`"use server"`) wraps every store function as a Next.js server action and calls `revalidatePath` on all routes after mutations. UI forms call these actions directly — there is no separate API client.

### Invoice lifecycle

`WorkSession` → `InvoiceLineItem` → `Invoice` → finalized:

1. Sessions are created by timer or manual entry (`source: "timer" | "manual"`).
2. `generateDraftInvoice` collects unbilled sessions for a period, creates line items, and sets `session.draftInvoiceId`.
3. `finalizeInvoice` locks the invoice, sets `session.invoiceId`, and closes the `InvoicePeriod`. Finalized sessions and invoices cannot be edited or deleted.
4. Monthly automation runs via `POST /api/cron/monthly-close` (requires `Authorization: Bearer <cronSecret>`). It calls `runMonthlyAutomation`, which checks `autoDraftEnabled` and the configured close day/hour before auto-drafting.

### Export

`apps/web/lib/invoice-export.ts` builds PDF (via `pdf-lib`) and CSV exports from an `InvoiceDetail` object. The API routes under `apps/web/app/api/invoices/[invoiceId]/` serve these files.

### Amounts

All monetary values are stored in **cents** (integer). Conversion from user-facing dollar amounts uses `toCents()` in `store.ts`. Formatting uses `apps/web/lib/format.ts`.
