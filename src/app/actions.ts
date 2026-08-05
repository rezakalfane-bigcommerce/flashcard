"use server";

import { revalidatePath } from "next/cache";
import { createPhrase, reviewPhrase, setStudyLevel } from "@/lib/db";

export async function addPhrase(formData: FormData) {
  const icelandic = String(formData.get("icelandic") ?? "").trim();
  const meaning = String(formData.get("meaning") ?? "").trim();
  if (!icelandic || !meaning) return;

  createPhrase({
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
  reviewPhrase(id, remembered);
  revalidatePath("/");
}

export async function changeLevel(level: number) {
  setStudyLevel(level);
  revalidatePath("/");
}
