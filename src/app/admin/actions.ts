"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createAdminExpression,
  archiveExpression,
  getExpression,
  unarchiveExpression,
  updateTranslationDraft,
  updateExpression,
  setExpressionAudio,
  type ExpressionInput,
  type ReviewStatus,
  type TranslationStatus,
} from "@/lib/db";
import { generateTranslationDraft, translationFields, type TranslationField, type TranslationProvider } from "@/lib/translation";
import { requireAdmin } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { del as deleteBlob, put } from "@vercel/blob";

const translationStatuses = new Set<TranslationStatus>(["missing", "partly_missing", "draft", "translated", "reviewed"]);
const reviewStatuses = new Set<ReviewStatus>(["unreviewed", "needs_review", "approved", "rejected"]);

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

const audioExtensions: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
};

async function saveAudioFile(id: number, file: File) {
  if (!file.size) return "";
  if (!audioExtensions[file.type]) throw new Error("Upload an MP3, WAV, OGG, WebM, or M4A audio file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Audio files must be smaller than 15 MB.");
  return saveAudioBytes(id, Buffer.from(await file.arrayBuffer()), audioExtensions[file.type]);
}

async function saveAudioBytes(id: number, bytes: Buffer, extension = ".mp3") {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`expressions/${id}/${randomUUID()}${extension}`, bytes, {
      access: "public",
      addRandomSuffix: false,
      contentType: extension === ".mp3" ? "audio/mpeg" : `audio/${extension.slice(1)}`,
    });
    return blob.url;
  }
  const directory = path.join(process.cwd(), "public", "audio");
  await fs.mkdir(directory, { recursive: true });
  const filename = `${id}-${randomUUID()}${extension}`;
  await fs.writeFile(path.join(directory, filename), bytes);
  return `/audio/${filename}`;
}

async function removeAudioFile(audioUrl: string) {
  if (audioUrl.startsWith("http")) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await deleteBlob(audioUrl);
      } catch {
        // The database reference is still removed if a previously deleted blob is missing.
      }
    }
    return;
  }
  if (!audioUrl.startsWith("/audio/")) return;
  await fs.rm(path.join(process.cwd(), "public", audioUrl.slice("/audio/".length)), { force: true });
}

function expressionInput(formData: FormData): ExpressionInput {
  const translationStatus = text(formData, "translationStatus") as TranslationStatus;
  const reviewStatus = text(formData, "reviewStatus") as ReviewStatus;
  return {
    icelandic: text(formData, "icelandic"),
    meaning: text(formData, "meaning"),
    literal: text(formData, "literal"),
    why: text(formData, "why"),
    audioUrl: text(formData, "audioUrl"),
    source: text(formData, "source") || "Personal",
    category: text(formData, "category") || "Expressions",
    translationStatus: translationStatuses.has(translationStatus) ? translationStatus : "missing",
    reviewStatus: reviewStatuses.has(reviewStatus) ? reviewStatus : "unreviewed",
    adminNotes: text(formData, "adminNotes"),
  };
}

export async function saveExpressionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const existing = await getExpression(id);
  const input = expressionInput(formData);
  if (!input.icelandic) throw new Error("The Icelandic expression is required.");
  const oldAudioUrl = existing?.audioUrl ?? "";
  let audioUrl = existing?.audioUrl ?? input.audioUrl;
  if (formData.get("removeAudio") === "on") audioUrl = "";
  const audio = formData.get("audio");
  if (audio instanceof File && audio.size > 0) audioUrl = await saveAudioFile(id, audio);
  input.audioUrl = audioUrl;
  await updateExpression(id, input);
  if (oldAudioUrl && oldAudioUrl !== audioUrl) await removeAudioFile(oldAudioUrl);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/${id}?saved=1`);
}

export async function createExpressionAction(formData: FormData) {
  await requireAdmin();
  const input = expressionInput(formData);
  if (!input.icelandic) throw new Error("The Icelandic expression is required.");
  const id = await createAdminExpression(input);
  const audio = formData.get("audio");
  if (audio instanceof File && audio.size > 0) await setExpressionAudio(id, await saveAudioFile(id, audio));
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/${id}?created=1`);
}

