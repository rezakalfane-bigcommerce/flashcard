"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { archiveExpressionAction, generateAudioAction, translateExpressionsAction, translateOneExpressionAction, unarchiveExpressionAction } from "./actions";
import { useEscapeKey } from "@/components/use-escape-key";
import { ArchiveConfirmation } from "./archive-confirmation";
import type { Phrase } from "@/lib/db";
import type { TranslationField } from "@/lib/translation";

const selectionLimit = 50;
const translationFields: Array<{ id: TranslationField; label: string; description: string }> = [
  { id: "meaning", label: "Meaning", description: "Natural English equivalent" },
  { id: "literal", label: "Literal translation", description: "Close word-for-word rendering" },
  { id: "why", label: "Why / context", description: "Usage, imagery, or etymology" },
];

export function BulkExpressionTable({ phrases, returnTo, archived = false }: { phrases: Phrase[]; returnTo: string; archived?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingProvider, setPendingProvider] = useState<"openai" | "gemini" | null>(null);
  const [providerChoice, setProviderChoice] = useState<"openai" | "gemini" | null>(null);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [audioPending, setAudioPending] = useState(false);
  const [audioCompleted, setAudioCompleted] = useState(0);
  const [audioFailed, setAudioFailed] = useState(0);
  const [audioConfirming, setAudioConfirming] = useState(false);
  const [audioResult, setAudioResult] = useState<{ completed: number; failed: number } | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<{ id: number; phrase: string } | null>(null);
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

  async function startBatch(provider: "openai" | "gemini", fields: TranslationField[]) {
    if (pendingProvider || !selected.size) return;
    setPendingProvider(provider);
    setCompleted(0);
    setFailed(0);
    const ids = [...selected];
    let translated = 0;
    let errors = 0;
    for (let offset = 0; offset < ids.length; offset += 3) {
      const group = ids.slice(offset, offset + 3);
      const results = await Promise.all(group.map((id) => translateOneExpressionAction(id, provider, fields)));
      translated += results.filter((result) => result.ok).length;
      errors += results.filter((result) => !result.ok).length;
      setCompleted((count) => count + results.length);
      setFailed(errors);
    }
    const [pathname, query = ""] = returnTo.split("?");
    const params = new URLSearchParams(query);
    params.set("batchTranslated", String(translated));
    params.set("batchFailed", String(errors));
    setPendingProvider(null);
    setProviderChoice(null);
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function startAudioBatch() {
    if (audioPending || pendingProvider || !selected.size) return;
    setAudioConfirming(false);
    setAudioPending(true);
    setAudioResult(null);
    setAudioCompleted(0);
    setAudioFailed(0);
    const ids = [...selected];
    let completedCount = 0;
    let failedCount = 0;
    for (let offset = 0; offset < ids.length; offset += 3) {
      const results = await Promise.all(ids.slice(offset, offset + 3).map((id) => generateAudioAction(id)));
      completedCount += results.filter((result) => result.ok).length;
      failedCount += results.filter((result) => !result.ok).length;
      setAudioCompleted((count) => count + results.length);
      setAudioFailed(failedCount);
    }
    setAudioPending(false);
    setAudioResult({ completed: completedCount, failed: failedCount });
    router.refresh();
  }

  async function toggleArchive(id: number) {
    if (archivingId) return;
    setArchivingId(id);
    if (archived) await unarchiveExpressionAction(id);
    else await archiveExpressionAction(id);
    setArchivingId(null);
    setConfirming(null);
    router.refresh();
  }

  return (
    <form action={translateExpressionsAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      {[...selected].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="mono bg-[#1d4d58] text-[10px] uppercase tracking-[.14em] text-white/70"><tr><th className="w-12 px-5 py-4"><input type="checkbox" aria-label={`Select up to ${selectionLimit} visible expressions`} checked={allVisibleSelected} onChange={toggleVisible} className="h-4 w-4 accent-[#b7d86a]" /></th><th className="w-14 px-2 py-4 text-center">Audio</th><th className="px-2 py-4">Expression</th><th className="px-4 py-4">English meaning</th><th className="px-4 py-4">Level</th><th className="px-4 py-4">Score</th><th className="px-4 py-4">Source</th><th className="px-4 py-4">Translation</th><th className="px-4 py-4">Review</th><th className="px-4 py-4" /></tr></thead>
          <tbody>{phrases.map((phrase, phraseIndex) => {
            const checked = selected.has(phrase.id);
            const disabled = !checked && selected.size >= selectionLimit;
            const editParams = new URLSearchParams({ returnTo, ...(phrases[phraseIndex - 1] ? { previous: String(phrases[phraseIndex - 1].id) } : {}), ...(phrases[phraseIndex + 1] ? { next: String(phrases[phraseIndex + 1].id) } : {}) });
            return <tr key={phrase.id} className={`border-t border-[#1d4d58]/10 align-top hover:bg-[#d9eeec]/35 ${checked ? "bg-[#b7d86a]/10" : ""}`}><td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${phrase.icelandic}`} checked={checked} disabled={disabled} onChange={() => toggle(phrase.id)} className="h-4 w-4 accent-[#1d4d58] disabled:opacity-30" /></td><td className="w-14 px-2 py-4 text-center align-middle">{phrase.audioUrl && <ListAudioButton audioUrl={phrase.audioUrl} phrase={phrase.icelandic} />}</td><td className="display max-w-sm px-2 py-4 text-lg font-medium">{phrase.icelandic}</td><td className="max-w-sm px-4 py-4 text-[#1d4d58]/75">{phrase.meaning || <span className="italic text-[#78979c]">Not translated</span>}</td><td className="mono px-4 py-4 text-xs">{phrase.level}</td><td className="mono px-4 py-4 text-xs">{phrase.complexity}</td><td className="px-4 py-4 text-xs">{phrase.source}</td><td className="px-4 py-4"><Status value={phrase.translationStatus} /></td><td className="px-4 py-4"><Status value={phrase.reviewStatus} /></td><td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-3 whitespace-nowrap"><Link href={`/admin/${phrase.id}?${editParams.toString()}`} className="font-semibold text-[#1d4d58] underline decoration-[#b7d86a] decoration-2 underline-offset-4">Edit</Link><button type="button" onClick={() => setConfirming({ id: phrase.id, phrase: phrase.icelandic })} disabled={archivingId !== null} className="text-xs font-semibold text-[#78979c] underline decoration-[#b7d86a] underline-offset-4 hover:text-[#1d4d58] disabled:opacity-40">{archivingId === phrase.id ? "Saving…" : archived ? "Un-archive" : "Archive"}</button></div></td></tr>;
          })}</tbody>
        </table>
      </div>
      {selected.size > 0 && <div className="relative sticky bottom-4 z-10 mx-4 mb-4 mt-3 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-[#15292d] px-5 py-4 text-white shadow-[0_16px_45px_rgba(21,41,45,.28)]">
        <div><p className="font-semibold">{selected.size} expression{selected.size === 1 ? "" : "s"} selected</p><p className="mono mt-1 text-[9px] uppercase tracking-[.12em] text-white/45">Saved as drafts · human review required · maximum {selectionLimit}</p></div>
        <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={Boolean(pendingProvider) || audioPending} onClick={() => setSelected(new Set())} className="rounded-xl px-4 py-2 text-sm text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-40">Clear</button><TranslateButton provider="openai" pending={pendingProvider === "openai"} disabled={Boolean(pendingProvider) || audioPending} onTranslate={() => setProviderChoice("openai")}>Translate with OpenAI</TranslateButton><TranslateButton provider="gemini" pending={pendingProvider === "gemini"} disabled={Boolean(pendingProvider) || audioPending} onTranslate={() => setProviderChoice("gemini")}>Translate with Gemini</TranslateButton><button type="button" disabled={Boolean(pendingProvider) || audioPending} onClick={() => setAudioConfirming(true)} className="rounded-xl bg-[#b7d86a] px-4 py-2 text-sm font-semibold text-[#15292d] shadow-sm hover:bg-[#c6e57c] disabled:cursor-wait disabled:opacity-50">{audioPending ? "Generating audio…" : "Generate audio"}</button></div>
        {pendingProvider && <BatchProgress count={selected.size} completed={completed} failed={failed} label="Translating" />}
        {audioPending && <BatchProgress count={selected.size} completed={audioCompleted} failed={audioFailed} label="Generating audio" />}
        {audioResult && !audioPending && <p className="absolute inset-x-5 bottom-1 text-right text-[10px] text-white/60">{audioResult.completed} audio file{audioResult.completed === 1 ? "" : "s"} generated{audioResult.failed ? ` · ${audioResult.failed} failed` : ""}</p>}
      </div>}
      {providerChoice && <BatchTranslationModal provider={providerChoice} onCancel={() => setProviderChoice(null)} onGenerate={(fields) => { const provider = providerChoice; setProviderChoice(null); void startBatch(provider, fields); }} />}
      {audioConfirming && <BatchAudioConfirmation count={selected.size} onCancel={() => setAudioConfirming(false)} onConfirm={() => void startAudioBatch()} />}
      {confirming && <ArchiveConfirmation archived={archived} phrase={confirming.phrase} pending={archivingId !== null} onCancel={() => setConfirming(null)} onConfirm={() => void toggleArchive(confirming.id)} />}
    </form>
  );
}

function TranslateButton({ children, pending, disabled, onTranslate }: { provider: "openai" | "gemini"; children: React.ReactNode; pending: boolean; disabled: boolean; onTranslate: () => void }) {
  return <button type="button" disabled={disabled} onClick={onTranslate} className="rounded-xl bg-[#b7d86a] px-4 py-2 text-sm font-semibold text-[#15292d] hover:bg-[#c6e57c] disabled:cursor-wait disabled:opacity-50">{pending ? "Translating…" : children}</button>;
}

function BatchTranslationModal({ provider, onCancel, onGenerate }: { provider: "openai" | "gemini"; onCancel: () => void; onGenerate: (fields: TranslationField[]) => void }) {
  const [fields, setFields] = useState<TranslationField[]>(translationFields.map((field) => field.id));
  useEscapeKey(onCancel);
  function toggle(field: TranslationField) { setFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]); }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15292d]/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="w-full max-w-lg rounded-[2rem] border border-[#1d4d58]/15 bg-[#f4f8f7] p-6 text-[#15292d] shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="batch-translation-modal-title">
      <div className="flex items-start justify-between gap-5"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">{provider === "openai" ? "OpenAI" : "Gemini"} batch draft</p><h2 id="batch-translation-modal-title" className="display mt-2 text-4xl">Choose what to generate</h2></div><button type="button" onClick={onCancel} aria-label="Close translation dialog" className="rounded-full px-3 py-1 text-2xl leading-none text-[#78979c] hover:bg-[#d9eeec]">×</button></div>
      <p className="mt-4 text-sm leading-6 text-[#52747a]">Selected fields are generated for every expression. Existing values in unchecked fields remain untouched.</p>
      <div className="mt-6 space-y-3">{translationFields.map((field) => <label key={field.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#1d4d58]/10 bg-white px-4 py-3 hover:border-[#1d4d58]/30"><input type="checkbox" checked={fields.includes(field.id)} onChange={() => toggle(field.id)} className="mt-1 h-4 w-4 accent-[#1d4d58]" /><span><strong className="block text-sm">{field.label}</strong><span className="text-xs text-[#78979c]">{field.description}</span></span></label>)}</div>
      <div className="mt-7 flex justify-end gap-3 border-t border-[#1d4d58]/10 pt-5"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#52747a] hover:bg-[#d9eeec]">Cancel</button><button type="button" disabled={!fields.length} onClick={() => onGenerate(fields)} className="rounded-xl bg-[#15292d] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4d58] disabled:opacity-40">Generate selected fields</button></div>
    </div>
  </div>;
}

function BatchProgress({ count, completed, failed, label }: { count: number; completed: number; failed: number; label: string }) {
  const percent = Math.round((completed / count) * 100);
  return <div className="absolute inset-x-0 bottom-0 h-8 bg-white/10 px-5" role="progressbar" aria-label={`${label} ${count} selected expressions`} aria-valuemin={0} aria-valuemax={count} aria-valuenow={completed}><div className="flex h-full items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#b7d86a] transition-[width] duration-300" style={{ width: `${percent}%` }} /></div><span className="mono min-w-20 text-right text-[10px] text-white/60">{completed}/{count} · {percent}%{failed ? ` · ${failed} failed` : ""}</span></div></div>;
}

function BatchAudioConfirmation({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: () => void }) {
  useEscapeKey(onCancel);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15292d]/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="w-full max-w-lg rounded-[2rem] border border-[#1d4d58]/15 bg-[#f4f8f7] p-6 text-[#15292d] shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="batch-audio-modal-title">
      <div className="flex items-start justify-between gap-5"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">Google Cloud Text-to-Speech</p><h2 id="batch-audio-modal-title" className="display mt-2 text-4xl">Generate pronunciation audio?</h2></div><button type="button" onClick={onCancel} aria-label="Close audio dialog" className="rounded-full px-3 py-1 text-2xl leading-none text-[#78979c] hover:bg-[#d9eeec]">×</button></div>
      <p className="mt-4 text-sm leading-6 text-[#52747a]">Generate Icelandic MP3 audio for all <strong>{count}</strong> selected expressions. Existing recordings will be replaced and each request uses your Google Cloud quota.</p>
      <div className="mt-7 flex justify-end gap-3 border-t border-[#1d4d58]/10 pt-5"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#52747a] hover:bg-[#d9eeec]">Cancel</button><button type="button" onClick={onConfirm} className="rounded-xl bg-[#15292d] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1d4d58]">Generate audio</button></div>
    </div>
  </div>;
}

function Status({ value }: { value: string }) { const active = value === "approved" || value === "reviewed"; const attention = value === "needs_review" || value === "draft" || value === "partly_missing"; return <span className={`mono inline-flex rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[.1em] ${active ? "bg-[#b7d86a]/35 text-[#1d4d58]" : attention ? "bg-amber-100 text-amber-800" : "bg-[#78979c]/10 text-[#78979c]"}`}>{value.replace("_", " ")}</span>; }

function ListAudioButton({ audioUrl, phrase }: { audioUrl: string; phrase: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }
  return <><button type="button" onClick={toggle} aria-label={`${playing ? "Pause" : "Play"} Icelandic audio for ${phrase}`} title={playing ? "Pause pronunciation" : "Play pronunciation"} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#1d4d58]/20 bg-[#d9eeec] text-[10px] text-[#1d4d58] transition hover:bg-[#b7d86a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b7d86a]">{playing ? "Ⅱ" : "▶"}</button><audio ref={audioRef} src={audioUrl} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /></>;
}
