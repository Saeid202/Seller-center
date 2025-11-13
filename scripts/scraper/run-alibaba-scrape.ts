import { pathToFileURL } from "node:url";
import { AlibabaScraper } from "../../lib/scraper/alibaba";
import { createConsoleLogger } from "../../lib/scraper/logger";
import { normalizeRawProduct } from "../../lib/scraper/normalize";
import type { NormalizedProduct, ScrapeJobContext, ScrapeJobOptions } from "../../lib/scraper/types";

export async function runAlibabaScrape(query: string, maxResults = 5) {
  const options: ScrapeJobOptions = {
    marketplace: "alibaba",
    query,
    maxResults,
    headless: process.env.SCRAPER_HEADLESS !== "false",
    proxyUrl: process.env.SCRAPER_PROXY_URL,
  };

  const logger = createConsoleLogger("alibaba-scraper");
  const ctx: ScrapeJobContext = { logger };

  logger.info("Starting scrape job", options);

  const scraper = new AlibabaScraper();
  const result = await scraper.run(options, ctx);

  logger.info("Scrape job completed", {
    durationMs: result.durationMs,
    products: result.products.length,
    errors: result.errors.length,
  });

  return result;
}

export async function runNormalizedAlibabaScrape(query: string, maxResults = 5) {
  const result = await runAlibabaScrape(query, maxResults);
  const normalized: NormalizedProduct[] = result.products.map((product) => normalizeRawProduct(product));
  return { ...result, normalized };
}

const executedDirectly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedDirectly) {
  const query = process.argv[2] ?? "power bank";
  const maxResultsArg = process.argv[3];
  const maxResults = maxResultsArg ? Number.parseInt(maxResultsArg, 10) : undefined;

  runNormalizedAlibabaScrape(query, Number.isFinite(maxResults ?? NaN) ? maxResults : undefined)
    .then((result) => {
      if (result.errors.length) {
        console.warn("Scrape completed with errors:", result.errors);
      }
      console.log(JSON.stringify(result.normalized, null, 2));
    })
    .catch((error) => {
      console.error("Scrape job failed", error);
      process.exit(1);
    });
}

