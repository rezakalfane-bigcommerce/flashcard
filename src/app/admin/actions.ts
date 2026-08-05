"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminExpression,
  getExpression,
  updateTranslationDraft,
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
    updateTranslationDraft(id, draft, draft.model);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Translation failed";
    redirect(`/admin/${id}?error=${encodeURIComponent(message.slice(0, 180))}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/statistics");
  redirect(`/admin/${id}?generated=${provider}`);
}

export async function translateExpressionsAction(formData: FormData) {
  const provider = String(formData.get("provider")) as TranslationProvider;
  const requestedIds = formData.getAll("ids").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const ids = [...new Set(requestedIds)].slice(0, 50);
  const rawReturnTo = String(formData.get("returnTo") ?? "/admin");
  const returnTo = rawReturnTo === "/admin" || rawReturnTo.startsWith("/admin?") || rawReturnTo.startsWith("/admin/") ? rawReturnTo : "/admin";

  if (provider !== "openai" && provider !== "gemini") redirect(withBatchResult(returnTo, 0, ids.length, "Invalid AI provider"));
  if (ids.length === 0) redirect(withBatchResult(returnTo, 0, 0, "Select at least one expression"));

  let translated = 0;
  let failed = 0;
  for (let offset = 0; offset < ids.length; offset += 3) {
    const group = ids.slice(offset, offset + 3);
    const results = await Promise.allSettled(group.map(async (id) => {
      const phrase = getExpression(id);
      if (!phrase) throw new Error(`Expression ${id} not found`);
      const draft = await generateTranslationDraft(phrase.icelandic, provider);
      updateTranslationDraft(id, draft, draft.model);
    }));
    translated += results.filter((result) => result.status === "fulfilled").length;
    failed += results.filter((result) => result.status === "rejected").length;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/statistics");
  redirect(withBatchResult(returnTo, translated, failed));
}

function withBatchResult(returnTo: string, translated: number, failed: number, error?: string) {
  const [pathname, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);
  params.set("batchTranslated", String(translated));
  params.set("batchFailed", String(failed));
  if (error) params.set("batchError", error);
  return `${pathname}?${params.toString()}`;
}