export async function archiveExpressionAction(id: number) {
  await requireAdmin();
  await archiveExpression(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/archive");
  revalidatePath("/admin/statistics");
  return { ok: true };
}

export async function unarchiveExpressionAction(id: number) {
  await requireAdmin();
  await unarchiveExpression(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/archive");
  revalidatePath("/admin/statistics");
  return { ok: true };
}

export async function generateAudioAction(id: number) {
  await requireAdmin();
  const apiKey = process.env.GOOGLE_TTS_API_KEY?.trim();
  const phrase = await getExpression(id);
  if (!apiKey) return { ok: false, error: "GOOGLE_TTS_API_KEY is not configured." };
  if (!phrase) return { ok: false, error: "Expression not found." };

  try {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { text: phrase.icelandic },
        voice: { languageCode: "is-IS", ssmlGender: "NEUTRAL" },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });
    const payload = await response.json() as { audioContent?: string; error?: { message?: string } };
    if (!response.ok || !payload.audioContent) return { ok: false, error: payload.error?.message ?? "Google Text-to-Speech failed." };
    const bytes = Buffer.from(payload.audioContent, "base64");
    if (bytes.length > 15 * 1024 * 1024) return { ok: false, error: "Generated audio is larger than 15 MB." };
    const audioUrl = await saveAudioBytes(id, bytes);
    await setExpressionAudio(id, audioUrl);
    if (phrase.audioUrl && phrase.audioUrl !== audioUrl) await removeAudioFile(phrase.audioUrl);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/admin/${id}`);
    revalidatePath("/admin/archive");
    return { ok: true, audioUrl };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 180) : "Google Text-to-Speech failed." };
  }
}

export async function translateExpressionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const provider = String(formData.get("provider")) as TranslationProvider;
  const fields = formData.getAll("fields").filter((field): field is TranslationField => typeof field === "string" && translationFields.includes(field as TranslationField));
  if (provider !== "openai" && provider !== "gemini") redirect(`/admin/${id}?error=Invalid+AI+provider`);
  const phrase = await getExpression(id);
  if (!phrase) redirect("/admin?error=Expression+not+found");

  try {
    const draft = await generateTranslationDraft(phrase.icelandic, provider, fields.length ? fields : translationFields);
    await updateTranslationDraft(id, draft, draft.model);
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
  await requireAdmin();
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
      const phrase = await getExpression(id);
      if (!phrase) throw new Error(`Expression ${id} not found`);
      const draft = await generateTranslationDraft(phrase.icelandic, provider);
      await updateTranslationDraft(id, draft, draft.model);
    }));
    translated += results.filter((result) => result.status === "fulfilled").length;
    failed += results.filter((result) => result.status === "rejected").length;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/statistics");
  redirect(withBatchResult(returnTo, translated, failed));
}

export async function translateOneExpressionAction(id: number, provider: TranslationProvider, fields: TranslationField[] = translationFields) {
  await requireAdmin();
  if (provider !== "openai" && provider !== "gemini") return { ok: false, error: "Invalid AI provider" };
  const phrase = await getExpression(id);
  if (!phrase) return { ok: false, error: "Expression not found" };
  try {
    const draft = await generateTranslationDraft(phrase.icelandic, provider, fields.length ? fields : translationFields);
    await updateTranslationDraft(id, draft, draft.model);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 180) : "Translation failed" };
  }
}

export async function inviteUserAction(formData: FormData) {
  await requireAdmin();
  const email = text(formData, "email").toLowerCase();
  if (!email) redirect("/admin/users?error=Email+is+required");
  const client = await clerkClient();
  try {
    await client.invitations.createInvitation({ emailAddress: email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite user";
    redirect(`/admin/users?error=${encodeURIComponent(message.slice(0, 180))}`);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?invited=1");
}

export async function reinviteUserAction(formData: FormData) {
  await requireAdmin();
  const invitationId = String(formData.get("invitationId") ?? "");
  const email = text(formData, "email");
  if (!invitationId || !email) throw new Error("Invitation not found");
  const client = await clerkClient();
  try {
    await client.invitations.revokeInvitation(invitationId);
  } catch {
    // Already revoked or expired; still send a fresh invitation below.
  }
  try {
    await client.invitations.createInvitation({ emailAddress: email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resend invitation";
    redirect(`/admin/users?error=${encodeURIComponent(message.slice(0, 180))}`);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?resent=1");
}

export async function setUserApprovalAction(formData: FormData) {
  const access = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const approved = String(formData.get("approved") ?? "") === "true";
  if (!userId) throw new Error("User not found");
  if (userId === access.userId && !approved) throw new Error("You cannot revoke your own access.");
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { publicMetadata: { approved } });
  revalidatePath("/admin/users");
}

function withBatchResult(returnTo: string, translated: number, failed: number, error?: string) {
  const [pathname, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);
  params.set("batchTranslated", String(translated));
  params.set("batchFailed", String(failed));
  if (error) params.set("batchError", error);
  return `${pathname}?${params.toString()}`;
}
