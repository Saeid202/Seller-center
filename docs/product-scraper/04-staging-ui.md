# Staging Workflow & UI

## Backend

- Added `supabase/sql/20251111_add_product_imports.sql` defining:
  - `import_jobs` to track scraper runs.
  - `imported_products` staging table with quality metadata, category assignments, and review status.
  - RLS policies allowing authenticated users to manage their staged imports.
  - Trigger to keep `updated_at` fresh.
- New helpers in `lib/imported-products.ts` provide typed accessors for pending imports, category updates, and review status transitions.
- Server actions (`app/dashboard/products/import-actions.ts`) expose load/update/approve/reject operations to the dashboard.

## Frontend

- `components/products/imported-products-panel.tsx` renders a review card deck with:
  - Quality scoring badges and supplier intel.
  - Inline category/subcategory selectors wired to Supabase.
  - Quick actions: Prefill form, Reject, Mark reviewed, Refresh.
  - A “Fetch” form that accepts a single Alibaba product URL and queues it for review.
- `components/products/products-view.tsx` now:
  - Accepts `initialImportedProducts` and keeps them in sync via server actions.
  - Prefills the existing `ProductForm` when a reviewer accepts a lead, dropping them straight into “create product” mode.
  - Provides optimistic UI for category assignments and review decisions, with toasts on success/failure.
  - Handles scrape-by-URL submissions with validation, duplicate detection, and automatic panel refresh.
- CLI script `scripts/scraper/run-alibaba-scrape.ts` outputs normalized payloads that map 1:1 to the staging schema, so future automation can insert rows directly.

## Reviewer Flow

1. Fetch leads (either via the CLI, the dashboard “Fetch” form, or manually via SQL).
2. Open Products dashboard → Imported leads panel.
3. Assign category + subcategory, review quality notes.
4. Click “Prefill form” to jump into a draft product with scraped data.
5. Submit product → mark the staged record as “reviewed” (or reject if unsuitable).

## Next Up

- Wire scraper job output to insert into `imported_products`.
- Auto-mark staging rows as approved once a product is created successfully.
- Surface images inside the review card (render thumbnails) and allow bulk actions.
- Support additional marketplaces and bulk URL ingestion.

