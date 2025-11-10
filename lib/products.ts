import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type ProductStatus = "draft" | "published" | "archived";

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  status: ProductStatus;
  inventory: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  status: ProductStatus;
  inventory: number | null;
  image_url: string | null;
}

export type ProductUpdate = Partial<ProductInput>;

export async function getProductsBySeller(sellerId: string) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false });
}

export async function getProductById(id: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from("products").select("*").eq("id", id).maybeSingle();
}

export async function createProduct(sellerId: string, input: ProductInput) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("products")
    .insert({
      seller_id: sellerId,
      ...input,
    })
    .select("*")
    .single();
}

export async function updateProduct(id: string, input: ProductUpdate) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("products")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
}

export async function deleteProduct(id: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.from("products").delete().eq("id", id);
}

