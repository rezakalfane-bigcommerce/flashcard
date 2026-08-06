"use server";

import { revalidatePath } from "next/cache";
import { createPhrase, getDashboardData, reviewPhrase, setStudyLevel } from "@/lib/db";
import { requireAdmin, requireApprovedUser } from "@/lib/auth";

export async function addPhrase(formData: FormData) {
  await requireAdmin();
  const icelandic = String(formData.get("icelandic") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  if (!icelandic || !meaning) return;

  await createPhrase({
    icelandic,
    meaning,
    literal: String(formData.get("literal") ?? "").trim(),
    why: String(formData.get("why") ?? "").trim(),
    source: String(formData.get("source") ?? "Personal").trim() || "Personal",
    category: String(formData.get("category") ?? "Everyday").trim() || "Everyday",
  });
  revalidatePath("/");
}

export async function saveReview(id: number, remembered: boolean) {
  const access = await requireApprovedUser();
  if (!access.approved) throw new Error("Account pending approval");
  await reviewPhrase(access.userId, id, remembered);
  revalidatePath("/");
}

export async function changeLevel(level: number) {
  const access = await requireApprovedUser();
  if (!access.approved) throw new Error("Account pending approval");
  const currentLevel = (await getDashboardData(access.userId)).study.currentLevel;
  if (!access.isAdmin && level > currentLevel + 1) throw new Error("Complete the current level first");
  await setStudyLevel(access.userId, level);
  revalidatePath("/");
}
