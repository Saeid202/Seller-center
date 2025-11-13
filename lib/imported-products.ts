import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { NormalizedProduct } from "@/lib/scraper/types";

export type ImportedProductReviewStatus = "pending" | "approved" | "rejected";

export interface ImportedProductRecord {
  id: string;
  marketplace: string;
  sourceUrl: string;
  supplierName: string | null;
  supplierRating: number | null;
  supplierReviewCount: number | null;
  categoryTrail: string[];
  name: string;
  description: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  moq: number | null;
  leadTimeDays: number | null;
  qualityOverall: number;
  qualityReasons: string[];
  qualityMetrics: Record<string, unknown>;
  images: string[];
  normalizedPayload: NormalizedProduct;
  rawPayload: Record<string, unknown> | null;
  reviewStatus: ImportedProductReviewStatus;
  categoryId: string | null;
  subcategoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImportedProductRow {
  id: string;
  marketplace: string;
  source_url: string;
  supplier_name: string | null;
  supplier_rating: number | null;
  supplier_review_count: number | null;
  category_trail: string[] | null;
  name: string;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string | null;
  moq: number | null;
  lead_time_days: number | null;
  quality_overall: number;
  quality_reasons: string[] | null;
  quality_metrics: Record<string, unknown> | null;
  images: string[] | null;
  normalized_payload: NormalizedProduct;
  raw_payload: Record<string, unknown> | null;
  review_status: ImportedProductReviewStatus;
  category_id: string | null;
  subcategory_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getImportedProductsByStatus(
  status: ImportedProductReviewStatus = "pending",
): Promise<ImportedProductRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("imported_products")
    .select("*")
    .eq("review_status", status)
    .order("quality_overall", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load imported products", error);
    return [];
  }

  return (data as ImportedProductRow[]).map(transformRow);
}

export async function updateImportedProductCategories(
  id: string,
  categoryId: string | null,
  subcategoryId: string | null,
) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("imported_products")
    .update({ category_id: categoryId, subcategory_id: subcategoryId })
    .eq("id", id);
}

export async function markImportedProductStatus(
  id: string,
  status: ImportedProductReviewStatus,
  metadata: { reviewerId?: string | null },
) {
  const supabase = await createSupabaseServerClient();
  const payload: Record<string, unknown> = {
    review_status: status,
    reviewed_at: new Date().toISOString(),
  };
  if (metadata.reviewerId) {
    payload.reviewer_id = metadata.reviewerId;
  }
  return supabase.from("imported_products").update(payload).eq("id", id);
}

function transformRow(row: ImportedProductRow): ImportedProductRecord {
  return {
    id: row.id,
    marketplace: row.marketplace,
    sourceUrl: row.source_url,
    supplierName: row.supplier_name,
    supplierRating: row.supplier_rating,
    supplierReviewCount: row.supplier_review_count,
    categoryTrail: row.category_trail ?? [],
    name: row.name,
    description: row.description,
    priceMin: row.price_min,
    priceMax: row.price_max,
    currency: row.currency,
    moq: row.moq,
    leadTimeDays: row.lead_time_days,
    qualityOverall: row.quality_overall,
    qualityReasons: row.quality_reasons ?? [],
    qualityMetrics: row.quality_metrics ?? {},
    images: row.images ?? [],
    normalizedPayload: row.normalized_payload,
    rawPayload: row.raw_payload,
    reviewStatus: row.review_status,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

