import type { Browser, Page } from "@playwright/test";
import type {
  RawScrapedProduct,
  ScrapeError,
  ScrapeJobContext,
  ScrapeJobOptions,
  ScrapeJobResult,
} from "./types";

const SEARCH_URL = "https://www.alibaba.com/trade/search";

export class AlibabaScraper {
  async run(options: ScrapeJobOptions, ctx: ScrapeJobContext): Promise<ScrapeJobResult> {
    const start = performance.now();
    const errors: ScrapeError[] = [];
    const products: RawScrapedProduct[] = [];

    const browser = await this.launchBrowser(options);
    ctx.logger.info("Browser launched", { headless: options.headless !== false });

    try {
      const page = await browser.newPage({ ignoreHTTPSErrors: true });
      if (options.proxyUrl) {
        ctx.logger.warn("Proxy URL support is not implemented in Playwright page context yet", {
          proxyUrl: options.proxyUrl,
        });
      }

      await this.navigateToSearch(page, options, ctx);

      const productLinks = await this.collectSearchResultUrls(page, options, ctx);
      ctx.logger.info("Collected search results", { count: productLinks.length });

      for (const url of productLinks) {
        if (ctx.abortSignal?.aborted) {
          ctx.logger.warn("Abort signal received; exiting scrape loop");
          break;
        }
        try {
          const product = await this.scrapeProductDetail(page, url, ctx);
          products.push(product);
        } catch (err) {
          const error = normalizeError(err);
          errors.push({ url, ...error });
          ctx.logger.error("Failed to scrape product", { url, error: error.message });
        }
      }
    } finally {
      await browser.close();
      ctx.logger.info("Browser closed");
    }

    return {
      options,
      products,
      errors,
      durationMs: Math.round(performance.now() - start),
    };
  }

  private async launchBrowser(options: ScrapeJobOptions): Promise<Browser> {
    const { chromium } = await import("@playwright/test");
    return chromium.launch({
      headless: options.headless !== false,
    });
  }

