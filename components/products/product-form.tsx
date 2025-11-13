"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, useFieldArray, useForm } from "react-hook-form";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INCOTERM_CURRENCY_OPTIONS,
  INCOTERM_OPTIONS,
  INCOTERM_PORT_OPTIONS,
  type IncotermCurrency,
  type IncotermPort,
} from "@/lib/constants/incoterms";
import type { CategoryWithChildren } from "@/lib/categories";
import { productFormSchema, type ProductFormValues } from "@/lib/validations/product";
import {
  FIELD_FRAME_CLASS,
  FIELD_FRAME_WIDE_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_EMPHASIS_CLASS,
  SELECT_EMPHASIS_CLASS,
  TEXTAREA_EMPHASIS_CLASS,
} from "@/lib/styles/forms";
import { cn } from "@/lib/utils";

const INCOTERM_TERM_OPTIONS = INCOTERM_OPTIONS.map((option) => option.code) as ReadonlyArray<
  ProductFormValues["incoterms"][number]["term"]
>;
const DEFAULT_INCOTERM_CURRENCY: IncotermCurrency = INCOTERM_CURRENCY_OPTIONS[0];
const DEFAULT_INCOTERM_TERM: ProductFormValues["incoterms"][number]["term"] = INCOTERM_TERM_OPTIONS[0];
const DEFAULT_INCOTERM_PORT: IncotermPort = INCOTERM_PORT_OPTIONS[0];

type ProductFormInputs = Omit<
  ProductFormValues,
  "inventory" | "hsCode" | "incoterms" | "moq" | "cartonsPerMoq" | "palletsPerMoq" | "containers20ft" | "containers40ft"
> & {
  inventory: string;
  hsCode: string;
  moq: string;
  cartonsPerMoq: string;
  palletsPerMoq: string;
  containers20ft: string;
  containers40ft: string;
  incoterms: Array<
    Omit<ProductFormValues["incoterms"][number], "price"> & {
      price: string;
    }
  >;
};

type IncotermError = {
  price?: {
    message?: string;
  };
};

interface ProductFormProps {
  mode: "create" | "edit";
  categories: CategoryWithChildren[];
  initialValues?: Partial<ProductFormValues>;
  error?: string | null;
  isSubmitting?: boolean;
  onSubmit: (values: ProductFormValues, images: File[]) => Promise<void>;
  onCancel: () => void;
}

const MAX_IMAGE_COUNT = 8;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type ImagePreview = {
  id: string;
  file: File;
  previewUrl: string;
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  const kilobytes = Math.max(1, Math.round(bytes / 1024));
  return `${kilobytes} KB`;
};

function toInputDefaults(initialValues?: Partial<ProductFormValues>): ProductFormInputs {
  const mapIncoterm = (incoterm?: ProductFormValues["incoterms"][number]) => ({
    recordId: incoterm?.recordId,
    term: incoterm?.term ?? DEFAULT_INCOTERM_TERM,
    currency: incoterm?.currency ?? DEFAULT_INCOTERM_CURRENCY,
    price: incoterm?.price !== undefined && incoterm?.price !== null ? String(incoterm.price) : "",
    port: incoterm?.port ?? DEFAULT_INCOTERM_PORT,
  });

  const incoterms =
    initialValues?.incoterms && initialValues.incoterms.length
      ? initialValues.incoterms.map(mapIncoterm)
      : [mapIncoterm()];

  return {
    id: initialValues?.id,
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    status: initialValues?.status ?? "draft",
    inventory:
      initialValues?.inventory !== undefined && initialValues?.inventory !== null ? String(initialValues.inventory) : "",
    categoryId: initialValues?.categoryId ?? "",
    subcategoryId: initialValues?.subcategoryId ?? "",
    hsCode: initialValues?.hsCode ?? "",
    moq:
      initialValues?.moq !== undefined && initialValues?.moq !== null
        ? String(initialValues.moq)
        : "",
    cartonsPerMoq:
      initialValues?.cartonsPerMoq !== undefined && initialValues?.cartonsPerMoq !== null
        ? String(initialValues.cartonsPerMoq)
        : "",
    palletsPerMoq:
      initialValues?.palletsPerMoq !== undefined && initialValues?.palletsPerMoq !== null
        ? String(initialValues.palletsPerMoq)
        : "",
    containers20ft:
      initialValues?.containers20ft !== undefined && initialValues?.containers20ft !== null
        ? String(initialValues.containers20ft)
        : "",
    containers40ft:
      initialValues?.containers40ft !== undefined && initialValues?.containers40ft !== null
        ? String(initialValues.containers40ft)
        : "",
    incoterms,
    removedIncotermIds: initialValues?.removedIncotermIds ?? [],
  };
}

