import Link from "next/link";
import { getAdminExpressions, type AdminFilters } from "@/lib/db";
import { AdminFilters as AdminFiltersPanel } from "../admin-filters";
import { BulkExpressionTable } from "../bulk-expression-table";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const current = params[key];
  return (Array.isArray(current) ? current[0] ?? "" : current ?? "").trim();
}

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters: AdminFilters = {
    query: value(params, "query"), source: value(params, "source"), translationStatus: value(params, "translationStatus"), reviewStatus: value(params, "reviewStatus"), level: Number(value(params, "level")) || undefined,
    sort: (value(params, "sort") as AdminFilters["sort"]) || "level", direction: value(params, "direction") === "desc" ? "desc" : "asc", page: Number(value(params, "page")) || 1, archived: true,
  };
  const data = getAdminExpressions(filters);
  const queryString = (page: number) => { const next = new URLSearchParams(); for (const [key, raw] of Object.entries(params)) { const item = Array.isArray(raw) ? raw[0] : raw; if (item && key !== "page") next.set(key, item); } next.set("page", String(page)); return next.toString(); };
  return <main className="min-h-screen bg-[#edf4f2] px-4 py-6 text-[#15292d] md:px-8"><header className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-5 border-b border-[#1d4d58]/20 pb-6"><div><Link href="/admin" className="mono text-xs text-[#78979c] hover:text-[#1d4d58]">← Active expressions</Link><p className="mono mt-5 text-[10px] uppercase tracking-[.22em] text-[#78979c]">Storage room</p><h1 className="display mt-1 text-5xl">Archived expressions</h1></div><p className="mono text-xs text-[#78979c]">{data.total.toLocaleString()} archived</p></header><section className="mx-auto max-w-[1500px] py-6"><AdminFiltersPanel basePath="/admin/archive" initial={{ query: filters.query ?? "", source: filters.source ?? "", translationStatus: filters.translationStatus ?? "", reviewStatus: filters.reviewStatus ?? "", level: filters.level?.toString() ?? "", sort: filters.sort ?? "level", direction: filters.direction ?? "asc" }} sources={data.sources} totalLevels={data.totalLevels} /><div className="mt-5 overflow-hidden rounded-3xl border border-[#1d4d58]/15 bg-white shadow-sm"><BulkExpressionTable phrases={data.rows} returnTo={`/admin/archive?${queryString(data.page)}`} archived />{data.rows.length === 0 && <p className="p-12 text-center text-[#78979c]">No archived expressions match these filters.</p>}<div className="flex items-center justify-between border-t border-[#1d4d58]/10 px-5 py-4 text-sm"><Link aria-disabled={data.page === 1} href={`?${queryString(Math.max(1, data.page - 1))}`} className={data.page === 1 ? "pointer-events-none opacity-30" : "font-semibold"}>← Previous</Link><span className="mono text-xs text-[#78979c]">Page {data.page} / {data.totalPages}</span><Link aria-disabled={data.page === data.totalPages} href={`?${queryString(Math.min(data.totalPages, data.page + 1))}`} className={data.page === data.totalPages ? "pointer-events-none opacity-30" : "font-semibold"}>Next →</Link></div></div></section></main>;
}
