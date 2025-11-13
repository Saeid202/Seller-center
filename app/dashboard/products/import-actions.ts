"use server";

import { revalidatePath } from "next/cache";

import { getCurrentServerUser } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  getImportedProductsByStatus,
  markImportedProductStatus,
  updateImportedProductCategories,
  type ImportedProductRecord,
} from "@/lib/imported-products";
import { createConsoleLogger } from "@/lib/scraper/logger";
import { normalizeRawProduct } from "@/lib/scraper/normalize";
import { scrapeAlibabaProductByUrl } from "@/lib/scraper/alibaba";
import {
  completeImportJob,
  failImportJob,
  insertImportedProducts,
  startImportJob,
} from "@/lib/scraper/jobs";

type LoadImportedProductsResult =
  | { success: true; data: ImportedProductRecord[] }
  | { error: string };

type UpdateCategoryArgs = {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
};

type UpdateCategoryResult = { success: true } | { error: string };

type ReviewActionResult = { success: true } | { error: string };

type ScrapeUrlResult = { success: true } | { error: string };

export async function loadImportedProductsAction(): Promise<LoadImportedProductsResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to review imports." };
  }
  const items = await getImportedProductsByStatus("pending");
  return { success: true, data: items };
}

export async function updateImportedProductCategoryAction(
  args: UpdateCategoryArgs,
): Promise<UpdateCategoryResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to review imports." };
  }

  if (!args.id) {
    return { error: "Missing import identifier." };
  }

  const { error } = await updateImportedProductCategories(args.id, args.categoryId, args.subcategoryId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function rejectImportedProductAction(id: string): Promise<ReviewActionResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to review imports." };
  }
  if (!id) {
    return { error: "Missing import identifier." };
  }

  const { error } = await markImportedProductStatus(id, "rejected", { reviewerId: user.id });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function approveImportedProductAction(id: string): Promise<ReviewActionResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to review imports." };
  }
  if (!id) {
    return { error: "Missing import identifier." };
  }

  const { error } = await markImportedProductStatus(id, "approved", { reviewerId: user.id });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true };
}

export async function scrapeImportedProductByUrlAction(url: string): Promise<ScrapeUrlResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to use the sourcing robot." };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return { error: "Enter a product URL to scrape." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: "Enter a valid product URL." };
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return { error: "Only HTTP/HTTPS URLs are supported." };
  }

  if (!parsed.hostname.includes("alibaba.com")) {
    return { error: "Only Alibaba product links are supported right now." };
  }

  // Normalise the URL (strip fragments/query noise)
  const normalizedUrl = `${parsed.origin}${parsed.pathname}`;

  const supabase = await createSupabaseServerClient();
  const { count: existingCount, error: checkError } = await supabase
    .from("imported_products")
    .select("id", { count: "exact", head: true })
    .eq("source_url", normalizedUrl);

  if (checkError) {
    return { error: checkError.message };
  }
  if ((existingCount ?? 0) > 0) {
    return { error: "This product is already in the review queue." };
  }

  let jobId: string | null = null;
  const logger = createConsoleLogger("alibaba-scraper");
  const ctx = { logger };

  try {
    jobId = await startImportJob({
      marketplace: "alibaba",
      query: normalizedUrl,
      maxResults: 1,
    });

    const scrapeResult = await scrapeAlibabaProductByUrl(normalizedUrl, ctx, { query: normalizedUrl });

    if (scrapeResult.errors.length) {
      const message = scrapeResult.errors[0]?.message ?? "Unable to scrape product.";
      await failImportJob(jobId, message);
      return { error: message };
    }

    if (!scrapeResult.product) {
      await failImportJob(jobId, "No product data returned.");
      return { error: "Product details could not be extracted from that link." };
    }

    const normalized = normalizeRawProduct(scrapeResult.product);
    const insertedIds = await insertImportedProducts(jobId, [
      {
        normalized,
        raw: scrapeResult.product,
      },
    ]);

    await completeImportJob(jobId);
    revalidatePath("/dashboard/products");

    if (!insertedIds.length) {
      return { error: "Product scraped but could not be queued for review." };
    }

    return { success: true };
  } catch (error) {
    if (jobId) {
      const message = error instanceof Error ? error.message : "Unknown scrape failure.";
      await failImportJob(jobId, message);
    }
    console.error("[scrapeImportedProductByUrlAction] Failed to import product:", error);
    return {
      error: error instanceof Error ? error.message : "Unexpected error while scraping product.",
    };
  }
}

