"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateAudioAction } from "./actions";

export function AudioGenerationControl({ id, phrase, hasAudio }: { id: number; phrase: string; hasAudio: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError("");
    startTransition(async () => {
      const result = await generateAudioAction(id);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else setError(result.error ?? "Google Text-to-Speech failed.");
    });
  }

  return <>
    <button type="button" onClick={() => { setError(""); setOpen(true); }} className="rounded-full border border-[#1d4d58]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1d4d58] hover:border-[#1d4d58]">{hasAudio ? "Regenerate with Google TTS" : "Generate with Google TTS"}</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15292d]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="tts-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">Google Cloud Text-to-Speech</p>
        <h2 id="tts-title" className="display mt-2 text-3xl">Generate Icelandic audio?</h2>
        <p className="mt-3 rounded-xl bg-[#edf4f2] px-4 py-3 text-sm font-semibold text-[#1d4d58]">{phrase}</p>
        <p className="mt-4 text-sm leading-6 text-[#52747a]">A natural Icelandic MP3 will be generated and saved to this expression{hasAudio ? ". This replaces the current recording." : "."}</p>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={isPending} onClick={() => setOpen(false)} className="rounded-full border border-[#1d4d58]/20 px-4 py-2 text-sm font-semibold text-[#52747a]">Cancel</button><button type="button" disabled={isPending} onClick={generate} className="rounded-full bg-[#15292d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isPending ? "Generating…" : "Generate audio"}</button></div>
      </div>
    </div>}
  </>;
}
