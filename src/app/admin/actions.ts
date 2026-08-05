"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminExpression,
  getExpression,
  updateExpression,
  type ExpressionInput,
  type ReviewStatus,
  type TranslationStatus,
} from "@/lib/db";
import { generateTranslationDraft, type TranslationProvider } from "@/lib/translation";

const translationStatuses = new Set<TranslationStatus>(["missing", "draft", "translated", "reviewed"]);
const reviewStatuses = new Set<ReviewStatus>(["unreviewed", "needs_review", "approved", "rejected"]);

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function expressionInput(formData: FormData): ExpressionInput {
  const translationStatus = text(formData, "translationStatus") as TranslationStatus;
  const reviewStatus = text(formData, "reviewStatus") as ReviewStatus;
  return {
    icelandic: text(formData, "icelandic"),
    meaning: text(formData, "meaning"),
    literal: text(formData, "literal"),
    why: text(formData, "why"),
    source: text(formData, "source") || "Personal",
    category: text(formData, "category") || "Expressions",
    translationStatus: translationStatuses.has(translationStatus) ? translationStatus : "missing",
    reviewStatus: reviewStatuses.has(reviewStatus) ? reviewStatus : "unreviewed",
    adminNotes: text(formData, "adminNotes"),
  };
}

export async function saveExpressionAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const input = expressionInput(formData);
  if (!input.icelandic) throw new Error("The Icelandic expression is required.");
  updateExpression(id, input);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/${id}?saved=1`);
}

export async function createExpressionAction(formData: FormData) {
  const input = expressionInput(formData);
  if (!input.icelandic) throw new Error("The Icelandic expression is required.");
  const id = createAdminExpression(input);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/${id}?created=1`);
}

export async function translateExpressionAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const provider = String(formData.get("provider")) as TranslationProvider;
  if (provider !== "openai" && provider !== "gemini") redirect(`/admin/${id}?error=Invalid+AI+provider`);
  const phrase = getExpression(id);
  if (!phrase) redirect("/admin?error=Expression+not+found");

  try {
    const draft = await generateTranslationDraft(phrase.icelandic, provider);
    updateExpression(id, {
      icelandic: phrase.icelandic,
      meaning: draft.meaning,
      literal: draft.literal,
      why: draft.why,
      source: phrase.source,
      category: phrase.category,
      translationStatus: "draft",
      reviewStatus: "needs_review",
      adminNotes: phrase.adminNotes,
    }, draft.model);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Translation failed";
    redirect(`/admin/${id}?error=${encodeURIComponent(message.slice(0, 180))}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/${id}?generated=${provider}`);
}
