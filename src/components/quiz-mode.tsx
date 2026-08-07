"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardData } from "@/lib/db";
import { getPlayerMessages, translate, type PlayerLocale, type PlayerMessages } from "@/lib/player-i18n";

type Phrase = DashboardData["phrases"][number];
type Question = { phrase: Phrase; options: Phrase[]; correctId: number };

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeQuestions(phrases: Phrase[]): Question[] {
  const selected = shuffle(phrases).slice(0, 20);
  return selected.map((phrase) => {
    const distractors = shuffle(phrases.filter((candidate) => candidate.id !== phrase.id)).slice(0, 2);
    return { phrase, options: shuffle([phrase, ...distractors]), correctId: phrase.id };
  });
}

export function QuizMode({ phrases, level, totalLevels, locale, onExit, onPass, isChangingLevel = false }: { phrases: Phrase[]; level: number; totalLevels: number; locale: PlayerLocale; onExit: () => void; onPass: () => void; isChangingLevel?: boolean }) {
  const m = getPlayerMessages(locale);
  const [questions, setQuestions] = useState(() => makeQuestions(phrases));
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = questions[index];
  const passed = score >= Math.ceil(questions.length * 0.8);
  const percent = questions.length ? Math.round((score / questions.length) * 100) : 0;

  function answer(id: number) {
    if (selectedId !== null || !question) return;
    setSelectedId(id);
    if (id === question.correctId) setScore((value) => value + 1);
  }

  function next() {
    if (selectedId === null) return;
    if (index === questions.length - 1) setFinished(true);
    else {
      setIndex((value) => value + 1);
      setSelectedId(null);
    }
  }

  function retry() {
    setQuestions(makeQuestions(phrases));
    setIndex(0);
    setSelectedId(null);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    return <section className="mx-auto w-full max-w-3xl min-w-0 rounded-[2rem] border border-[#1d4d58]/15 bg-white p-7 shadow-[0_25px_70px_-28px_rgba(21,41,45,.35)] sm:p-12">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[#78979c]">{translate(m.quiz.complete, { level })}</p><h1 className="display mt-2 text-5xl text-[#15292d] sm:text-6xl">{percent}%</h1><p className="mt-3 text-[#52747a]">{translate(m.quiz.ofCorrect, { score, total: questions.length })}</p></div><div className={`rounded-full px-4 py-2 text-sm font-semibold ${passed ? "bg-[#b7d86a]/35 text-[#1d4d58]" : "bg-amber-100 text-amber-900"}`}>{passed ? m.quiz.passed : m.quiz.keepPracticing}</div></div>
      <div className="mt-8 h-3 overflow-hidden rounded-full bg-[#d9eeec]"><div className={`h-full rounded-full ${passed ? "bg-[#b7d86a]" : "bg-[#e4aa57]"}`} style={{ width: `${percent}%` }} /></div>
      <p className="mt-7 max-w-xl text-sm leading-6 text-[#52747a]">{passed ? (level < totalLevels ? m.quiz.nextUnlocked : m.quiz.finalPassed) : m.quiz.needToPass}</p>
      <div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={onExit} disabled={isChangingLevel} className="rounded-full border border-[#1d4d58]/20 px-5 py-3 text-sm font-semibold text-[#1d4d58] hover:bg-[#d9eeec] disabled:cursor-wait disabled:opacity-50">{m.quiz.back}</button>{!passed && <button type="button" onClick={retry} disabled={isChangingLevel} className="rounded-full bg-[#15292d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4d58] disabled:cursor-wait disabled:opacity-50">{m.quiz.retry}</button>}{passed && level < totalLevels && <button type="button" onClick={onPass} disabled={isChangingLevel} aria-busy={isChangingLevel} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#b7d86a] px-5 py-3 text-sm font-semibold text-[#15292d] hover:bg-[#c6e57c] disabled:cursor-wait disabled:opacity-70">{isChangingLevel && <Spinner />}{isChangingLevel ? m.quiz.loading : translate(m.quiz.continue, { level: level + 1 })}</button>}</div>
    </section>;
  }

  if (!question) return <section className="mx-auto w-full max-w-3xl min-w-0 rounded-[2rem] bg-white p-8"><p>{m.quiz.notEnough}</p><button type="button" onClick={onExit} className="mt-5 rounded-full bg-[#15292d] px-5 py-3 text-sm font-semibold text-white">{m.quiz.back}</button></section>;

  return <section className="mx-auto w-full max-w-3xl min-w-0">
    <div className="mb-6 flex items-center justify-between gap-4"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[#78979c]">{translate(m.quiz.levelTitle, { level })}</p><p className="mt-1 text-sm text-[#52747a]">{translate(m.quiz.questionOf, { current: index + 1, total: questions.length })}</p></div><button type="button" onClick={onExit} className="rounded-full border border-[#1d4d58]/20 px-4 py-2 text-sm font-semibold text-[#1d4d58] hover:bg-[#d9eeec]">{m.quiz.exit}</button></div>
    <div className="h-2 overflow-hidden rounded-full bg-[#d9eeec]"><div className="h-full rounded-full bg-[#b7d86a] transition-[width]" style={{ width: `${(index / questions.length) * 100}%` }} /></div>
    <article className="relative mt-8 rounded-[2rem] bg-[#1d4d58] p-8 text-white shadow-[0_25px_70px_-28px_rgba(21,41,45,.7)] sm:p-12"><p className="mono text-[10px] uppercase tracking-[.2em] text-white/50">{m.quiz.prompt}</p><h1 lang="is" className="display mt-8 text-5xl leading-[1.05] sm:text-6xl">{question.phrase.icelandic}</h1>{question.phrase.audioUrl && <QuizAudioControls audioUrl={question.phrase.audioUrl} resetKey={question.phrase.id} messages={m} />}</article>
    <div className="mt-6 grid gap-3">{question.options.map((option, optionIndex) => { const correct = option.id === question.correctId; const chosen = option.id === selectedId; const state = selectedId === null ? "idle" : correct ? "correct" : chosen ? "wrong" : "idle"; return <button type="button" key={`${question.phrase.id}-${option.id}`} onClick={() => answer(option.id)} disabled={selectedId !== null} className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${state === "correct" ? "border-[#7ca940] bg-[#b7d86a]/35 text-[#1d4d58]" : state === "wrong" ? "border-[#b96b5b] bg-red-50 text-red-900" : "border-[#1d4d58]/15 bg-white text-[#1d4d58] hover:border-[#1d4d58]/40 hover:bg-[#d9eeec]"}`}><span className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs">{String.fromCharCode(65 + optionIndex)}</span><span className="min-w-0 flex-1"><span className="block text-base font-semibold leading-5">{option.meaning || m.quiz.translationMissing}</span><span className="mt-1 block text-xs leading-5 opacity-65">{option.literal || m.quiz.literalMissing}</span></span>{state === "correct" && <span className="ml-auto shrink-0 text-sm">✓</span>}{state === "wrong" && <span className="ml-auto shrink-0 text-sm">×</span>}</button>; })}</div>
    {selectedId !== null && <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-white/70 px-5 py-4"><p className="text-sm font-semibold text-[#1d4d58]">{selectedId === question.correctId ? m.quiz.correct : translate(m.quiz.answerIs, { answer: question.phrase.meaning || m.quiz.translationMissing })}</p><button type="button" onClick={next} className="rounded-xl bg-[#15292d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4d58]">{index === questions.length - 1 ? m.quiz.score : m.quiz.next}</button></div>}
  </section>;
}

function QuizAudioControls({ audioUrl, resetKey, messages }: { audioUrl: string; resetKey: number; messages: PlayerMessages }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => { const audio = audioRef.current; if (!audio) return; audio.pause(); audio.currentTime = 0; setPlaying(false); }, [resetKey, audioUrl]);
  function toggle(event: React.MouseEvent<HTMLButtonElement>) { event.preventDefault(); const audio = audioRef.current; if (!audio) return; if (audio.paused) void audio.play(); else audio.pause(); }
  function toggleSpeed(event: React.MouseEvent<HTMLButtonElement>) { event.preventDefault(); const nextSlow = !slow; setSlow(nextSlow); if (audioRef.current) audioRef.current.playbackRate = nextSlow ? 0.7 : 1; }
  return <><div className="absolute right-6 top-6 flex items-center gap-2 sm:right-10 sm:top-10"><button type="button" onClick={toggleSpeed} aria-pressed={slow} aria-label={slow ? messages.audio.playNormal : messages.audio.playSlow} className={`rounded-full border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b7d86a] ${slow ? "border-[#b7d86a] bg-[#b7d86a] text-[#15292d]" : "border-white/25 bg-[#15292d]/65 text-white hover:bg-[#15292d]"}`}>{slow ? messages.audio.slow : messages.audio.normal}</button><button type="button" onClick={toggle} aria-label={playing ? messages.audio.pauseLabel : messages.audio.play} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#15292d]/65 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:bg-[#15292d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b7d86a]"><span aria-hidden="true" className="text-sm">{playing ? "Ⅱ" : "▶"}</span>{playing ? messages.audio.pause : messages.audio.listen}</button></div><audio ref={audioRef} src={audioUrl} preload="metadata" onPlay={() => { if (audioRef.current) audioRef.current.playbackRate = slow ? 0.7 : 1; setPlaying(true); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /></>;
}

function Spinner() { return <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />; }
