import Link from "next/link";
import type { Phrase } from "@/lib/db";
import { createExpressionAction, saveExpressionAction } from "./actions";
import { TranslationModal } from "./translation-modal";
import type { TranslationField } from "@/lib/translation";
import { ArchiveControl } from "./archive-control";
import { AudioGenerationControl } from "./audio-generation-control";

type Notice = { saved?: string; created?: string; generated?: string; error?: string };

export function ExpressionForm({ phrase, notice = {} }: { phrase?: Phrase; notice?: Notice }) {
  const isNew = !phrase;
  return (
    <main className="min-h-screen bg-[#edf4f2] px-4 py-6 text-[#15292d] md:px-8">
      <header className="mx-auto flex max-w-6xl items-end justify-between gap-5 border-b border-[#1d4d58]/20 pb-6"><div><Link href={phrase?.archivedAt ? "/admin/archive" : "/admin"} className="mono text-xs text-[#78979c] hover:text-[#1d4d58]">← {phrase?.archivedAt ? "Archived expressions" : "All expressions"}</Link><p className="mono mt-5 text-[10px] uppercase tracking-[.22em] text-[#78979c]">{isNew ? "New database record" : `Expression ${phrase.id}`}</p><h1 className="display mt-1 max-w-4xl text-4xl sm:text-5xl">{isNew ? "Add an expression" : phrase.icelandic}</h1></div>{phrase && <div className="flex flex-wrap items-end justify-end gap-4 text-right"><div><p className="mono text-xs">Level {phrase.level} · Complexity {phrase.complexity}</p><p className="mt-1 text-xs text-[#78979c]">Updated {new Date(phrase.updatedAt).toLocaleDateString()}</p></div><ArchiveControl id={phrase.id} phrase={phrase.icelandic} archived={Boolean(phrase.archivedAt)} /></div>}</header>
      <div className="mx-auto grid max-w-6xl gap-6 py-7 lg:grid-cols-[1fr_310px]">
        <section className="rounded-3xl border border-[#1d4d58]/15 bg-white p-6 shadow-sm sm:p-8">
          {(notice.saved || notice.created || notice.generated) && <p className="mb-6 rounded-xl bg-[#b7d86a]/25 px-4 py-3 text-sm font-semibold">{notice.generated ? `Draft generated with ${notice.generated}. Review before approving.` : "Expression saved."}</p>}
          {notice.error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{notice.error}</p>}
          <form action={isNew ? createExpressionAction : saveExpressionAction} encType="multipart/form-data" className="space-y-5">
            {phrase && <input type="hidden" name="id" value={phrase.id} />}
            {phrase && <input type="hidden" name="audioUrl" value={phrase.audioUrl} />}
            <Field label="Icelandic expression" name="icelandic" defaultValue={phrase?.icelandic} required />
            <Field label="English meaning" name="meaning" defaultValue={phrase?.meaning} />
            <Field label="Literal translation" name="literal" defaultValue={phrase?.literal} />
            <TextArea label="Why / etymology / context" name="why" defaultValue={phrase?.why} rows={6} />
            <AudioField audioUrl={phrase?.audioUrl} id={phrase?.id} phrase={phrase?.icelandic} />
            <div className="grid gap-5 sm:grid-cols-2"><Field label="Source" name="source" defaultValue={phrase?.source ?? "Personal"} /><Field label="Category" name="category" defaultValue={phrase?.category ?? "Expressions"} /></div>
            <div className="grid gap-5 sm:grid-cols-2"><SelectField label="Translation status" name="translationStatus" defaultValue={phrase?.translationStatus ?? "missing"} options={["missing", "partly_missing", "draft", "translated", "reviewed"]} /><SelectField label="Editorial review" name="reviewStatus" defaultValue={phrase?.reviewStatus ?? "unreviewed"} options={["unreviewed", "needs_review", "approved", "rejected"]} /></div>
            <TextArea label="Private admin notes" name="adminNotes" defaultValue={phrase?.adminNotes} rows={4} />
            <div className="flex justify-end border-t border-[#1d4d58]/10 pt-6"><button className="rounded-full bg-[#15292d] px-7 py-3 font-semibold text-white hover:bg-[#1d4d58]">{isNew ? "Create expression" : "Save changes"}</button></div>
          </form>
        </section>
        <aside className="space-y-5">
          {!isNew && <section className="rounded-3xl bg-[#15292d] p-6 text-white"><p className="mono text-[10px] uppercase tracking-[.18em] text-white/50">AI translation</p><h2 className="display mt-2 text-3xl">Create a draft</h2><p className="mt-3 text-sm leading-6 text-white/60">Choose the fields to generate. Existing text is preserved unless you select that field.</p><div className="mt-6"><TranslationModal id={phrase.id} missingFields={([!phrase.meaning && "meaning", !phrase.literal && "literal", !phrase.why && "why"].filter(Boolean) as TranslationField[])} /></div><p className="mono mt-4 text-[9px] leading-4 text-white/35">Via Vercel AI Gateway. Human approval remains required.</p></section>}
          <section className="rounded-3xl border border-[#1d4d58]/15 bg-white/70 p-6"><p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">Record health</p><dl className="mt-5 space-y-3 text-sm"><Meta label="Translation" value={phrase?.translationStatus ?? "missing"} /><Meta label="Review" value={phrase?.reviewStatus ?? "unreviewed"} /><Meta label="Generated by" value={phrase?.translatedBy || "—"} /><Meta label="Reviews" value={String(phrase?.reviews ?? 0)} /><Meta label="Mastery" value={String(phrase?.mastery ?? 0)} /></dl></section>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="block text-sm font-semibold">{label}<input {...props} className="mt-2 w-full rounded-xl border border-[#1d4d58]/20 bg-[#f9fbfa] px-4 py-3 font-normal outline-none focus:border-[#1d4d58] focus:ring-2 focus:ring-[#b7d86a]" /></label>; }
function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) { return <label className="block text-sm font-semibold">{label}<textarea {...props} className="mt-2 w-full resize-y rounded-xl border border-[#1d4d58]/20 bg-[#f9fbfa] px-4 py-3 font-normal leading-6 outline-none focus:border-[#1d4d58] focus:ring-2 focus:ring-[#b7d86a]" /></label>; }
function AudioField({ audioUrl, id, phrase }: { audioUrl?: string; id?: number; phrase?: string }) {
  return <fieldset className="rounded-2xl border border-[#1d4d58]/15 bg-[#f9fbfa] p-4"><legend className="px-1 text-sm font-semibold">Icelandic audio</legend><p className="mt-1 text-xs leading-5 text-[#78979c]">Upload a short pronunciation recording. MP3, WAV, OGG, WebM, or M4A, up to 15 MB.</p>{audioUrl && <div className="mt-3 flex flex-wrap items-center gap-3"><audio controls preload="metadata" src={audioUrl} className="h-9 max-w-full" /><label className="flex items-center gap-2 text-xs text-[#52747a]"><input type="checkbox" name="removeAudio" className="h-4 w-4 accent-[#1d4d58]" />Remove current audio</label></div>}{id && phrase && <div className="mt-4"><AudioGenerationControl id={id} phrase={phrase} hasAudio={Boolean(audioUrl)} /></div>}<input type="file" name="audio" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a" className="mt-3 block w-full rounded-xl border border-dashed border-[#1d4d58]/25 bg-white px-3 py-3 text-sm text-[#52747a] file:mr-3 file:rounded-lg file:border-0 file:bg-[#d9eeec] file:px-3 file:py-2 file:font-semibold file:text-[#1d4d58] hover:file:bg-[#b7d86a]" /></fieldset>;
}
function SelectField({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) { return <label className="block text-sm font-semibold">{label}<select {...props} className="mt-2 w-full rounded-xl border border-[#1d4d58]/20 bg-[#f9fbfa] px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-[#b7d86a]">{options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}</select></label>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-[#1d4d58]/10 pb-3"><dt className="text-[#78979c]">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>; }
