# Scraper Prototype Notes

## Overview

- Implemented `AlibabaScraper` (`lib/scraper/alibaba.ts`) that:
  - Launches Playwright Chromium.
  - Runs a search, harvests product URLs, and scrapes detail pages sequentially.
  - Extracts key signals: title, description, price range, MOQ, lead time, supplier info, images, breadcrumbs.
  - Parses numeric values (price, MOQ, rating, review counts) and timestamps captures.
  - Emits structured `RawScrapedProduct` objects for the normalization pipeline.
- Added `ScrapeJob` types and a console logger helper to standardize instrumentation.
- Created `scripts/scraper/run-alibaba-scrape.ts` that normalizes output by default and can be executed with `node --loader ts-node/esm` or `npx tsx` for quick manual runs.

## Usage

```bash
# install playwright browsers if not done yet
npx playwright install chromium

# run prototype (defaults to query \"power bank\" and 5 results)
npx tsx scripts/scraper/run-alibaba-scrape.ts

# custom query and result count (outputs normalized payloads)
SCRAPER_HEADLESS=false npx tsx scripts/scraper/run-alibaba-scrape.ts "camping tent" 3
```

Environment variables:

- `SCRAPER_HEADLESS=false` to watch the browser.
- `SCRAPER_PROXY_URL` reserved for future proxy integration.

## Limitations / Next Steps

- Selectors were identified against current Alibaba markup; monitor for drift and update regularly.
- No retry/backoff logic yet; prototype aborts on navigation failures.
- Proxy support stubbed—needs plumbing via Playwright launch options.
- Output goes to stdout; persistence will be added in the staging phase.

