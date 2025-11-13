import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryWithChildren } from "@/lib/categories";
import type { ImportedProductRecord } from "@/lib/imported-products";
import {
  FIELD_FRAME_CLASS,
  FIELD_LABEL_CLASS,
  INPUT_EMPHASIS_CLASS,
  SELECT_EMPHASIS_CLASS,
} from "@/lib/styles/forms";
import { cn } from "@/lib/utils";

interface ImportedProductsPanelProps {
  items: ImportedProductRecord[];
  categories: CategoryWithChildren[];
  isBusy: boolean;
  isUrlSubmitting: boolean;
  onRefresh: () => void;
  onScrapeUrlSubmit: (url: string) => Promise<boolean>;
  onPrefill: (item: ImportedProductRecord) => void;
  onAssignCategory: (id: string, categoryId: string | null, subcategoryId: string | null) => void;
  onReject: (id: string) => void;
  onApprove: (id: string) => void;
}

export function ImportedProductsPanel({
  items,
  categories,
  isBusy,
  isUrlSubmitting,
  onRefresh,
  onScrapeUrlSubmit,
  onPrefill,
  onAssignCategory,
  onReject,
  onApprove,
}: ImportedProductsPanelProps) {
  if (!items.length) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Sourcing robot</CardTitle>
            <CardDescription>No imported products waiting for review.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isBusy}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isBusy ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
            <ScrapeUrlForm onSubmit={onScrapeUrlSubmit} isSubmitting={isUrlSubmitting} />
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          When you trigger the sourcing robot, new product leads will appear here for review.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Imported leads</CardTitle>
          <CardDescription>Review, categorise, and add high-quality products to your catalog.</CardDescription>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isBusy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isBusy ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
          <ScrapeUrlForm onSubmit={onScrapeUrlSubmit} isSubmitting={isUrlSubmitting} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((item) => {
          const subcategories =
            categories.find((category) => category.id === item.categoryId)?.subcategories ?? [];
          return (
            <article key={item.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-500">
                  {item.marketplace.toUpperCase()} ·{" "}
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View source
                  </a>
                </p>
              </div>
              <Badge variant="success" className="self-start">
                Quality {item.qualityOverall}/100
              </Badge>
            </div>

            <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Price range</dt>
                <dd>{formatPrice(item.priceMin, item.priceMax, item.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">MOQ</dt>
                <dd>{item.moq ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Lead time</dt>
                <dd>{item.leadTimeDays ? `${item.leadTimeDays} days` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Supplier</dt>
                <dd>
                  {item.supplierName ?? "Unknown"}
                  {item.supplierRating ? ` · ${item.supplierRating}/5` : ""}
                  {item.supplierReviewCount ? ` (${item.supplierReviewCount})` : ""}
                </dd>
              </div>
            </dl>

            {item.qualityReasons.length ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {item.qualityReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Field label="Assign category">
                <select
                  className={SELECT_EMPHASIS_CLASS}
                  value={item.categoryId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    onAssignCategory(item.id, value || null, null);
                  }}
                >
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assign subcategory">
                <select
                  className={SELECT_EMPHASIS_CLASS}
                  value={item.subcategoryId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    onAssignCategory(item.id, item.categoryId, value || null);
                  }}
                  disabled={!item.categoryId}
                >
                  <option value="">Choose subcategory</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Primary image">
                <Input
                  value={item.images[0] ?? ""}
                  onChange={() => undefined}
                  readOnly
                  className={cn(INPUT_EMPHASIS_CLASS, "cursor-not-allowed text-xs text-slate-500")}
                />
              </Field>
              <Field label="Category trail">
                <Input
                  value={item.categoryTrail.join(" › ")}
                  onChange={() => undefined}
                  readOnly
                  className={cn(INPUT_EMPHASIS_CLASS, "cursor-not-allowed text-xs text-slate-500")}
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" variant="ghost" className="text-slate-600 hover:text-slate-900" onClick={() => onReject(item.id)}>
                Reject
              </Button>
              <Button type="button" variant="outline" onClick={() => onPrefill(item)}>
                Prefill form
              </Button>
              <Button type="button" onClick={() => onApprove(item.id)}>
                Mark reviewed
              </Button>
            </div>
          </article>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={FIELD_FRAME_CLASS}>
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      {children}
    </div>
  );
}

function formatPrice(min: number | null, max: number | null, currency: string | null) {
  const symbol = currency ?? "USD";
  if (min == null && max == null) {
    return "—";
  }
  if (min != null && max != null && min !== max) {
    return `${symbol} ${min.toFixed(2)} - ${max.toFixed(2)}`;
  }
  const amount = min ?? max ?? 0;
  return `${symbol} ${amount.toFixed(2)}`;
}

function ScrapeUrlForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (url: string) => Promise<boolean>;
  isSubmitting: boolean;
}) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setLocalError("Enter a product detail URL.");
      return;
    }
    setLocalError(null);
    const success = await onSubmit(trimmed);
    if (success) {
      setValue("");
    }
  };

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="url"
          placeholder="https://www.alibaba.com/..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Product detail URL"
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Fetching..." : "Fetch"}
        </Button>
      </form>
      {localError ? <p className="mt-1 text-xs text-red-600">{localError}</p> : null}
    </div>
  );
}

