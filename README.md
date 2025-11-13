## Myshop Seller Portal

A Next.js 14 dashboard where sellers authenticate with Supabase, manage their profile, and maintain a product catalogue.

### Prerequisites

- Node.js 18+ and npm
- Supabase project with the following schema:
  - `profiles` — columns: `id uuid primary key`, `full_name text`, `company_name text`, `phone text`, `website text`, `bio text`, `avatar_url text`, `created_at timestamptz`, `updated_at timestamptz`
- `products` — columns: `id uuid`, `seller_id uuid references profiles(id)`, `name text`, `description text`, `price numeric`, `currency text`, `status text`, `inventory integer`, plus the extended catalogue/logistics fields introduced in `supabase/sql/20251111_add_product_catalog_extensions.sql` (category links, HS code, `moq`, `cartons_per_moq`, `pallets_per_moq`, `containers_20ft_per_moq`, `containers_40ft_per_moq`, `shipping_notes`, etc.)
- Supporting tables: `categories`, `subcategories`, `product_incoterms` (stores multiple quotes per product with `term`, `currency`, `price`, `port`)
- Enable Row Level Security with policies that scope rows to `auth.uid()` (see SQL migration for policies applied to the new tables)

> 💡 Run the SQL file under `supabase/sql/20251111_add_product_catalog_extensions.sql` in the Supabase SQL editor (or via the CLI) to create the catalogue tables and policies. Seed the `categories` / `subcategories` tables with the taxonomy you want to expose in the product form.

### Environment Variables

Create a `.env.local` (based on `env.example`) with:

```
NEXT_PUBLIC_SUPABASE_URL=https://ujhdxmtcusbewkfaweeg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGR4bXRjdXNiZXdrZmF3ZWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTQ0MDAsImV4cCI6MjA3ODI3MDQwMH0.w0mD03Vz7Sih0iVfQaIk0MtEV5Dov-fOQAbuYAMMrG0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGR4bXRjdXNiZXdrZmF3ZWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY5NDQwMCwiZXhwIjoyMDc4MjcwNDAwfQ.IDHWO1IVNH3AzsbYK2DDx3xSnYLddfYlGCsiTodAHuU

# Optional – used by Playwright e2e tests
E2E_SELLER_EMAIL=you@example.com
E2E_SELLER_PASSWORD=super-secret
```

### Running Locally

```bash
npm install
npm run dev
# visit http://localhost:3000
```

### Quality Commands

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test:e2e    # Playwright (requires Supabase test user)
npm run test:scraper # Normalization unit tests (node:test)
```

When running end-to-end tests for the first time install the browsers:

```bash
npx playwright install
```

### Project Structure

- `app/` – App Router routes (`/login`, `/dashboard`, etc.)
- `components/` – Reusable UI and feature-specific components
- `lib/` – Supabase clients, data helpers, validation schemas
- `tests/` – Playwright integration tests
- `docs/product-scraper/` – Plans, architecture notes, and runbooks for the sourcing robot

### Notes

- Dashboard routes are protected in `middleware.ts` and redirect unauthenticated users to `/login`.
- Product mutations use Supabase server actions and show toast notifications via `sonner`.
- Forms leverage `react-hook-form` with Zod validation for consistent client/server rules.

### Product Sourcing Robot (Beta)

- Prototype scraper lives in `lib/scraper/` with a CLI harness at `scripts/scraper/run-alibaba-scrape.ts`.
- Normalization + quality scoring output to the staging table (`imported_products`) alongside job metrics (see `lib/scraper/jobs.ts`).
- The dashboard’s Imported Leads panel lets reviewers assign categories, prefill product forms, scrape a single Alibaba product by URL, and mark items as reviewed or rejected.
- See `docs/product-scraper/` for the phased rollout plan, monitoring guide, and open follow-up work.
