"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const storageKey = "ordspor:admin-filters:v1";

type Props = {
  initial: {
    query: string;
    source: string;
    translationStatus: string;
    reviewStatus: string;
    level: string;
    sort: string;
    direction: string;
  };
  sources: { source: string; count: number }[];
  totalLevels: number;
};

export function AdminFilters({ initial, sources, totalLevels }: Props) {
  const router = useRouter();

  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    current.delete("page");
    if (current.size > 0) return;
    const remembered = window.localStorage.getItem(storageKey);
    if (remembered) router.replace(`/admin?${remembered}`);
  }, [router]);

  function remember(event: React.FormEvent<HTMLFormElement>) {
    const values = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, raw] of values.entries()) {
      const value = String(raw).trim();
      if (value) params.set(key, value);
    }
    window.localStorage.setItem(storageKey, params.toString());
  }

  function clearFilters() {
    window.localStorage.removeItem(storageKey);
    router.push("/admin");
  }

  return (
    <form onSubmit={remember} className="grid gap-3 rounded-3xl border border-[#1d4d58]/15 bg-white/70 p-4 shadow-sm md:grid-cols-[minmax(240px,2fr)_repeat(6,minmax(120px,1fr))_auto_auto]">
      <input name="query" defaultValue={initial.query} placeholder="Search Icelandic, meaning, literal, context…" className="rounded-xl border border-[#1d4d58]/15 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#b7d86a]" />
      <Select name="source" defaultValue={initial.source}><option value="">All sources</option>{sources.map(({ source, count }) => <option key={source} value={source}>{source} ({count})</option>)}</Select>
      <Select name="translationStatus" defaultValue={initial.translationStatus}><option value="">Any translation</option><option value="missing">Missing</option><option value="draft">Draft</option><option value="translated">Translated</option><option value="reviewed">Reviewed</option></Select>
      <Select name="reviewStatus" defaultValue={initial.reviewStatus}><option value="">Any review</option><option value="unreviewed">Unreviewed</option><option value="needs_review">Needs review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Select>
      <Select name="level" defaultValue={initial.level}><option value="">All levels</option>{Array.from({ length: totalLevels }, (_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}</Select>
      <Select name="sort" defaultValue={initial.sort}><option value="level">Sort: level</option><option value="complexity">Sort: complexity</option><option value="icelandic">Sort: expression</option><option value="source">Sort: source</option><option value="updated">Sort: updated</option></Select>
      <Select name="direction" defaultValue={initial.direction}><option value="asc">Ascending</option><option value="desc">Descending</option></Select>
      <button className="rounded-xl bg-[#b7d86a] px-5 py-3 font-semibold hover:bg-[#c6e57c]">Apply</button>
      <button type="button" onClick={clearFilters} className="rounded-xl border border-[#1d4d58]/15 bg-white px-5 py-3 font-semibold text-[#1d4d58] hover:bg-[#d9eeec]">Clear</button>
    </form>
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="rounded-xl border border-[#1d4d58]/15 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#b7d86a]">{children}</select>;
}
