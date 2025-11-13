import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { IncotermCode, IncotermCurrency, IncotermPort } from "@/lib/constants/incoterms";
import type { CategoryRow, SubcategoryRow } from "@/lib/categories";
import type { Database } from "@/types/database";

export type ProductStatus = "draft" | "published" | "archived";

export interface ProductIncoterm {
  id: string;
  product_id: string;
  term: IncotermCode;
  currency: IncotermCurrency;
  price: number;
  port: IncotermPort;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  position: number;
}

export interface Product
  extends Omit<Database["public"]["Tables"]["products"]["Row"], "category_id" | "subcategory_id"> {
  category_id: string | null;
  subcategory_id: string | null;
  category: CategoryRow | null;
  subcategory: SubcategoryRow | null;
  incoterms: ProductIncoterm[];
  product_images: ProductImage[];
}

export interface ProductRecordInput {
  name: string;
  description: string | null;
  price: number;
  currency: IncotermCurrency;
  status: ProductStatus;
  inventory: number | null;
  category_id: string;
  subcategory_id: string;
  hs_code: string | null;
  min_order_quantity: number | null;
  lead_time_days: number | null;
  packaging_length_cm: number | null;
  packaging_width_cm: number | null;
  packaging_height_cm: number | null;
  packaging_weight_kg: number | null;
  shipping_notes: string | null;
  moq: number;
  cartons_per_moq: number | null;
  pallets_per_moq: number | null;
  containers_20ft_per_moq: number | null;
  containers_40ft_per_moq: number | null;
}

export type ProductUpdate = Partial<ProductRecordInput>;

export interface ProductIncotermInput {
  id?: string;
  term: IncotermCode;
  currency: IncotermCurrency;
  price: number;
  port: IncotermPort;
}

const productSelect = `
  *,
  category:category_id(*),
  subcategory:subcategory_id(*),
  product_incoterms(
    id,
    product_id,
    term,
    currency,
    price,
    port,
    created_at
  ),
  product_images:product_images!product_images_product_id_fkey(
    id,
    product_id,
    storage_path,
    position
  )
`;

export async function getProductsBySeller(sellerId: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("products")
    .select(productSelect)
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false })
    .order("created_at", { foreignTable: "product_incoterms", ascending: true });
}

export async function getProductById(id: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("products")
    .select(productSelect)
    .eq("id", id)
    .order("created_at", { foreignTable: "product_incoterms", ascending: true })
    .maybeSingle();
}

export async function createProduct(
  sellerId: string,
  record: ProductRecordInput,
  incoterms: ProductIncotermInput[],
) {
  const supabase = await createSupabaseServerClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      seller_id: sellerId,
      ...record,
    })
    .select("*")
    .single();

  if (error || !product) {
    return { data: null, error };
  }

  await upsertProductIncoterms(product.id, incoterms);

  return getProductById(product.id);
}

export async function updateProduct(
  id: string,
  record: ProductUpdate,
  incoterms: ProductIncotermInput[],
  removedIncotermIds: string[],
) {
  const supabase = await createSupabaseServerClient();

  const { data: product, error } = await supabase
    .from("products")
    .update({
      ...record,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !product) {
    return { data: null, error };
  }

  await deleteProductIncotermsByIds(removedIncotermIds);
  await upsertProductIncoterms(product.id, incoterms);

  return getProductById(product.id);
}

export async function deleteProduct(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  return { error };
}

export async function upsertProductIncoterms(productId: string, incoterms: ProductIncotermInput[]) {
  const supabase = await createSupabaseServerClient();
  if (!incoterms.length) {
    return;
  }

  const payload = incoterms.map((entry) => ({
    id: entry.id,
    product_id: productId,
    term: entry.term,
    currency: entry.currency,
    price: entry.price,
    port: entry.port,
  }));

  const toInsert = payload.filter((item) => !item.id);
  const toUpdate = payload.filter((item) => item.id);

  if (toInsert.length) {
    await supabase.from("product_incoterms").insert(toInsert);
  }
  if (toUpdate.length) {
    await supabase.from("product_incoterms").upsert(toUpdate, { onConflict: "id" });
  }
}

export async function deleteProductIncotermsByIds(ids: string[]) {
  if (!ids.length) {
    return;
  }
  const supabase = await createSupabaseServerClient();
  await supabase.from("product_incoterms").delete().in("id", ids);
}

