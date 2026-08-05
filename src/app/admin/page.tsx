import Link from "next/link";
import { getAdminExpressions, type AdminFilters } from "@/lib/db";
import { AdminFilters as AdminFiltersPanel } from "./admin-filters";
import { BulkExpressionTable } from "./bulk-expression-table";

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
      if (item && key !== "page" && !key.startsWith("batch")) next.set(key, item);
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
        {(value(params, "batchTranslated") || value(params, "batchError")) && <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${value(params, "batchError") || Number(value(params, "batchFailed")) > 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#b7d86a] bg-[#b7d86a]/20 text-[#1d4d58]"}`} role="status"><strong>{value(params, "batchError") || `${value(params, "batchTranslated")} translation draft${value(params, "batchTranslated") === "1" ? "" : "s"} created.`}</strong>{Number(value(params, "batchFailed")) > 0 && <span> {value(params, "batchFailed")} failed and remained unchanged.</span>}</div>}
        <AdminFiltersPanel initial={{ query: filters.query ?? "", source: filters.source ?? "", translationStatus: filters.translationStatus ?? "", reviewStatus: filters.reviewStatus ?? "", level: filters.level?.toString() ?? "", sort: filters.sort ?? "level", direction: filters.direction ?? "asc" }} sources={data.sources} totalLevels={data.totalLevels} />

        <div className="mt-5 overflow-hidden rounded-3xl border border-[#1d4d58]/15 bg-white shadow-sm">
          <BulkExpressionTable phrases={data.rows} returnTo={`/admin?${queryString(data.page)}`} />
          {data.rows.length === 0 && <p className="p-12 text-center text-[#78979c]">No expressions match these filters.</p>}
          <div className="flex items-center justify-between border-t border-[#1d4d58]/10 px-5 py-4 text-sm"><Link aria-disabled={data.page === 1} href={`?${queryString(Math.max(1, data.page - 1))}`} className={data.page === 1 ? "pointer-events-none opacity-30" : "font-semibold"}>← Previous</Link><span className="mono text-xs text-[#78979c]">Page {data.page} / {data.totalPages}</span><Link aria-disabled={data.page === data.totalPages} href={`?${queryString(Math.min(data.totalPages, data.page + 1))}`} className={data.page === data.totalPages ? "pointer-events-none opacity-30" : "font-semibold"}>Next →</Link></div>
        </div>
      </section>
    </main>
  );
}
