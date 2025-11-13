export type Marketplace = "alibaba";

export interface ScrapeJobOptions {
  marketplace: Marketplace;
  query: string;
  maxResults?: number;
  headless?: boolean;
  proxyUrl?: string;
}

export interface RawScrapedProduct {
  marketplace: Marketplace;
  sourceUrl: string;
  title: string;
  description?: string;
  priceText?: string;
  currency?: string;
  priceMin?: number;
  priceMax?: number;
  moqText?: string;
  moq?: number;
  leadTimeText?: string;
  images: string[];
  supplierName?: string;
  supplierRating?: number;
  supplierReviewCount?: number;
  categoryTrail?: string[];
  capturedAt: string;
}

export interface NormalizedProduct {
  marketplace: Marketplace;
  sourceUrl: string;
  name: string;
  description: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  moq: number | null;
  leadTimeDays: number | null;
  packagingLengthCm: number | null;
  packagingWidthCm: number | null;
  packagingHeightCm: number | null;
  packagingWeightKg: number | null;
  images: string[];
  supplierName: string | null;
  supplierRating: number | null;
  supplierReviewCount: number | null;
  categoryTrail: string[];
  capturedAt: string;
  quality: ProductQualityScore;
}

export interface ProductQualityScore {
  overall: number;
  reasons: string[];
  metrics: {
    hasImages: boolean;
    hasDescription: boolean;
    supplierRating?: number;
    supplierReviewCount?: number;
  };
}

export interface ScrapeJobResult {
  options: ScrapeJobOptions;
  products: RawScrapedProduct[];
  errors: ScrapeError[];
  durationMs: number;
}

export interface ScrapeError {
  url: string;
  message: string;
  stack?: string;
  timestamp: string;
}

export interface ScrapeLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ScrapeJobContext {
  logger: ScrapeLogger;
  abortSignal?: AbortSignal;
}

