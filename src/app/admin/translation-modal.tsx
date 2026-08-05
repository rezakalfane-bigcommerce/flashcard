"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { translateExpressionAction } from "./actions";
import type { TranslationField, TranslationProvider } from "@/lib/translation";

const fields: Array<{ id: TranslationField; label: string; description: string }> = [
  { id: "meaning", label: "Meaning", description: "Natural English equivalent" },
  { id: "literal", label: "Literal translation", description: "Close word-for-word rendering" },
  { id: "why", label: "Why / context", description: "Usage, imagery, or etymology" },
];

export function TranslationModal({ id, missingFields }: { id: number; missingFields: TranslationField[] }) {
  const [provider, setProvider] = useState<TranslationProvider | null>(null);
  const defaults = missingFields.length ? missingFields : fields.map((field) => field.id);
  return <>
    <div className="grid gap-3"><button type="button" onClick={() => setProvider("openai")} className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">Translate with OpenAI</button><button type="button" onClick={() => setProvider("gemini")} className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">Translate with Gemini</button></div>
    {provider && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15292d]/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProvider(null); }}>
      <div className="w-full max-w-lg rounded-[2rem] border border-[#1d4d58]/15 bg-[#f4f8f7] p-6 text-[#15292d] shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="translation-modal-title">
        <div className="flex items-start justify-between gap-5"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">{provider === "openai" ? "OpenAI" : "Gemini"} draft</p><h2 id="translation-modal-title" className="display mt-2 text-4xl">Choose what to generate</h2></div><button type="button" onClick={() => setProvider(null)} aria-label="Close translation dialog" className="rounded-full px-3 py-1 text-2xl leading-none text-[#78979c] hover:bg-[#d9eeec]">×</button></div>
        <p className="mt-4 text-sm leading-6 text-[#52747a]">Existing fields remain untouched. Empty fields are preselected, so you can repair only the missing piece.</p>
        <form action={translateExpressionAction} className="mt-6"><input type="hidden" name="id" value={id} /><input type="hidden" name="provider" value={provider} /><div className="space-y-3">{fields.map((field) => <label key={field.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#1d4d58]/10 bg-white px-4 py-3 hover:border-[#1d4d58]/30"><input type="checkbox" name="fields" value={field.id} defaultChecked={defaults.includes(field.id)} className="mt-1 h-4 w-4 accent-[#1d4d58]" /><span><strong className="block text-sm">{field.label}</strong><span className="text-xs text-[#78979c]">{field.description}</span></span></label>)}</div><div className="mt-7 flex justify-end gap-3 border-t border-[#1d4d58]/10 pt-5"><button type="button" onClick={() => setProvider(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#52747a] hover:bg-[#d9eeec]">Cancel</button><GenerateButton /></div></form>
      </div>
    </div>}
  </>;
}

function GenerateButton() { const { pending } = useFormStatus(); return <button disabled={pending} className="rounded-xl bg-[#15292d] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4d58] disabled:opacity-50">{pending ? "Generating…" : "Generate selected fields"}</button>; }