  private async navigateToSearch(page: Page, options: ScrapeJobOptions, ctx: ScrapeJobContext) {
    const url = `${SEARCH_URL}?fsb=y&IndexArea=product_en&SearchText=${encodeURIComponent(options.query)}`;
    ctx.logger.info("Navigating to search page", { url });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3_000);
  }

  private async collectSearchResultUrls(page: Page, options: ScrapeJobOptions, ctx: ScrapeJobContext) {
    const max = options.maxResults ?? 5;
    const urls = await page.$$eval("a.list-no-v2__product-title", (anchors) =>
      anchors.slice(0, 20).map((a) => (a instanceof HTMLAnchorElement ? a.href : "")),
    );
    const filtered = urls
      .filter(Boolean)
      .slice(0, max)
      .map((url) => url.split("?")[0]);
    if (!filtered.length) {
      ctx.logger.warn("No product URLs detected on search page");
    }
    return filtered;
  }

  private async scrapeProductDetail(page: Page, url: string, ctx: ScrapeJobContext): Promise<RawScrapedProduct> {
    ctx.logger.info("Scraping product detail", { url });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_000);

    const data = await page.evaluate(() => {
      const title =
        document.querySelector('[data-role="product-title"]')?.textContent ??
        document.querySelector("h1")?.textContent ??
        "";
      const descriptionElement = document.querySelector('[data-role="product-detail"]') ?? document.querySelector("#J-rich-text-description");
      const description = descriptionElement?.textContent ?? undefined;

      const priceNode =
        document.querySelector('[data-role="price-wrapper"] [data-role="price"]') ??
        document.querySelector('[class*="Price--"]');
      const priceText = priceNode?.textContent ?? undefined;

      const moqNode = document.querySelector('[data-role="moq"]') ?? document.querySelector('[class*="MOQ--"]');
      const moqText = moqNode?.textContent ?? undefined;

      const leadTimeNode =
        document.querySelector('[data-role="lead-time"]') ?? document.querySelector('[class*="LeadTime--"]');
      const leadTimeText = leadTimeNode?.textContent ?? undefined;

      const supplierName =
        document.querySelector('[data-role="company-name"]')?.textContent ??
        document.querySelector('[class*="SupplierName--"]')?.textContent ??
        undefined;
      const supplierRatingText =
        document.querySelector('[data-role="supplier-rating"]')?.textContent ??
        document.querySelector('[class*="RatingScore--"]')?.textContent ??
        undefined;

      const imageUrls = Array.from(
        document.querySelectorAll<HTMLImageElement>('img[src*="sc01.alicdn.com"], img[src*="img.alicdn.com"]'),
      )
        .map((img) => img.src)
        .filter((src, index, array) => Boolean(src) && array.indexOf(src) === index);

      const breadcrumbs = Array.from(document.querySelectorAll('[data-role="breadcrumb"] li'))
        .map((li) => li.textContent?.trim())
        .filter(Boolean) as string[];

      return {
        title: title.trim(),
        description: description?.trim(),
        priceText: priceText?.trim(),
        moqText: moqText?.trim(),
        leadTimeText: leadTimeText?.trim(),
        supplierName: supplierName?.trim(),
        supplierRatingText: supplierRatingText?.trim(),
        imageUrls,
        breadcrumbs,
      };
    });

    const product: RawScrapedProduct = {
      marketplace: "alibaba",
      sourceUrl: url,
      title: data.title,
      description: data.description,
      priceText: data.priceText,
      moqText: data.moqText,
      leadTimeText: data.leadTimeText,
      images: data.imageUrls,
      supplierName: data.supplierName,
      supplierRating: parseSupplierRating(data.supplierRatingText),
      supplierReviewCount: parseSupplierReviewCount(data.supplierRatingText),
      categoryTrail: data.breadcrumbs,
      capturedAt: new Date().toISOString(),
    };

    const { priceMin, priceMax, currency } = parsePriceRange(data.priceText);
    product.priceMin = priceMin;
    product.priceMax = priceMax;
    product.currency = currency;
    product.moq = parseMOQ(data.moqText);

    ctx.logger.info("Scraped product summary", {
      title: product.title,
      price: product.priceText,
      images: product.images.length,
    });

    return product;
  }

  async scrapeByUrl(
    url: string,
    options: ScrapeJobOptions,
    ctx: ScrapeJobContext,
  ): Promise<{ product: RawScrapedProduct | null; errors: ScrapeError[]; durationMs: number }> {
    const start = performance.now();
    const errors: ScrapeError[] = [];
    let product: RawScrapedProduct | null = null;

    const browser = await this.launchBrowser(options);
    ctx.logger.info("Browser launched", { headless: options.headless !== false });

    try {
      const page = await browser.newPage({ ignoreHTTPSErrors: true });
      if (options.proxyUrl) {
        ctx.logger.warn("Proxy URL support is not implemented in Playwright page context yet", {
          proxyUrl: options.proxyUrl,
        });
      }

      try {
        product = await this.scrapeProductDetail(page, url, ctx);
      } catch (err) {
        const error = normalizeError(err);
        errors.push({ url, ...error });
        ctx.logger.error("Failed to scrape product", { url, error: error.message });
      }
    } finally {
      await browser.close();
      ctx.logger.info("Browser closed");
    }

    return {
      product,
      errors,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

export async function scrapeAlibabaProductByUrl(
  url: string,
  ctx: ScrapeJobContext,
  options?: Partial<ScrapeJobOptions>,
) {
  const scraper = new AlibabaScraper();
  const mergedOptions: ScrapeJobOptions = {
    marketplace: "alibaba",
    query: options?.query ?? url,
    maxResults: 1,
    headless: options?.headless,
    proxyUrl: options?.proxyUrl,
  };

  return scraper.scrapeByUrl(url, mergedOptions, ctx);
}

function parsePriceRange(priceText?: string) {
  if (!priceText) return { currency: undefined, priceMin: undefined, priceMax: undefined };

  const match = priceText.match(/([A-Z]{3})\s*([\d.,]+)(?:\s*-\s*([\d.,]+))?/);
  if (!match) return { currency: undefined, priceMin: undefined, priceMax: undefined };

  const [, currency, minText, maxText] = match;
  const min = parseFloat(minText.replace(/,/g, ""));
  const max = maxText ? parseFloat(maxText.replace(/,/g, "")) : min;

  return {
    currency,
    priceMin: Number.isFinite(min) ? min : undefined,
    priceMax: Number.isFinite(max) ? max : undefined,
  };
}

function parseMOQ(moqText?: string) {
  if (!moqText) return undefined;
  const match = moqText.match(/([\d.,]+)/);
  if (!match) return undefined;
  const value = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? Math.round(value) : undefined;
}

function parseSupplierRating(ratingText?: string) {
  if (!ratingText) return undefined;
  const match = ratingText.match(/([\d.]+)\s*\/\s*5/);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(5, value));
}

function parseSupplierReviewCount(ratingText?: string) {
  if (!ratingText) return undefined;
  const match = ratingText.match(/\(([\d,]+)\)/);
  if (!match) return undefined;
  const value = parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isFinite(value) ? value : undefined;
}

function normalizeError(err: unknown) {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack, timestamp: new Date().toISOString() };
  }
  return {
    message: typeof err === "string" ? err : "Unknown error",
    stack: undefined,
    timestamp: new Date().toISOString(),
  };
}

