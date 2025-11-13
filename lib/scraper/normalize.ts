import type { NormalizedProduct, ProductQualityScore, RawScrapedProduct } from "./types";

const MIN_DESCRIPTION_LENGTH = 120;
const HIGH_RATING_THRESHOLD = 4.5;
const REVIEW_COUNT_WEIGHT = 0.1;
const IMAGE_WEIGHT = 15;
const DESCRIPTION_WEIGHT = 10;
const RATING_WEIGHT = 20;

export function normalizeRawProduct(raw: RawScrapedProduct): NormalizedProduct {
  const description = cleanDescription(raw.description);
  const leadTimeDays = parseLeadTime(raw.leadTimeText);
  const { priceMin, priceMax, currency } = resolvePrice(raw);
  const moq = resolveMoq(raw);

  return {
    marketplace: raw.marketplace,
    sourceUrl: raw.sourceUrl,
    name: cleanTitle(raw.title),
    description,
    priceMin,
    priceMax,
    currency,
    moq,
    leadTimeDays,
    packagingLengthCm: null,
    packagingWidthCm: null,
    packagingHeightCm: null,
    packagingWeightKg: null,
    images: dedupe(raw.images),
    supplierName: raw.supplierName?.trim() ?? null,
    supplierRating: raw.supplierRating ?? null,
    supplierReviewCount: raw.supplierReviewCount ?? null,
    categoryTrail: raw.categoryTrail ?? [],
    capturedAt: raw.capturedAt,
    quality: scoreProductQuality({
      description,
      images: raw.images,
      supplierRating: raw.supplierRating,
      supplierReviewCount: raw.supplierReviewCount,
    }),
  };
}

function cleanTitle(title: string) {
  return title.replace(/\s+/g, " ").trim();
}

function cleanDescription(description?: string) {
  if (!description) return null;
  const normalized = description.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function parseLeadTime(leadTimeText?: string) {
  if (!leadTimeText) return null;
  const match = leadTimeText.match(/(\d+)(?:\s*-\s*(\d+))?\s*(?:day|days)/i);
  if (!match) return null;
  const min = Number.parseInt(match[1], 10);
  const max = match[2] ? Number.parseInt(match[2], 10) : min;
  if (!Number.isFinite(min)) return null;
  if (Number.isFinite(max)) {
    return Math.round((min + max) / 2);
  }
  return min;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function resolvePrice(raw: RawScrapedProduct) {
  let priceMin = raw.priceMin ?? null;
  let priceMax = raw.priceMax ?? null;
  let currency = raw.currency ?? null;

  if ((priceMin == null || priceMax == null || currency == null) && raw.priceText) {
    const match = raw.priceText.match(/([A-Z]{3})\s*([\d.,]+)(?:\s*-\s*([\d.,]+))?/);
    if (match) {
      currency = currency ?? match[1];
      const min = Number.parseFloat(match[2].replace(/,/g, ""));
      const max = match[3] ? Number.parseFloat(match[3].replace(/,/g, "")) : min;
      if (Number.isFinite(min)) {
        priceMin = Number(min.toFixed(2));
      }
      if (Number.isFinite(max)) {
        priceMax = Number(max.toFixed(2));
      }
    }
  }

  return {
    priceMin,
    priceMax,
    currency,
  };
}

function resolveMoq(raw: RawScrapedProduct) {
  if (raw.moq != null) {
    return raw.moq;
  }
  if (!raw.moqText) {
    return null;
  }
  const match = raw.moqText.match(/([\d.,]+)/);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? Math.round(value) : null;
}

interface QualityInputs {
  description: string | null;
  images: string[];
  supplierRating?: number | null;
  supplierReviewCount?: number | null;
}

function scoreProductQuality(inputs: QualityInputs): ProductQualityScore {
  let score = 50;
  const reasons: string[] = [];

  const hasImages = inputs.images.length > 0;
  const hasDescription = Boolean(inputs.description && inputs.description.length >= MIN_DESCRIPTION_LENGTH);

  if (hasImages) {
    score += IMAGE_WEIGHT;
  } else {
    score -= 10;
    reasons.push("Missing product imagery");
  }

  if (hasDescription) {
    score += DESCRIPTION_WEIGHT;
  } else {
    score -= 5;
    reasons.push("Description is too short");
  }

  if (inputs.supplierRating != null) {
    const ratingBoost =
      Math.max(0, inputs.supplierRating - 3) / (HIGH_RATING_THRESHOLD - 3) * RATING_WEIGHT;
    score += Math.max(0, Math.min(RATING_WEIGHT, ratingBoost));
    if (inputs.supplierRating < 3.5) {
      score -= 5;
      reasons.push("Supplier rating below preferred threshold");
    }
  } else {
    score -= 5;
    reasons.push("Missing supplier rating");
  }

  if (inputs.supplierReviewCount != null) {
    score += Math.min(10, inputs.supplierReviewCount * REVIEW_COUNT_WEIGHT);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    overall: score,
    reasons,
    metrics: {
      hasImages,
      hasDescription,
      supplierRating: inputs.supplierRating ?? undefined,
      supplierReviewCount: inputs.supplierReviewCount ?? undefined,
    },
  };
}