export function ProductForm({
  mode,
  categories,
  initialValues,
  error,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<ProductFormInputs>({
    resolver: zodResolver(productFormSchema) as unknown as Resolver<ProductFormInputs>,
    defaultValues: toInputDefaults(initialValues),
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    fields: incotermFields,
    append: appendIncoterm,
    remove: removeIncoterm,
  } = useFieldArray({
    control,
    name: "incoterms",
  });

  const incotermRootError =
    typeof (errors?.incoterms as { message?: unknown } | undefined)?.message === "string"
      ? ((errors?.incoterms as { message: string }).message)
      : undefined;
  const incotermArrayErrors: IncotermError[] = Array.isArray(errors?.incoterms)
    ? (errors.incoterms as IncotermError[])
    : [];

  const parseNumeric = (value: unknown): number | null => {
    if (typeof value === "string") {
      if (value.trim() === "") {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    return null;
  };

  const moqValue = parseNumeric(watch("moq"));
  const cartonsPerMoqValue = parseNumeric(watch("cartonsPerMoq"));
  const palletsPerMoqValue = parseNumeric(watch("palletsPerMoq"));
  const containers20ftValue = parseNumeric(watch("containers20ft"));
  const containers40ftValue = parseNumeric(watch("containers40ft"));

  const piecesPerCarton =
    moqValue !== null && cartonsPerMoqValue !== null && cartonsPerMoqValue > 0
      ? moqValue / cartonsPerMoqValue
      : null;
  const cartonsPerPallet =
    cartonsPerMoqValue !== null && palletsPerMoqValue !== null && palletsPerMoqValue > 0
      ? cartonsPerMoqValue / palletsPerMoqValue
      : null;
  const palletsPerContainer20 =
    palletsPerMoqValue !== null && containers20ftValue !== null && containers20ftValue > 0
      ? palletsPerMoqValue / containers20ftValue
      : null;
  const palletsPerContainer40 =
    palletsPerMoqValue !== null && containers40ftValue !== null && containers40ftValue > 0
      ? palletsPerMoqValue / containers40ftValue
      : null;

  const selectedCategoryId = watch("categoryId");
  const subcategoryOptions = useMemo(() => {
    const category = categories.find((item) => item.id === selectedCategoryId);
    return category?.subcategories ?? [];
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    reset(toInputDefaults(initialValues));
  }, [initialValues, reset]);

  useEffect(() => {
    if (!subcategoryOptions.length) {
      setValue("subcategoryId", "");
      return;
    }
    const current = getValues("subcategoryId");
    if (!current || !subcategoryOptions.some((item) => item.id === current)) {
      setValue("subcategoryId", subcategoryOptions[0]?.id ?? "", { shouldDirty: true });
    }
  }, [subcategoryOptions, getValues, setValue]);

  const submitHandler = handleSubmit(async (values) => {
    const parsed = productFormSchema.parse(values);
    await onSubmit(
      parsed,
      imagePreviews.map((item) => item.file),
    );
  });

  const handleIncotermRemove = (index: number) => {
    const incoterm = getValues("incoterms")[index];
    if (incoterm?.recordId) {
      const removedIds = getValues("removedIncotermIds") ?? [];
      setValue("removedIncotermIds", [...removedIds, incoterm.recordId], { shouldDirty: true });
    }
    removeIncoterm(index);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleImagesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    const allowed = files.filter((file) => file.type.startsWith("image/"));
    if (!allowed.length) {
      setImageError("Only image files are supported.");
      return;
    }

    const remainingSlots = MAX_IMAGE_COUNT - imagePreviews.length;
    if (remainingSlots <= 0) {
      setImageError(`You can upload up to ${MAX_IMAGE_COUNT} images.`);
      return;
    }

    const accepted: ImagePreview[] = [];
    let rejectedSize = false;

    for (const file of allowed) {
      if (accepted.length >= remainingSlots) {
        break;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejectedSize = true;
        continue;
      }
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${file.name}`;
      accepted.push({
        id,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (rejectedSize) {
      setImageError(`Some files exceeded the ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB limit and were skipped.`);
    } else {
      setImageError(null);
    }

    if (accepted.length) {
      setImagePreviews((prev) => [...prev, ...accepted]);
    }
  };

  const handleImageRemove = (id: string) => {
    setImagePreviews((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const removed = prev.find((item) => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [imagePreviews]);

  useEffect(() => {
    setImagePreviews((previous) => {
      previous.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setImageError(null);
  }, [mode, initialValues?.id]);

  const addIncoterm = () => {
    if (incotermFields.length >= 5) {
      return;
    }
    appendIncoterm(
      {
        term: DEFAULT_INCOTERM_TERM,
        currency: DEFAULT_INCOTERM_CURRENCY,
        price: "",
        port: DEFAULT_INCOTERM_PORT,
      },
      { shouldFocus: true },
    );
  };

  const disableSubmit = isSubmitting || (mode === "edit" && !isDirty);
  const hasNoCategories = categories.length === 0;

  return (
    <form onSubmit={submitHandler} className="space-y-8" noValidate>
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">Product information</h3>
          <p className="text-sm font-semibold text-slate-700">
            Give your listing a clear name and summary to help buyers understand the offer.
          </p>
        </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={cn("sm:col-span-2", FIELD_FRAME_CLASS)}>
          <Label className={FIELD_LABEL_CLASS} htmlFor="name">
            Product name
          </Label>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                id="name"
                placeholder="Premium cotton t-shirt"
                value={field.value}
                onChange={field.onChange}
                className={INPUT_EMPHASIS_CLASS}
              />
            )}
          />
          {errors?.name ? <p className="text-xs text-red-600">{errors.name.message as string}</p> : null}
        </div>

        <div className={cn("sm:col-span-2", FIELD_FRAME_WIDE_CLASS)}>
          <div className="flex items-center justify-between">
            <div>
              <Label className={FIELD_LABEL_CLASS} htmlFor="product-images">
                Product images
              </Label>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Upload up to {MAX_IMAGE_COUNT} images. Max 5MB each. You can remove or reorder them later.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openFileDialog}
              disabled={imagePreviews.length >= MAX_IMAGE_COUNT}
            >
              <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add images
            </Button>
          </div>
          <input
            ref={fileInputRef}
            id="product-images"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleImagesSelected}
          />

          {imagePreviews.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {imagePreviews.map((image) => (
                <div
                  key={image.id}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <Image
                    src={image.previewUrl}
                    alt="Selected product image"
                    className="h-36 w-full object-cover transition group-hover:scale-105"
                    width={320}
                    height={320}
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => handleImageRemove(image.id)}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-red-500 hover:text-white"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[11px] text-white">
                    {formatFileSize(image.file.size)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={openFileDialog}
              className="flex w-full min-h-[140px] items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-50 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40"
            >
              <span>
                <p>No images selected yet.</p>
                <p>Click &ldquo;Add images&rdquo; to start uploading.</p>
              </span>
            </button>
          )}
          {imageError ? <p className="text-xs text-red-600">{imageError}</p> : null}
        </div>

        <div className={cn("sm:col-span-2", FIELD_FRAME_CLASS)}>
          <Label className={FIELD_LABEL_CLASS} htmlFor="description">
            Description
          </Label>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Textarea
                id="description"
                placeholder="Highlight key details buyers should know."
                className={cn("h-28", TEXTAREA_EMPHASIS_CLASS)}
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          />
          {errors?.description ? (
              <p className="text-xs text-red-600">{errors.description.message as string}</p>
          ) : (
            <p className="text-xs font-semibold text-slate-700">
              Appears on the product detail page. Keep it concise and descriptive.
            </p>
          )}
        </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">Classification</h3>
          <p className="text-sm font-semibold text-slate-700">
            Categories help buyers filter products. Make sure the HS code matches your customs paperwork.
          </p>
        </div>
        {hasNoCategories ? (
          <Alert variant="destructive">
            No categories found. Run the Supabase migration and seed categories/subcategories before creating a product.
          </Alert>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="categoryId">
              Category
            </Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <select
                  id="categoryId"
                  className={SELECT_EMPHASIS_CLASS}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  disabled={hasNoCategories}
                >
                  <option value="">{hasNoCategories ? "No categories available" : "Select category"}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors?.categoryId ? <p className="text-xs text-red-600">{errors.categoryId.message as string}</p> : null}
          </div>

          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="subcategoryId">
              Subcategory
            </Label>
            <Controller
              control={control}
              name="subcategoryId"
              render={({ field }) => (
                <select
                  id="subcategoryId"
                  className={SELECT_EMPHASIS_CLASS}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  disabled={!subcategoryOptions.length}
                >
                  <option value="">
                    {subcategoryOptions.length ? "Select subcategory" : "Select a category first"}
                  </option>
                  {subcategoryOptions.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors?.subcategoryId ? (
              <p className="text-xs text-red-600">{errors.subcategoryId.message as string}</p>
            ) : null}
          </div>

          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="hsCode">
              HS code
            </Label>
            <Controller
              control={control}
              name="hsCode"
              render={({ field }) => (
                <Input
                  id="hsCode"
                  placeholder="Ex: 610910"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  className={INPUT_EMPHASIS_CLASS}
                />
              )}
            />
            {errors?.hsCode ? <p className="text-xs text-red-600">{errors.hsCode.message as string}</p> : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">Incoterms</h3>
          <p className="text-sm font-semibold text-slate-700">Specify commercial terms and pricing for each quote you offer.</p>
        </div>
        <div className="space-y-3">
          {incotermFields.map((field, index) => {
            const rowErrors = incotermArrayErrors[index];
            return (
            <div
              key={field.recordId ?? field.id ?? index}
              className="grid grid-cols-1 gap-4 rounded-2xl border-2 border-slate-900/70 bg-white/80 p-4 shadow-md md:grid-cols-4"
            >
              <div className={FIELD_FRAME_CLASS}>
                <Label className={FIELD_LABEL_CLASS} htmlFor={`incoterms.${index}.currency`}>
                  Currency
                </Label>
                <Controller
                  control={control}
                  name={`incoterms.${index}.currency`}
                  render={({ field: currencyField }) => (
                    <select
                      id={`incoterms.${index}.currency`}
                      className={SELECT_EMPHASIS_CLASS}
                      value={currencyField.value}
                      onChange={currencyField.onChange}
                    >
                      {INCOTERM_CURRENCY_OPTIONS.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div className={FIELD_FRAME_CLASS}>
                <Label className={FIELD_LABEL_CLASS} htmlFor={`incoterms.${index}.price`}>
                  Price
                </Label>
                <Controller
                  control={control}
                  name={`incoterms.${index}.price`}
                  render={({ field: priceField }) => (
                    <Input
                      id={`incoterms.${index}.price`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceField.value}
                      onChange={(event) => priceField.onChange(event.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                      className={INPUT_EMPHASIS_CLASS}
                    />
                  )}
                />
                {rowErrors?.price?.message ? (
                  <p className="text-xs text-red-600">{rowErrors.price.message}</p>
                ) : null}
              </div>

              <div className={FIELD_FRAME_CLASS}>
                <Label className={FIELD_LABEL_CLASS} htmlFor={`incoterms.${index}.term`}>
                  Term
                </Label>
                <Controller
                  control={control}
                  name={`incoterms.${index}.term`}
                  render={({ field: termField }) => (
                    <select
                      id={`incoterms.${index}.term`}
                      className={SELECT_EMPHASIS_CLASS}
                      value={termField.value}
                      onChange={termField.onChange}
                    >
                      {INCOTERM_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div className={FIELD_FRAME_CLASS}>
                <Label className={FIELD_LABEL_CLASS} htmlFor={`incoterms.${index}.port`}>
                  Port
                </Label>
                <Controller
                  control={control}
                  name={`incoterms.${index}.port`}
                  render={({ field: portField }) => (
                    <select
                      id={`incoterms.${index}.port`}
                      className={SELECT_EMPHASIS_CLASS}
                      value={portField.value}
                      onChange={portField.onChange}
                    >
                      {INCOTERM_PORT_OPTIONS.map((port) => (
                        <option key={port} value={port}>
                          {port}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div className="md:col-span-4 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleIncotermRemove(index)}
                  disabled={isSubmitting || incotermFields.length === 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
          })}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIncoterm}
              disabled={isSubmitting || incotermFields.length >= 5}
            >
              Add incoterm quote
            </Button>
            <p className="text-xs font-semibold text-slate-600">You can add up to five incoterm quotes.</p>
          </div>
          {incotermRootError ? <p className="text-xs text-red-600">{incotermRootError}</p> : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">Shipping &amp; packaging</h3>
          <p className="text-sm font-semibold text-slate-700">
            Capture how your minimum order quantity translates into outbound units for logistics.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="moq">
              MOQ (pieces)
            </Label>
            <Controller
              control={control}
              name="moq"
              render={({ field }) => (
                <Input
                  id="moq"
                  type="number"
                  min="1"
                  step="1"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder="e.g. 500"
                  inputMode="numeric"
                  className={INPUT_EMPHASIS_CLASS}
                />
              )}
            />
            {errors?.moq ? (
              <p className="text-xs text-red-600">{errors.moq.message as string}</p>
            ) : (
              <p className="text-xs font-semibold text-slate-700">Minimum order quantity in individual units.</p>
            )}
          </div>

          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="cartonsPerMoq">
              Cartons (per MOQ)
            </Label>
            <Controller
              control={control}
              name="cartonsPerMoq"
              render={({ field }) => (
                <Input
                  id="cartonsPerMoq"
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder="Optional"
                  inputMode="decimal"
                  className={INPUT_EMPHASIS_CLASS}
                />
              )}
            />
            {errors?.cartonsPerMoq ? (
              <p className="text-xs text-red-600">{errors.cartonsPerMoq.message as string}</p>
            ) : (
              <p className="text-xs font-semibold text-slate-700">Total cartons required to ship the MOQ.</p>
            )}
          </div>

          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="palletsPerMoq">
              Pallets (per MOQ)
            </Label>
            <Controller
              control={control}
              name="palletsPerMoq"
              render={({ field }) => (
                <Input
                  id="palletsPerMoq"
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder="Optional"
                  inputMode="decimal"
                  className={INPUT_EMPHASIS_CLASS}
                />
              )}
            />
            {errors?.palletsPerMoq ? (
              <p className="text-xs text-red-600">{errors.palletsPerMoq.message as string}</p>
            ) : (
              <p className="text-xs font-semibold text-slate-700">Number of pallets the shipment occupies.</p>
            )}
          </div>

          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="containers20ft">
              Containers — 20ft (per MOQ)
            </Label>
            <Controller
              control={control}
              name="containers20ft"
              render={({ field }) => (
                <Input
                  id="containers20ft"
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder="Optional"
                  inputMode="decimal"
                  className={INPUT_EMPHASIS_CLASS}
                />
              )}
            />
            {errors?.containers20ft ? (
              <p className="text-xs text-red-600">{errors.containers20ft.message as string}</p>
            ) : (
              <p className="text-xs font-semibold text-slate-700">20ft containers needed for the MOQ (if applicable).</p>
            )}
          </div>

          <div className={FIELD_FRAME_CLASS}>
            <Label className={FIELD_LABEL_CLASS} htmlFor="containers40ft">
              Containers — 40ft (per MOQ)
            </Label>
            <Controller
              control={control}
              name="containers40ft"
              render={({ field }) => (
                <Input
                  id="containers40ft"
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder="Optional"
                  inputMode="decimal"
                  className={INPUT_EMPHASIS_CLASS}
                />
              )}
            />
            {errors?.containers40ft ? (
              <p className="text-xs text-red-600">{errors.containers40ft.message as string}</p>
            ) : (
              <p className="text-xs font-semibold text-slate-700">40ft containers needed for the MOQ (if applicable).</p>
            )}
          </div>
        </div>
        {piecesPerCarton !== null ||
        cartonsPerPallet !== null ||
        palletsPerContainer20 !== null ||
        palletsPerContainer40 !== null ? (
          <div className="space-y-1 rounded-xl border-2 border-slate-900/70 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
            {piecesPerCarton !== null ? (
              <p>≈ {piecesPerCarton.toFixed(2)} pieces per carton</p>
            ) : null}
            {cartonsPerPallet !== null ? (
              <p>≈ {cartonsPerPallet.toFixed(2)} cartons per pallet</p>
            ) : null}
            {palletsPerContainer20 !== null ? (
              <p>≈ {palletsPerContainer20.toFixed(2)} pallets per 20ft container</p>
            ) : null}
            {palletsPerContainer40 !== null ? (
              <p>≈ {palletsPerContainer40.toFixed(2)} pallets per 40ft container</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="flex flex-col-reverse items-stretch gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={disableSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              {mode === "edit" ? "Saving..." : "Creating..."}
            </>
          ) : mode === "edit" ? (
            "Save changes"
          ) : (
            "Create product"
          )}
        </Button>
      </div>
    </form>
  );
}

