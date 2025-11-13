<!-- Discovery phase for product scraping bot -->

# Discovery & Constraints

## 1. Legal, Ethical, and Compliance Considerations

- **Terms of Service (ToS):** Review Alibaba's ToS and API offerings. Many marketplaces prohibit automated scraping without written approval. Obtain explicit permission or use official APIs if available.
- **Robots.txt & Rate Limits:** Respect each site's robots.txt. Even with permission, throttle requests (e.g., 1 request per second baseline, burst limits aligned with ToS).
- **Jurisdiction & Data Ownership:** Confirm legal advice on storing third-party product data (images, descriptions). Ensure compliance with intellectual property laws and regional regulations.
- **Attribution & Usage Rights:** Store metadata about origin URL, supplier ID, and usage rights to support takedown processes.
- **User Privacy:** Avoid scraping personal data unless necessary and compliant with privacy regulations (GDPR, CCPA).

## 2. Technical Constraints & Infrastructure

- **Network Access:** External web requests should run server-side (Next.js Route Handler or dedicated worker). Use rotating residential/datacenter proxies with failover.
- **Execution Environment:** Prefer serverless functions for triggers, but heavy scraping sessions should run in a long-lived worker (e.g., Supabase Edge Functions, Vercel background jobs, or external cron workers).
- **Observability:** Log every fetch (URL, timestamp, status) and maintain retry counts. Persist logs in Supabase (`import_job_logs`) or external logging (Logflare).
- **Storage:** Save raw HTML snapshots or extracted JSON in Supabase storage (`scraper-raw` bucket) to reprocess without re-fetching.
- **Scaling:** Implement backpressure controls—limit concurrent fetches and queue jobs per marketplace.

## 3. Required Product Fields & Mapping

| Scraped Attribute                         | Target Field / Table                         | Notes |
|-------------------------------------------|----------------------------------------------|-------|
| Product title                             | `public.products.name`                       | Trimmed to 120 chars if needed |
| Description / key features                | `public.products.description`                | Strip HTML, keep bullet points |
| Category hint                             | `imported_products.category_guess` (new)     | Raw category string from source |
| Supplier name / company                   | `imported_products.supplier_name` (new)      | Needed for vetting |
| Supplier rating / number of reviews       | `imported_products.supplier_score` (new)     | Used for quality scoring |
| Minimum order quantity (MOQ)              | `public.products.moq`                        | Parse integers only |
| Lead time                                 | `public.products.lead_time_days`             | Parse numeric days |
| Price range                               | `public.products.price` + `currency`         | Take mid-point or create `price_min`, `price_max` extensions |
| Incoterm availability (EXW/FOB/etc.)      | `product_incoterms`                          | Map available trade terms; create staged entries |
| Port / location                           | `product_incoterms.port`                     | Normalize to existing enum |
| Shipping dimensions (L/W/H, weight)       | `public.products.packaging_*` fields         | Convert to metric units |
| Product images                            | `product_images` (staged uploads)            | Store source URLs; download asynchronously |
| Source URL                                | `imported_products.source_url` (new)         | Required for audits |
| Last scraped timestamp                    | `imported_products.scraped_at` (new)         | ISO string |
| Verification status                       | `imported_products.review_status` (new)      | `pending`, `approved`, `rejected` |

### Schema Gaps Identified

- Need an `imported_products` staging table with supplier metadata, raw payload reference, category guess, review status, and linkage to seller once approved.
- Consider extending `products` with optional `price_min` / `price_max` if we want to preserve price ranges rather than single price.
- Need storage location for raw HTML/JSON snapshots (`scraper-raw` bucket) and job logs (`import_jobs`, `import_job_logs` tables).

## 4. Open Questions / Next Steps

- Confirm if we can obtain official Alibaba API access; otherwise, legal approval for scraping.
- Decide proxy provider budget and permitted throughput.
- Choose go-to-market product categories (focus on top-level categories first?).
- Determine whether imported products should auto-create vendors or link to existing sellers after manual review.


