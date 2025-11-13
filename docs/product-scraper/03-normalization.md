# Normalization & Quality Scoring

## Goals

- Convert `RawScrapedProduct` records into a format compatible with Seller Center product schemas.
- Enrich scraped data with derived metrics (lead time days, price ranges).
- Score overall quality so reviewers can focus on high-signal listings first.

## Implementation Highlights

- `normalizeRawProduct` (`lib/scraper/normalize.ts`) cleans text, deduplicates images, parses lead times, and maps values into a `NormalizedProduct`.
- Quality scoring (`scoreProductQuality`) starts at 50 and adjusts based on:
  - Image presence and description length.
  - Supplier rating and review volume.
  - Missing/low signals generate reasons to display in the review UI.
- The CLI helper (`runNormalizedAlibabaScrape`) now returns normalized payloads alongside raw scrape data.

## Sample Output (trimmed)

```json
{
  "name": "Portable 20000mAh Power Bank",
  "priceMin": 8.5,
  "priceMax": 9.2,
  "currency": "USD",
  "moq": 100,
  "leadTimeDays": 15,
  "images": ["https://sc01.alicdn.com/..."],
  "quality": {
    "overall": 82,
    "reasons": [],
    "metrics": {
      "hasImages": true,
      "hasDescription": true,
      "supplierRating": 4.8,
      "supplierReviewCount": 120
    }
  }
}
```

## Next Steps

- Expand parsing for packaging dimensions and incoterm hints when available.
- Persist normalized records into `imported_products` staging table with audit metadata.
- Surface quality reasons in the reviewer dashboard for quick triage.

