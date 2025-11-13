# Monitoring, Metrics & Tests

## Job Lifecycle Helpers

- `lib/scraper/jobs.ts` centralises Supabase interactions for scraper runs:
  - `startImportJob` establishes an `import_jobs` row with status tracking.
  - `completeImportJob` / `failImportJob` finalise the job with timestamps and error context.
  - `insertImportedProducts` batches normalized leads into `imported_products`, preserving both normalized and raw payloads for audits.
- These helpers are designed for a future background worker or serverless function so import jobs can capture metrics even when the dashboard is closed.

## Instrumentation Pattern

```ts
const jobId = await startImportJob({ marketplace: "alibaba", query, maxResults });
try {
  const result = await scraper.run(options, ctx);
  await insertImportedProducts(jobId, result.products.map((raw) => ({
    normalized: normalizeRawProduct(raw),
    raw,
  })));
  await completeImportJob(jobId);
} catch (error) {
  await failImportJob(jobId, error instanceof Error ? error.message : String(error));
  throw error;
}
```

- Each job row provides a heartbeat for external monitoring (Supabase logs, Logflare, etc.).
- Future enhancements: store per-product error diagnostics, proxy usage metadata, and execution durations.

## Automated Tests

- Added `tests/scraper-normalization.test.ts` (Node’s built-in `node:test`) to validate numeric parsing, quality scoring, and resilience to missing fields.
- Run via `npm run test:scraper`; integrates with CI to catch regressions in normalization logic.

## Operational Checklist

- Capture job metrics (success/failure counts) via Supabase dashboards or SQL views.
- Alert on consecutive failures or low quality scores via scheduled Supabase functions.
- Extend logging to include proxy pool health and HTTP status breakdown.

