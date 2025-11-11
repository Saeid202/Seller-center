"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/dashboard/products/actions";
import { ProductForm } from "@/components/products/product-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  INCOTERM_CURRENCY_OPTIONS,
  INCOTERM_OPTIONS,
  INCOTERM_PORT_OPTIONS,
  type IncotermCurrency,
} from "@/lib/constants/incoterms";
import type { Product } from "@/lib/products";
import type { ProductFormValues } from "@/lib/validations/product";
import type { CategoryWithChildren } from "@/lib/categories";

interface ProductsViewProps {
  initialProducts: Product[];
  sellerName: string | null;
  categories: CategoryWithChildren[];
}

type ProductFormMode = "create" | "edit";

const statusVariant: Record<Product["status"], "default" | "success" | "warning"> = {
  draft: "warning",
  published: "success",
  archived: "default",
};
const DEFAULT_INCOTERM_CURRENCY: IncotermCurrency = INCOTERM_CURRENCY_OPTIONS[0];
const DEFAULT_INCOTERM_TERM: ProductFormValues["incoterms"][number]["term"] = INCOTERM_OPTIONS[0].code;
const DEFAULT_INCOTERM_PORT: ProductFormValues["incoterms"][number]["port"] = INCOTERM_PORT_OPTIONS[0];

function toFormValues(product: Product): ProductFormValues {
  const normalizedCurrency = product.currency?.toUpperCase() as IncotermCurrency | undefined;
  const fallbackCurrency = normalizedCurrency && INCOTERM_CURRENCY_OPTIONS.includes(normalizedCurrency)
    ? normalizedCurrency
    : DEFAULT_INCOTERM_CURRENCY;

  const incoterms = product.incoterms ?? [];

  const incotermQuotes =
    incoterms.length > 0
      ? incoterms.map((quote) => ({
          recordId: quote.id,
          term: quote.term,
          currency: quote.currency,
          price: quote.price,
          port: quote.port,
        }))
      : [
          {
            recordId: undefined,
            term: DEFAULT_INCOTERM_TERM,
            currency: fallbackCurrency,
            price: product.price,
            port: DEFAULT_INCOTERM_PORT,
          },
        ];

  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    status: product.status,
    inventory: product.inventory,
    categoryId: product.category_id ?? "",
    subcategoryId: product.subcategory_id ?? "",
    hsCode: product.hs_code ?? "",
    moq: product.moq,
    cartonsPerMoq: product.cartons_per_moq,
    palletsPerMoq: product.pallets_per_moq,
    containers20ft: product.containers_20ft_per_moq,
    containers40ft: product.containers_40ft_per_moq,
    incoterms: incotermQuotes,
    removedIncotermIds: [],
  };
}

export function ProductsView({ initialProducts, sellerName, categories }: ProductsViewProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ProductFormMode>("create");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const heading = useMemo(() => {
    if (formMode === "edit" && activeProduct) {
      return `Edit ${activeProduct.name}`;
    }
    return "Add product";
  }, [formMode, activeProduct]);

  const formDescription =
    formMode === "edit"
      ? "Update your listing details."
      : "Provide the details buyers will see on your listing.";

  const openCreateForm = () => {
    setActiveProduct(null);
    setFormMode("create");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setActiveProduct(product);
    setFormMode("edit");
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setActiveProduct(null);
    setFormError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (values: ProductFormValues) => {
    setFormError(null);
    setIsSubmitting(true);
    const payload = formMode === "edit" ? { ...values, id: activeProduct?.id } : values;

    if (formMode === "edit" && !payload.id) {
      setFormError("Product ID is missing.");
      setIsSubmitting(false);
      return;
    }

    const result =
      formMode === "edit"
        ? await updateProductAction(payload)
        : await createProductAction(payload);

    if ("error" in result) {
      setFormError(result.error);
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    const product = result.data;

    if (formMode === "edit") {
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? product : item)),
      );
      toast.success(`${product.name} updated.`);
    } else {
      setProducts((prev) => [product, ...prev]);
      toast.success(`${product.name} created.`);
    }

    setIsSubmitting(false);
    closeForm();
    router.refresh();
  };

  const handleDelete = (product: Product) => {
    setPendingDeleteId(product.id);
    startDeleteTransition(async () => {
      const result = await deleteProductAction(product.id);
      if ("error" in result) {
        toast.error(result.error);
        setPendingDeleteId(null);
        return;
      }
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      toast.success(`${product.name} deleted.`);
      setPendingDeleteId(null);
      router.refresh();
    });
  };

  const emptyState = products.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-600">
            Manage your catalog and keep your listings up to date, {sellerName}.
          </p>
        </div>
        <Button
          onClick={formOpen ? closeForm : openCreateForm}
          className="self-start sm:self-auto"
          variant={formOpen ? "outline" : "default"}
        >
          {formOpen ? (
            <>
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
              Close form
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add product
            </>
          )}
        </Button>
      </div>

      {formOpen ? (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
            <p className="text-sm text-slate-600">{formDescription}</p>
          </div>
          <div className="px-6 pb-6">
            <ProductForm
              mode={formMode}
              initialValues={activeProduct ? toFormValues(activeProduct) : undefined}
              categories={categories}
              error={formError}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      ) : null}

      {emptyState && !formOpen ? (
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-xl">No products yet</CardTitle>
            <CardDescription>
              Start by adding your first product. You can always save as draft and publish later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create a product
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!emptyState ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Inventory
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                      {product.description ? (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {product.description}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[product.status]}>{product.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {formatCurrency(product.price, product.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {product.category?.name
                      ? `${product.category.name}${product.subcategory?.name ? ` / ${product.subcategory.name}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {product.inventory ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(product)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product)}
                        disabled={isDeletePending && pendingDeleteId === product.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                        {isDeletePending && pendingDeleteId === product.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount ?? 0);
  } catch {
    return `$${amount?.toFixed(2) ?? "0.00"}`;
  }
}

