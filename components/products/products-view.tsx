"use client";

import Image from "next/image";
import { useEffect, useMemo, useReducer, useState, useTransition } from "react";
import { Eye, Plus, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
  uploadProductImagesAction,
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const getProductImageUrl = (storagePath: string) => {
  if (!SUPABASE_URL) {
    return null;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${storagePath}`;
};

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
const PRODUCTS_PER_PAGE = 4;

interface ProductsState {
  items: Product[];
  currentPage: number;
}

type ProductsAction =
  | { type: "reset"; payload: Product[] }
  | { type: "prepend"; payload: Product }
  | { type: "update"; payload: Product }
  | { type: "delete"; id: string }
  | { type: "setPage"; page: number };

function getTotalPages(count: number) {
  return Math.max(1, Math.ceil(Math.max(count, 1) / PRODUCTS_PER_PAGE));
}

function productsReducer(state: ProductsState, action: ProductsAction): ProductsState {
  switch (action.type) {
    case "reset":
      return { items: action.payload, currentPage: 1 };
    case "prepend":
      return { items: [action.payload, ...state.items], currentPage: 1 };
    case "update":
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.payload.id ? action.payload : item)),
      };
    case "delete": {
      const filtered = state.items.filter((item) => item.id !== action.id);
      const totalPages = getTotalPages(filtered.length);
      return {
        items: filtered,
        currentPage: Math.min(state.currentPage, totalPages),
      };
    }
    case "setPage": {
      const totalPages = getTotalPages(state.items.length);
      return {
        ...state,
        currentPage: Math.min(Math.max(1, action.page), totalPages),
      };
    }
    default:
      return state;
  }
}

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
    slug: product.slug,
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
  const [productState, dispatchProducts] = useReducer(productsReducer, {
    items: initialProducts,
    currentPage: 1,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ProductFormMode>("create");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [viewProductId, setViewProductId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const products = productState.items;
  const currentPage = productState.currentPage;

  const productNameSuggestions = useMemo(() => {
    const unique = new Set<string>();
    products.forEach((product) => {
      if (!product?.name) {
        return;
      }
      const trimmed = product.name.trim();
      if (trimmed) {
        unique.add(trimmed);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  useEffect(() => {
    dispatchProducts({ type: "reset", payload: initialProducts });
  }, [initialProducts]);

  const totalPages = getTotalPages(products.length);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return products.slice(start, start + PRODUCTS_PER_PAGE);
  }, [products, currentPage]);
  const showingStart = products.length ? (currentPage - 1) * PRODUCTS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(currentPage * PRODUCTS_PER_PAGE, products.length);
  const paginationPages = useMemo(() => Array.from({ length: totalPages }, (_, idx) => idx + 1), [totalPages]);
  const viewProduct = useMemo(
    () => products.find((item) => item.id === viewProductId) ?? null,
    [products, viewProductId],
  );
  const viewIncoterms = viewProduct?.incoterms ?? [];
  const viewImages = useMemo(() => {
    if (!viewProduct?.product_images?.length) {
      return [];
    }
    return [...viewProduct.product_images].sort((a, b) => a.position - b.position);
  }, [viewProduct]);

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
    setViewProductId(null);
  };

  const openEditForm = (product: Product) => {
    setActiveProduct(product);
    setFormMode("edit");
    setFormError(null);
    setFormOpen(true);
    setViewProductId(null);
  };

  const openView = (product: Product) => {
    setViewProductId(product.id);
    setFormOpen(false);
    setFormError(null);
    setActiveProduct(null);
  };

  const closeView = () => {
    setViewProductId(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setActiveProduct(null);
    setFormError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (values: ProductFormValues, imageFiles: File[]) => {
    void imageFiles;
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
      dispatchProducts({ type: "update", payload: product });
      toast.success(`${product.name} updated.`);
    } else {
      dispatchProducts({ type: "prepend", payload: product });
      toast.success(`${product.name} created.`);
    }

    if (imageFiles.length) {
      const uploadFormData = new FormData();
      uploadFormData.append("productId", product.id);
      imageFiles.forEach((file) => uploadFormData.append("images", file));

      const uploadResult = await uploadProductImagesAction(uploadFormData);
      if ("error" in uploadResult) {
        toast.error(uploadResult.error);
      } else if (uploadResult.count > 0) {
        toast.success(
          `${uploadResult.count} image${uploadResult.count > 1 ? "s" : ""} uploaded.`,
        );
      }
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
      dispatchProducts({ type: "delete", id: product.id });
      toast.success(`${product.name} deleted.`);
      setPendingDeleteId(null);
      if (viewProductId === product.id) {
        setViewProductId(null);
      }
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
          type="button"
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
              productNameSuggestions={productNameSuggestions}
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
            <Button type="button" onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create a product
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!emptyState ? (
        <div className="overflow-hidden rounded-2xl border-2 border-slate-900/80 bg-white shadow-lg">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-900/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Inventory
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="transition hover:bg-slate-100">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                      {product.description ? (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {product.description}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant[product.status]} className="text-xs font-semibold uppercase">
                      {product.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {formatCurrency(product.price, product.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {product.category?.name
                      ? `${product.category.name}${product.subcategory?.name ? ` / ${product.subcategory.name}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {product.inventory ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openView(product)}
                        className="text-slate-700 hover:text-slate-900"
                      >
                        <Eye className="mr-1 h-4 w-4" aria-hidden="true" />
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(product)}
                        className="text-slate-700 hover:text-slate-900"
                      >
                        <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        type="button"
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
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex flex-col gap-3 text-sm text-slate-700 lg:flex-row lg:items-center lg:justify-between">
              <p>
                Showing{" "}
                <span className="font-semibold">
                  {products.length ? `${showingStart}–${showingEnd}` : 0}
                </span>{" "}
                of <span className="font-semibold">{products.length}</span> products
              </p>
              {products.length > PRODUCTS_PER_PAGE ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => dispatchProducts({ type: "setPage", page: currentPage - 1 })}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {paginationPages.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      type="button"
                      size="sm"
                      variant={pageNumber === currentPage ? "default" : "ghost"}
                      onClick={() => dispatchProducts({ type: "setPage", page: pageNumber })}
                      className={pageNumber === currentPage ? "" : "text-slate-700"}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      dispatchProducts({ type: "setPage", page: currentPage + 1 })
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {viewProduct ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl text-slate-900">{viewProduct.name}</CardTitle>
              <CardDescription>
                {viewProduct.category?.name
                  ? `${viewProduct.category.name}${
                      viewProduct.subcategory?.name ? ` / ${viewProduct.subcategory.name}` : ""
                    }`
                  : "Uncategorized"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[viewProduct.status]}>{viewProduct.status}</Badge>
              <Button type="button" variant="outline" size="sm" onClick={closeView}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-slate-700">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Images</h4>
              {viewImages.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {viewImages.map((image) => {
                    const url = getProductImageUrl(image.storage_path);
                    if (!url) {
                      return null;
                    }
                    return (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                      >
                        <Image
                          src={url}
                          alt={`${viewProduct.name} image`}
                          width={480}
                          height={360}
                          className="h-48 w-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No product images uploaded yet.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Price</p>
                <p className="font-medium text-slate-900">{formatCurrency(viewProduct.price, viewProduct.currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Inventory</p>
                <p className="font-medium text-slate-900">{viewProduct.inventory ?? "Not specified"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">MOQ</p>
                <p className="font-medium text-slate-900">{viewProduct.moq}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">HS Code</p>
                <p className="font-medium text-slate-900">{viewProduct.hs_code ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Last updated</p>
                <p className="font-medium text-slate-900">
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(viewProduct.updated_at))}
                </p>
              </div>
            </div>

            {viewProduct.description ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900">Description</h4>
                <p className="whitespace-pre-line text-slate-700">{viewProduct.description}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">Incoterm quotes</h4>
              {viewIncoterms.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {viewIncoterms.map((quote) => (
                    <div key={quote.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {quote.term} · {quote.port}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatCurrency(quote.price, quote.currency)} {quote.currency}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No incoterm quotes recorded.</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Cartons / MOQ</p>
                <p className="font-medium text-slate-900">{viewProduct.cartons_per_moq ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Pallets / MOQ</p>
                <p className="font-medium text-slate-900">{viewProduct.pallets_per_moq ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">20ft Containers / MOQ</p>
                <p className="font-medium text-slate-900">{viewProduct.containers_20ft_per_moq ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">40ft Containers / MOQ</p>
                <p className="font-medium text-slate-900">{viewProduct.containers_40ft_per_moq ?? "—"}</p>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Shipping Notes</p>
                <p className="font-medium text-slate-900">
                  {viewProduct.shipping_notes && viewProduct.shipping_notes.trim()
                    ? viewProduct.shipping_notes
                    : "No additional notes."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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

