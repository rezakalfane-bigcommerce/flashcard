"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { translateExpressionsAction } from "./actions";
import type { Phrase } from "@/lib/db";

const selectionLimit = 50;

export function BulkExpressionTable({ phrases, returnTo }: { phrases: Phrase[]; returnTo: string }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selectableCount = Math.min(phrases.length, selectionLimit);
  const selectedVisibleCount = phrases.filter((phrase) => selected.has(phrase.id)).length;
  const allVisibleSelected = selectableCount > 0 && selectedVisibleCount === selectableCount;

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < selectionLimit) next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    if (allVisibleSelected) return setSelected(new Set());
    setSelected(new Set(phrases.slice(0, selectionLimit).map((phrase) => phrase.id)));
  }

  return (
    <form action={translateExpressionsAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      {[...selected].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="mono bg-[#1d4d58] text-[10px] uppercase tracking-[.14em] text-white/70"><tr><th className="w-12 px-5 py-4"><input type="checkbox" aria-label={`Select up to ${selectionLimit} visible expressions`} checked={allVisibleSelected} onChange={toggleVisible} className="h-4 w-4 accent-[#b7d86a]" /></th><th className="px-2 py-4">Expression</th><th className="px-4 py-4">English meaning</th><th className="px-4 py-4">Level</th><th className="px-4 py-4">Score</th><th className="px-4 py-4">Source</th><th className="px-4 py-4">Translation</th><th className="px-4 py-4">Review</th><th className="px-4 py-4" /></tr></thead>
          <tbody>{phrases.map((phrase) => {
            const checked = selected.has(phrase.id);
            const disabled = !checked && selected.size >= selectionLimit;
            return <tr key={phrase.id} className={`border-t border-[#1d4d58]/10 align-top hover:bg-[#d9eeec]/35 ${checked ? "bg-[#b7d86a]/10" : ""}`}><td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${phrase.icelandic}`} checked={checked} disabled={disabled} onChange={() => toggle(phrase.id)} className="h-4 w-4 accent-[#1d4d58] disabled:opacity-30" /></td><td className="display max-w-sm px-2 py-4 text-lg font-medium">{phrase.icelandic}</td><td className="max-w-sm px-4 py-4 text-[#1d4d58]/75">{phrase.meaning || <span className="italic text-[#78979c]">Not translated</span>}</td><td className="mono px-4 py-4 text-xs">{phrase.level}</td><td className="mono px-4 py-4 text-xs">{phrase.complexity}</td><td className="px-4 py-4 text-xs">{phrase.source}</td><td className="px-4 py-4"><Status value={phrase.translationStatus} /></td><td className="px-4 py-4"><Status value={phrase.reviewStatus} /></td><td className="px-4 py-4 text-right"><Link href={`/admin/${phrase.id}`} className="font-semibold text-[#1d4d58] underline decoration-[#b7d86a] decoration-2 underline-offset-4">Edit</Link></td></tr>;
          })}</tbody>
        </table>
      </div>
      {selected.size > 0 && <div className="sticky bottom-4 z-10 mx-4 mb-4 mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#15292d] px-5 py-4 text-white shadow-[0_16px_45px_rgba(21,41,45,.28)]">
        <div><p className="font-semibold">{selected.size} expression{selected.size === 1 ? "" : "s"} selected</p><p className="mono mt-1 text-[9px] uppercase tracking-[.12em] text-white/45">Saved as drafts · human review required · maximum {selectionLimit}</p></div>
        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setSelected(new Set())} className="rounded-xl px-4 py-2 text-sm text-white/65 hover:bg-white/10 hover:text-white">Clear</button><TranslateButton provider="openai">Translate with OpenAI</TranslateButton><TranslateButton provider="gemini">Translate with Gemini</TranslateButton></div>
      </div>}
    </form>
  );
}

function TranslateButton({ provider, children }: { provider: "openai" | "gemini"; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="provider" value={provider} disabled={pending} onClick={(event) => { if (!window.confirm(`Generate new ${provider === "openai" ? "OpenAI" : "Gemini"} drafts for the selected expressions? Existing English text will be replaced.`)) event.preventDefault(); }} className="rounded-xl bg-[#b7d86a] px-4 py-2 text-sm font-semibold text-[#15292d] hover:bg-[#c6e57c] disabled:cursor-wait disabled:opacity-50">{pending ? "Translating…" : children}</button>;
}

function Status({ value }: { value: string }) { const active = value === "approved" || value === "reviewed"; const attention = value === "needs_review" || value === "draft"; return <span className={`mono inline-flex rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[.1em] ${active ? "bg-[#b7d86a]/35 text-[#1d4d58]" : attention ? "bg-amber-100 text-amber-800" : "bg-[#78979c]/10 text-[#78979c]"}`}>{value.replace("_", " ")}</span>; }
