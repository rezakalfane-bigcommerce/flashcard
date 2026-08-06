"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addPhrase, changeLevel, saveReview } from "@/app/actions";
import type { DashboardData } from "@/lib/db";
import { QuizMode } from "@/components/quiz-mode";
import { useRouter } from "next/navigation";
import Link from "next/link";

function pickWeightedIndex(phrases: DashboardData["phrases"], excludeId = -1) {
  const now = Date.now();
  const alternatives = phrases.map((phrase, index) => ({ phrase, index })).filter(({ phrase }) => phrase.id !== excludeId);
  const due = alternatives.filter(({ phrase }) => !phrase.nextReviewAt || new Date(phrase.nextReviewAt).getTime() <= now);
  const pool = due.length > 0 ? due : alternatives;
  if (pool.length === 0) return 0;

  const weighted = pool.map((item) => ({
    ...item,
    weight: 1 + (item.phrase.complexity / 100) * 0.6 + Math.max(0, 5 - item.phrase.mastery) * 0.35,
  }));
  let target = Math.random() * weighted.reduce((sum, item) => sum + item.weight, 0);
  for (const item of weighted) {
    target -= item.weight;
    if (target <= 0) return item.index;
  }
  return weighted.at(-1)?.index ?? 0;
}

export function FlashcardApp({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const phrase = initialData.phrases[index % initialData.phrases.length];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" && !adding && !quizMode) {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding, quizMode]);

  function rate(remembered: boolean) {
    if (!phrase || isPending) return;
    startTransition(async () => {
      await saveReview(phrase.id, remembered);
      setFlipped(false);
      setIndex(pickWeightedIndex(initialData.phrases, phrase.id));
      router.refresh();
    });
  }

  function goToLevel(level: number) {
    if (isPending) return;
    startTransition(async () => {
      await changeLevel(level);
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen px-5 py-6 md:px-10 md:py-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-[#1d4d58]/20 pb-5">
        <div className="flex items-baseline gap-3">
          <span className="display text-3xl font-semibold tracking-tight text-[#1d4d58]">Orðspor</span>
          <span className="mono hidden text-[10px] uppercase tracking-[.22em] text-[#78979c] sm:inline">Icelandic, remembered</span>
        </div>
        <div className="flex items-center gap-2"><Link href="/admin" className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#1d4d58] hover:bg-[#d9eeec]">Admin</Link><button onClick={() => setAdding(true)} className="rounded-full bg-[#15292d] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1d4d58] focus:outline-none focus:ring-2 focus:ring-[#b7d86a] focus:ring-offset-2">+ Add phrase</button></div>
      </header>

      <section className={`mx-auto grid max-w-6xl gap-10 py-10 ${quizMode ? "grid-cols-1 lg:py-16" : "lg:grid-cols-[1fr_300px] lg:py-16"}`}>
        {quizMode ? <QuizMode phrases={initialData.phrases} level={initialData.study.currentLevel} totalLevels={initialData.study.totalLevels} onExit={() => setQuizMode(false)} onPass={() => goToLevel(initialData.study.currentLevel + 1)} /> : <div>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mono mb-2 text-[10px] uppercase tracking-[.24em] text-[#78979c]">Today’s practice</p>
              <h1 className="display text-4xl leading-none sm:text-5xl">Say it out loud.</h1>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <button type="button" aria-label="Previous level" title="Previous level (testing)" onClick={() => goToLevel(initialData.study.currentLevel - 1)} disabled={isPending || initialData.study.currentLevel === 1} className="grid h-8 w-8 place-items-center rounded-full border border-[#1d4d58]/20 text-[#1d4d58] transition hover:bg-[#d9eeec] disabled:cursor-not-allowed disabled:opacity-30">←</button>
                <span className="mono text-xs font-semibold text-[#1d4d58]">Level {String(initialData.study.currentLevel).padStart(2, "0")} / {String(initialData.study.totalLevels).padStart(2, "0")}</span>
                <button type="button" aria-label="Next level" title="Next level (testing)" onClick={() => goToLevel(initialData.study.currentLevel + 1)} disabled={isPending || initialData.study.currentLevel === initialData.study.totalLevels} className="grid h-8 w-8 place-items-center rounded-full border border-[#1d4d58]/20 text-[#1d4d58] transition hover:bg-[#d9eeec] disabled:cursor-not-allowed disabled:opacity-30">→</button>
              </div>
              <span className="mt-1 block text-xs text-[#78979c]">{initialData.study.levelMastered} of 20 progressing · testing controls</span>
              <button type="button" onClick={() => setQuizMode(true)} className="mt-3 rounded-full border border-[#1d4d58]/20 bg-white/60 px-4 py-2 text-xs font-semibold text-[#1d4d58] transition hover:bg-[#d9eeec]">Quiz this level</button>
            </div>
          </div>

          {phrase && (
            <div className="card-scene relative h-[400px] w-full sm:h-[430px]">
              <button onClick={() => setFlipped(!flipped)} aria-label={flipped ? "Show Icelandic phrase" : "Reveal translation"} className={`card-inner relative h-full w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#b7d86a] ${flipped ? "flipped" : ""}`}>
                <article className="card-face absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#1d4d58] p-8 text-white shadow-[0_25px_70px_-28px_rgba(21,41,45,.7)] sm:p-12">
                  <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[55px] border-[#b7d86a]/20" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[.2em]">{phrase.category}</span>
                      <span className="mono rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[.14em] text-[#d9eeec]">Complexity · {phrase.complexity}</span>
                    </div>
                    <span className="mono text-[10px] tracking-widest text-white/50">ÍS → EN</span>
                  </div>
                  <h2 className="display relative max-w-2xl text-5xl font-medium leading-[1.03] sm:text-7xl">{phrase.icelandic}</h2>
                  <div className="flex items-end justify-between border-t border-white/15 pt-5">
                    <p className="mono text-xs text-[#d9eeec]">Icelandic expression</p>
                    <p className="text-xs text-white/55">Tap to turn ↗</p>
                  </div>
                </article>
                <article className="card-face card-back absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[2rem] border border-[#1d4d58]/15 bg-[#d9eeec] p-8 shadow-[0_25px_70px_-28px_rgba(21,41,45,.4)] sm:p-12">
                  <div className="flex items-center justify-between gap-3"><span className="mono text-[10px] uppercase tracking-[.2em] text-[#1d4d58]">English notes</span><div className="flex flex-wrap justify-end gap-2"><span className="mono rounded-full border border-[#1d4d58]/15 px-2.5 py-1 text-[9px] uppercase tracking-[.14em] text-[#78979c]">Complexity · {phrase.complexity}</span><span className="mono rounded-full border border-[#1d4d58]/15 px-2.5 py-1 text-[9px] uppercase tracking-[.14em] text-[#78979c]">Source · {phrase.source}</span></div></div>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
                    <div><p className="mono text-[9px] uppercase tracking-[.18em] text-[#78979c]">Icelandic</p><p lang="is" className="display mt-1 text-xl font-medium leading-tight text-[#1d4d58] sm:text-2xl">{phrase.icelandic}</p></div>
                    <div><p className="mono text-[9px] uppercase tracking-[.18em] text-[#78979c]">Meaning</p><p className="display mt-1 text-3xl leading-tight text-[#15292d] sm:text-4xl">{phrase.meaning || "Translation not added yet"}</p></div>
                    <div><p className="mono text-[9px] uppercase tracking-[.18em] text-[#78979c]">Literal</p><p className="mt-1 text-sm font-semibold text-[#1d4d58]">{phrase.literal || "—"}</p></div>
                    <div><p className="mono text-[9px] uppercase tracking-[.18em] text-[#78979c]">Why</p><p className="mt-1 line-clamp-3 text-sm leading-5 text-[#1d4d58]/75">{phrase.why || "—"}</p></div>
                  </div>
                  <p className="text-xs text-[#1d4d58]/60">Tap to see the phrase again</p>
                </article>
              </button>
              {phrase.audioUrl && <AudioPlayButton audioUrl={phrase.audioUrl} />}
            </div>
          )}

          <div className={`mt-6 grid grid-cols-2 gap-3 transition ${flipped ? "opacity-100" : "pointer-events-none opacity-35"}`}>
            <button onClick={() => rate(false)} disabled={isPending} className="rounded-2xl border border-[#1d4d58]/20 bg-white/70 py-4 font-semibold text-[#1d4d58] hover:bg-white disabled:cursor-wait">Still learning</button>
            <button onClick={() => rate(true)} disabled={isPending} className="rounded-2xl bg-[#b7d86a] py-4 font-semibold text-[#15292d] hover:bg-[#c5e479] disabled:cursor-wait">I remembered</button>
          </div>
        </div>}

        {!quizMode && <aside className="flex flex-col gap-5 lg:pt-20">
          <div className="rounded-3xl border border-[#1d4d58]/15 bg-white/55 p-6 backdrop-blur">
            <p className="mono text-[10px] uppercase tracking-[.2em] text-[#78979c]">Your notebook</p>
            <div className="mt-6 grid grid-cols-3 gap-3 lg:grid-cols-1">
              <Stat value={initialData.stats.total} label="phrases" />
              <Stat value={initialData.stats.mastered} label="mastered" />
              <Stat value={initialData.stats.reviews} label="reviews" />
            </div>
          </div>
          <div className="rounded-3xl bg-[#15292d] p-6 text-white">
            <p className="text-sm font-semibold">A little every day</p>
            <p className="mt-2 text-sm leading-6 text-white/60">Reveal the meaning, then mark what stuck. Difficult phrases circle back first.</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#b7d86a]" style={{ width: `${Math.min(100, (initialData.stats.mastered / Math.max(1, initialData.stats.total)) * 100)}%` }} /></div>
          </div>
        </aside>}
      </section>

      {adding && <AddPhraseModal close={() => setAdding(false)} />}
    </main>
  );
}

function AudioPlayButton({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }
  function toggleSpeed(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const nextSlow = !slow;
    setSlow(nextSlow);
    if (audioRef.current) audioRef.current.playbackRate = nextSlow ? 0.7 : 1;
  }
  return <><div className="absolute right-7 top-7 z-20 flex items-center gap-2 sm:right-10 sm:top-10"><button type="button" onClick={toggleSpeed} aria-pressed={slow} aria-label={slow ? "Play Icelandic pronunciation at normal speed" : "Play Icelandic pronunciation at slow speed"} className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b7d86a] ${slow ? "border-[#b7d86a] bg-[#b7d86a] text-[#15292d]" : "border-white/25 bg-[#15292d]/65 text-white hover:bg-[#15292d]"}`}>{slow ? "Slow" : "Normal"}</button><button type="button" onClick={toggle} aria-label={playing ? "Pause Icelandic pronunciation" : "Play Icelandic pronunciation"} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#15292d]/65 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:bg-[#15292d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b7d86a]"><span aria-hidden="true" className="text-sm">{playing ? "Ⅱ" : "▶"}</span>{playing ? "Pause" : "Listen"}</button></div><audio ref={audioRef} src={audioUrl} preload="metadata" onPlay={() => { if (audioRef.current) audioRef.current.playbackRate = slow ? 0.7 : 1; setPlaying(true); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /></>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="border-l-2 border-[#b7d86a] pl-3"><strong className="display block text-3xl font-medium">{value}</strong><span className="text-xs text-[#78979c]">{label}</span></div>;
}

function AddPhraseModal({ close }: { close: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#15292d]/65 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby="add-title" className="w-full max-w-lg rounded-[2rem] bg-[#f4f8f7] p-7 shadow-2xl sm:p-9">
        <div className="flex items-start justify-between">
          <div><p className="mono text-[10px] uppercase tracking-[.2em] text-[#78979c]">New card</p><h2 id="add-title" className="display mt-1 text-4xl">Add a phrase</h2></div>
          <button onClick={close} aria-label="Close" className="rounded-full p-2 text-xl hover:bg-[#d9eeec]">×</button>
        </div>
        <form className="mt-7 space-y-4" action={(formData) => startTransition(async () => { await addPhrase(formData); router.refresh(); close(); })}>
          <Field label="Icelandic" name="icelandic" placeholder="Sjáumst á morgun" required />
          <Field label="English meaning" name="meaning" placeholder="See you tomorrow" required />
          <Field label="Literal translation" name="literal" placeholder="We see each other tomorrow" />
          <label className="block text-sm font-semibold">Why / context<textarea name="why" placeholder="Etymology, imagery, or cultural context…" rows={3} className="mt-2 w-full resize-none rounded-xl border border-[#1d4d58]/20 bg-white px-4 py-3 font-normal outline-none placeholder:text-[#78979c]/60 focus:border-[#1d4d58] focus:ring-2 focus:ring-[#b7d86a]" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Category" name="category" placeholder="Expressions" /><Field label="Source" name="source" placeholder="Personal" /></div>
          <button disabled={pending} className="mt-2 w-full rounded-2xl bg-[#1d4d58] py-4 font-semibold text-white hover:bg-[#15292d] disabled:opacity-60">{pending ? "Saving…" : "Save phrase"}</button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, placeholder, required = false }: { label: string; name: string; placeholder: string; required?: boolean }) {
  return <label className="block text-sm font-semibold">{label}<input autoFocus={name === "icelandic"} required={required} name={name} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[#1d4d58]/20 bg-white px-4 py-3 font-normal outline-none placeholder:text-[#78979c]/60 focus:border-[#1d4d58] focus:ring-2 focus:ring-[#b7d86a]" /></label>;
}
