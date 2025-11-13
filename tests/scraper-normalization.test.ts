import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRawProduct } from "../lib/scraper/normalize";
import type { RawScrapedProduct } from "../lib/scraper/types";

const baseRaw: RawScrapedProduct = {
  marketplace: "alibaba",
  sourceUrl: "https://example.com/product",
  title: "  Premium Camping Tent  ",
  description: "Waterproof tent for 4 people",
  priceText: "USD 10 - 12",
  currency: "USD",
  moqText: "MOQ 100 pieces",
  images: ["https://example.com/image1.jpg", "https://example.com/image1.jpg"],
  supplierName: "Great Supplier Co.",
  supplierRating: 4.8,
  supplierReviewCount: 150,
  categoryTrail: ["Sports & Entertainment", "Camping"],
  capturedAt: new Date().toISOString(),
  priceMin: undefined,
  priceMax: undefined,
  moq: undefined,
  leadTimeText: "15-20 days",
};

test("normalizeRawProduct parses numeric fields and quality score", () => {
  const normalized = normalizeRawProduct(baseRaw);
  assert.equal(normalized.name, "Premium Camping Tent");
  assert.equal(normalized.priceMin, 10);
  assert.equal(normalized.priceMax, 12);
  assert.equal(normalized.currency, "USD");
  assert.equal(normalized.moq, 100);
  assert.equal(normalized.leadTimeDays, 18);
  assert.equal(normalized.images.length, 1);
  assert.ok(normalized.quality.overall >= 50);
  assert.ok(normalized.quality.metrics.hasImages);
});

test("normalizeRawProduct handles missing optional values", () => {
  const raw: RawScrapedProduct = {
    ...baseRaw,
    priceText: undefined,
    moqText: undefined,
    leadTimeText: undefined,
    description: undefined,
    images: [],
    supplierRating: undefined,
    supplierReviewCount: undefined,
  };
  const normalized = normalizeRawProduct(raw);
  assert.equal(normalized.priceMin, null);
  assert.equal(normalized.moq, null);
  assert.equal(normalized.leadTimeDays, null);
  assert.equal(normalized.description, null);
  assert.equal(normalized.images.length, 0);
  assert.ok(normalized.quality.overall < 50);
  assert.ok(normalized.quality.reasons.includes("Missing product imagery"));
});

