"use server";

import { getCurrentServerUser } from "@/lib/auth/server";

type GenerateProductDescriptionSuccess = {
  success: true;
  description: string;
};

type GenerateProductDescriptionError = {
  error: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/v1/chat/completions";

export async function generateProductDescriptionAction(
  formData: FormData,
): Promise<GenerateProductDescriptionSuccess | GenerateProductDescriptionError> {
  const user = await getCurrentServerUser();
  if (!user) {
    return { error: "You must be signed in to generate descriptions." };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("[generateProductDescriptionAction] Missing DEEPSEEK_API_KEY");
    return { error: "AI description service is not configured." };
  }

  const productName = formData.get("productName");
  if (typeof productName !== "string" || !productName.trim()) {
    return { error: "Provide a product name before generating a description." };
  }

  const imageValue = formData.get("image");
  if (!(imageValue instanceof File)) {
    return { error: "Attach a product image to generate a description." };
  }

  if (imageValue.size <= 0) {
    return { error: "The uploaded image is empty." };
  }

  if (imageValue.size > MAX_IMAGE_BYTES) {
    return { error: "Images must be 5MB or smaller to generate a description." };
  }

  let base64Image: string;
  try {
    const arrayBuffer = await imageValue.arrayBuffer();
    base64Image = Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error("[generateProductDescriptionAction] Failed to read image file", error);
    return { error: "We couldn't read the image you uploaded. Try again or use a different file." };
  }

  const mimeType = imageValue.type || "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const prompt = [
    "You are a merchandising copywriter helping sellers describe their products.",
    `Write a concise product description (80-120 words) for the product named "${productName.trim()}".`,
    "Use details you can infer from the attached product photo. Focus on materials, primary use, and key selling points.",
    "Keep the tone professional and informative, avoid marketing buzzwords, and do not invent features you cannot see.",
  ].join(" ");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that drafts concise, factual e-commerce product descriptions.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      console.error("[generateProductDescriptionAction] API error", response.status, errorPayload);
      return {
        error:
          "We couldn't generate a description right now. Please try again in a moment or write it manually.",
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const description = payload?.choices?.[0]?.message?.content?.trim();
    if (!description) {
      console.error("[generateProductDescriptionAction] Empty response", payload);
      return {
        error:
          "The AI couldn't produce a description from that image. Try another image or write it manually.",
      };
    }

    return { success: true, description };
  } catch (error) {
    console.error("[generateProductDescriptionAction] Unexpected failure", error);
    return {
      error:
        "Something went wrong while generating the description. Check your connection and try again.",
    };
  }
}

