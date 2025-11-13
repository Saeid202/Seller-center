import { getSupabaseServiceClient } from "@/lib/supabase/service-client";
import type { NormalizedProduct, RawScrapedProduct } from "@/lib/scraper/types";

export interface StartJobParams {
  marketplace: string;
  query?: string;
  maxResults?: number;
}

export async function startImportJob(params: StartJobParams) {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from("import_jobs")
    .insert({
      marketplace: params.marketplace,
      query: params.query,
      max_results: params.maxResults ?? null,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to start import job: ${error.message}`);
  }
  return data.id as string;
}

export async function completeImportJob(jobId: string) {
  const client = getSupabaseServiceClient();
  const { error } = await client
    .from("import_jobs")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to complete job ${jobId}: ${error.message}`);
  }
}

export async function failImportJob(jobId: string, message: string) {
  const client = getSupabaseServiceClient();
  const { error } = await client
    .from("import_jobs")
    .update({
      status: "failed",
      error: message,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to mark job ${jobId} as failed: ${error.message}`);
  }
}

export interface ImportedProductInsert {
  normalized: NormalizedProduct;
  raw?: RawScrapedProduct;
}

export async function insertImportedProducts(jobId: string, items: ImportedProductInsert[]) {
  if (!items.length) {
    return [];
  }
  const client = getSupabaseServiceClient();
  const rows = items.map((item) => {
    const normalized = item.normalized;
    return {
      job_id: jobId,
      marketplace: normalized.marketplace,
      source_url: normalized.sourceUrl,
      supplier_name: normalized.supplierName,
      supplier_rating: normalized.supplierRating,
      supplier_review_count: normalized.supplierReviewCount,
      category_trail: normalized.categoryTrail,
      name: normalized.name,
      description: normalized.description,
      price_min: normalized.priceMin,
      price_max: normalized.priceMax,
      currency: normalized.currency,
      moq: normalized.moq,
      lead_time_days: normalized.leadTimeDays,
      quality_overall: normalized.quality.overall,
      quality_reasons: normalized.quality.reasons,
      quality_metrics: normalized.quality.metrics,
      images: normalized.images,
      normalized_payload: normalized,
      raw_payload: item.raw ?? null,
    };
  });

  const { data, error } = await client.from("imported_products").insert(rows).select("id");
  if (error) {
    throw new Error(`Failed to insert imported products: ${error.message}`);
  }
  return (data ?? []).map((row) => row.id as string);
}

