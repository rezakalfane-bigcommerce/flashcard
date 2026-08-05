import Link from "next/link";
import { getAdminExpressions, type AdminFilters } from "@/lib/db";
import { AdminFilters as AdminFiltersPanel } from "./admin-filters";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const current = params[key];
  return Array.isArray(current) ? current[0] ?? "" : current ?? "";
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters: AdminFilters = {
    query: value(params, "query"),
    source: value(params, "source"),
    translationStatus: value(params, "translationStatus"),
    reviewStatus: value(params, "reviewStatus"),
    level: Number(value(params, "level")) || undefined,
    sort: (value(params, "sort") as AdminFilters["sort"]) || "level",
    direction: value(params, "direction") === "desc" ? "desc" : "asc",
    page: Number(value(params, "page")) || 1,
  };
  const data = getAdminExpressions(filters);
  const queryString = (page: number) => {
    const next = new URLSearchParams();
    for (const [key, raw] of Object.entries(params)) {
      const item = Array.isArray(raw) ? raw[0] : raw;
      if (item && key !== "page") next.set(key, item);
    }
    next.set("page", String(page));
    return next.toString();
  };

  return (
    <main className="min-h-screen bg-[#edf4f2] px-4 py-6 text-[#15292d] md:px-8">
      <header className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-5 border-b border-[#1d4d58]/20 pb-6">
        <div><Link href="/" className="mono text-xs text-[#78979c] hover:text-[#1d4d58]">← Study deck</Link><p className="mono mt-5 text-[10px] uppercase tracking-[.22em] text-[#78979c]">Database workshop</p><h1 className="display mt-1 text-5xl">Expression admin</h1></div>
        <div className="flex items-center gap-3"><p className="mono text-xs text-[#78979c]">{data.total.toLocaleString()} results</p><Link href="/admin/statistics" className="rounded-full border border-[#1d4d58]/20 px-5 py-3 text-sm font-semibold hover:bg-white">Statistics</Link><Link href="/admin/new" className="rounded-full bg-[#15292d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4d58]">+ New expression</Link></div>
      </header>

      <section className="mx-auto max-w-[1500px] py-6">
        <AdminFiltersPanel initial={{ query: filters.query ?? "", source: filters.source ?? "", translationStatus: filters.translationStatus ?? "", reviewStatus: filters.reviewStatus ?? "", level: filters.level?.toString() ?? "", sort: filters.sort ?? "level", direction: filters.direction ?? "asc" }} sources={data.sources} totalLevels={data.totalLevels} />

        <div className="mt-5 overflow-hidden rounded-3xl border border-[#1d4d58]/15 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="mono bg-[#1d4d58] text-[10px] uppercase tracking-[.14em] text-white/70"><tr><th className="px-5 py-4">Expression</th><th className="px-4 py-4">English meaning</th><th className="px-4 py-4">Level</th><th className="px-4 py-4">Score</th><th className="px-4 py-4">Source</th><th className="px-4 py-4">Translation</th><th className="px-4 py-4">Review</th><th className="px-4 py-4" /></tr></thead>
              <tbody>{data.rows.map((phrase) => <tr key={phrase.id} className="border-t border-[#1d4d58]/10 align-top hover:bg-[#d9eeec]/35"><td className="display max-w-sm px-5 py-4 text-lg font-medium">{phrase.icelandic}</td><td className="max-w-sm px-4 py-4 text-[#1d4d58]/75">{phrase.meaning || <span className="italic text-[#78979c]">Not translated</span>}</td><td className="mono px-4 py-4 text-xs">{phrase.level}</td><td className="mono px-4 py-4 text-xs">{phrase.complexity}</td><td className="px-4 py-4 text-xs">{phrase.source}</td><td className="px-4 py-4"><Status value={phrase.translationStatus} /></td><td className="px-4 py-4"><Status value={phrase.reviewStatus} /></td><td className="px-4 py-4 text-right"><Link href={`/admin/${phrase.id}`} className="font-semibold text-[#1d4d58] underline decoration-[#b7d86a] decoration-2 underline-offset-4">Edit</Link></td></tr>)}</tbody>
            </table>
          </div>
          {data.rows.length === 0 && <p className="p-12 text-center text-[#78979c]">No expressions match these filters.</p>}
          <div className="flex items-center justify-between border-t border-[#1d4d58]/10 px-5 py-4 text-sm"><Link aria-disabled={data.page === 1} href={`?${queryString(Math.max(1, data.page - 1))}`} className={data.page === 1 ? "pointer-events-none opacity-30" : "font-semibold"}>← Previous</Link><span className="mono text-xs text-[#78979c]">Page {data.page} / {data.totalPages}</span><Link aria-disabled={data.page === data.totalPages} href={`?${queryString(Math.min(data.totalPages, data.page + 1))}`} className={data.page === data.totalPages ? "pointer-events-none opacity-30" : "font-semibold"}>Next →</Link></div>
        </div>
      </section>
    </main>
  );
}

function Status({ value }: { value: string }) { const active = value === "approved" || value === "reviewed"; const attention = value === "needs_review" || value === "draft"; return <span className={`mono inline-flex rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[.1em] ${active ? "bg-[#b7d86a]/35 text-[#1d4d58]" : attention ? "bg-amber-100 text-amber-800" : "bg-[#78979c]/10 text-[#78979c]"}`}>{value.replace("_", " ")}</span>; }
