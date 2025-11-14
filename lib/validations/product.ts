import { z } from "zod";

const StatusEnum = z.enum(["draft", "published", "archived"]);

const nullableTrimmedString = z
  .string()
  .trim()
  .max(500, "Keep it under 500 characters")
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  })
  .nullable();

const nullableShortString = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    })
    .nullable();

const nullableNumber = (options?: { min?: number; integer?: boolean }) =>
  z
    .preprocess((raw) => {
      if (raw === "" || raw === undefined || raw === null) {
        return null;
      }
      if (typeof raw === "string") {
        const parsed = options?.integer ? parseInt(raw, 10) : parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : raw;
      }
      return raw;
    }, options?.integer ? z.union([z.number().int(), z.null()]) : z.union([z.number(), z.null()]))
    .refine(
      (value) => {
        if (value === null || value === undefined) {
          return true;
        }
        if (typeof value !== "number") {
          return false;
        }
        if (options?.min !== undefined) {
          return value >= options.min;
        }
        return true;
      },
      {
        message:
          options?.integer && options?.min !== undefined
            ? `Enter an integer greater than or equal to ${options.min}`
            : options?.integer
            ? "Enter a whole number"
            : "Enter a valid number",
      },
    )
    .transform((value) => value ?? null);

const IncotermTermEnum = z.enum(["EXW", "FOB", "CFR"]);
const IncotermPortEnum = z.enum(["Shanghai Port", "Ningbo Port", "Guangzhou Port", "Bandar Abbas"]);
const CurrencyEnum = z.enum(["USD", "RMB"]);

const positiveInteger = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number({ required_error: "MOQ is required" })
    .int("Enter a whole number")
    .min(1, "MOQ must be at least 1 piece"),
);

const incotermQuoteSchema = z.object({
  recordId: z.string().uuid().optional(),
  term: IncotermTermEnum,
  currency: CurrencyEnum,
  price: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    },
    z.number().min(0, "Price must be greater than or equal to 0"),
  ),
  port: IncotermPortEnum,
});

export const productFormSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .max(120)
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(120, "Product name cannot exceed 120 characters"),
  description: nullableTrimmedString,
  status: StatusEnum,
  inventory: nullableNumber({ integer: true, min: 0 }),
  categoryId: z.string().uuid({ message: "Select a category" }),
  subcategoryId: z.string().uuid({ message: "Select a subcategory" }),
  hsCode: nullableShortString(25, "HS code cannot exceed 25 characters"),
  incoterms: z
    .array(incotermQuoteSchema)
    .min(1, "Add at least one incoterm quote.")
    .max(5, "Limit to five incoterm quotes."),
  removedIncotermIds: z.array(z.string().uuid()).optional().default([]),
  moq: positiveInteger,
  cartonsPerMoq: nullableNumber({ min: 0 }),
  palletsPerMoq: nullableNumber({ min: 0 }),
  containers20ft: nullableNumber({ min: 0 }),
  containers40ft: nullableNumber({ min: 0 }),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

