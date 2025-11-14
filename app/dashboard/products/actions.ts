"use server";

import { revalidatePath } from "next/cache";

import { randomUUID } from "crypto";

import { getCurrentServerUser } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getSupabaseServiceClient } from "@/lib/supabase/service-client";
import {
  createProduct,
  deleteProduct as deleteProductFromDb,
  updateProduct,
  type Product,
  type ProductIncotermInput,
  type ProductRecordInput,
} from "@/lib/products";
import { productFormSchema, type ProductFormValues } from "@/lib/validations/product";

type ProductActionResult =
  | { success: true; data: Product }
  | { error: string };

type DeleteProductResult = { success: true; id: string } | { error: string };
type UploadImagesResult = { success: true; count: number } | { error: string };

function normalizeDescription(value: string | null) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

function buildProductSlug(name: string) {
  const base = slugify(name);
  const suffix = randomUUID().slice(0, 8);
  return (base || "product") + "-" + suffix;
}

function toRecordInput(values: ProductFormValues, slug: string): ProductRecordInput {
  const [primaryQuote] = values.incoterms;
  return {
    name: values.name.trim(),
    slug,
    description: normalizeDescription(values.description),
    price: primaryQuote?.price ?? 0,
    currency: primaryQuote?.currency ?? "USD",
    status: values.status,
    inventory:
      typeof values.inventory === "number"
        ? values.inventory
        : values.inventory && typeof values.inventory === "string"
        ? Number(values.inventory)
        : null,
    category_id: values.categoryId,
    subcategory_id: values.subcategoryId,
    hs_code: values.hsCode,
    min_order_quantity: null,
    lead_time_days: null,
    packaging_length_cm: null,
    packaging_width_cm: null,
    packaging_height_cm: null,
    packaging_weight_kg: null,
    shipping_notes: null,
    moq: values.moq,
    cartons_per_moq: values.cartonsPerMoq ?? null,
    pallets_per_moq: values.palletsPerMoq ?? null,
    containers_20ft_per_moq: values.containers20ft ?? null,
    containers_40ft_per_moq: values.containers40ft ?? null,
  };
}

function toIncotermInputs(values: ProductFormValues): ProductIncotermInput[] {
  return values.incoterms.map((incoterm) => ({
    id: incoterm.recordId,
    term: incoterm.term,
    currency: incoterm.currency,
    price: incoterm.price,
    port: incoterm.port,
  }));
}

export async function createProductAction(
  values: ProductFormValues,
): Promise<ProductActionResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to create products." };
  }

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(". ") || "Invalid product data." };
  }

  const slug = buildProductSlug(parsed.data.name);
  const recordInput = toRecordInput(parsed.data, slug);
  const incotermInputs = toIncotermInputs(parsed.data);

  if (!incotermInputs.length) {
    return { error: "Add at least one incoterm quote." };
  }

  const { data, error } = await createProduct(user.id, recordInput, incotermInputs);

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Unable to create product." };
  }

  revalidatePath("/dashboard/products");
  return { success: true, data };
}

export async function updateProductAction(
  values: ProductFormValues,
): Promise<ProductActionResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to update products." };
  }

  if (!values.id) {
    return { error: "Missing product identifier." };
  }

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(". ") || "Invalid product data." };
  }

  const slug = parsed.data.slug && parsed.data.slug.trim() ? parsed.data.slug : buildProductSlug(parsed.data.name);
  const recordInput = toRecordInput(parsed.data, slug);
  const incotermInputs = toIncotermInputs(parsed.data);
  const removedIncotermIds = parsed.data.removedIncotermIds ?? [];

  if (!incotermInputs.length) {
    return { error: "Add at least one incoterm quote." };
  }

  const { data, error } = await updateProduct(
    values.id,
    recordInput,
    incotermInputs,
    removedIncotermIds,
  );
  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Unable to update product." };
  }

  if (data.seller_id !== user.id) {
    return { error: "You are not allowed to update this product." };
  }

  revalidatePath("/dashboard/products");
  return { success: true, data };
}

export async function deleteProductAction(id: string): Promise<DeleteProductResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to delete products." };
  }

  if (!id) {
    return { error: "Missing product identifier." };
  }

  const { error } = await deleteProductFromDb(id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true, id };
}

export async function uploadProductImagesAction(formData: FormData): Promise<UploadImagesResult> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to upload images." };
  }

  const productId = formData.get("productId");
  if (!productId || typeof productId !== "string") {
    return { error: "Missing product identifier." };
  }

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) {
    return { success: true, count: 0 };
  }

  const supabase = await createSupabaseServerClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, seller_id, primary_image_id, images_count")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return { error: productError?.message ?? "Unable to load product." };
  }

  if (product.seller_id !== user.id) {
    return { error: "You are not allowed to manage this product." };
  }

  const serviceClient = getSupabaseServiceClient();

  const { data: existingImages, error: existingImagesError } = await serviceClient
    .from("product_images")
    .select("id, position")
    .eq("product_id", productId)
    .order("position", { ascending: true });

  if (existingImagesError) {
    return { error: existingImagesError.message };
  }

  let position = existingImages?.length ?? 0;
  const insertedIds: string[] = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.type?.split("/").pop() || "bin";
    const fileName = `${position}-${randomUUID()}.${extension}`;
    const storagePath = `${productId}/${fileName}`;

    const { error: uploadError } = await serviceClient.storage
      .from("product-images")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: inserted, error: insertError } = await serviceClient
      .from("product_images")
      .insert({
        product_id: productId,
        storage_path: storagePath,
        position,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { error: insertError?.message ?? "Failed to record uploaded image." };
    }

    insertedIds.push(inserted.id);
    position += 1;
  }

  const primaryImageId =
    product.primary_image_id ?? insertedIds[0] ?? existingImages?.[0]?.id ?? null;
  const imagesCount = (product.images_count ?? 0) + insertedIds.length;

  const { error: updateError } = await serviceClient
    .from("products")
    .update({
      primary_image_id: primaryImageId,
      images_count: imagesCount,
      images_last_synced_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard/products");
  return { success: true, count: insertedIds.length };
}

