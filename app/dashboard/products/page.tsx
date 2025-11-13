import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductsView } from "@/components/products/products-view";
import { getAllCategories } from "@/lib/categories";
import { getCurrentServerUser } from "@/lib/auth/server";
import { getProductsBySeller } from "@/lib/products";
import { getImportedProductsByStatus } from "@/lib/imported-products";

export const metadata: Metadata = {
  title: "Products",
};

export default async function ProductsPage() {
  const user = await getCurrentServerUser();
  if (!user) {
    redirect("/login");
  }

  const { data: products, error } = await getProductsBySeller(user.id);

  if (error) {
    console.error("Failed to load products", error);
  }

  const categories = await getAllCategories();
  const importedProducts = await getImportedProductsByStatus("pending");

  return (
    <ProductsView
      initialProducts={products ?? []}
      sellerName={user.user_metadata?.full_name ?? user.email}
      categories={categories}
      initialImportedProducts={importedProducts}
    />
  );
}

