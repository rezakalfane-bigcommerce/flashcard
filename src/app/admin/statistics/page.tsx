import Link from "next/link";
import { connection } from "next/server";
import { getAdminStatistics } from "@/lib/db";

const translationOrder = ["missing", "partly_missing", "draft", "translated", "reviewed"];
const reviewOrder = ["unreviewed", "needs_review", "approved", "rejected"];
const colors: Record<string, string> = {
  missing: "#b8c8c8",
  partly_missing: "#e4aa57",
  draft: "#e4aa57",
  translated: "#4f8990",
  reviewed: "#1d4d58",
  unreviewed: "#b8c8c8",
  needs_review: "#e4aa57",
  approved: "#b7d86a",
  rejected: "#b96b5b",
};

export default async function StatisticsPage() {
  await connection();
  const stats = getAdminStatistics();
  const translatedPercent = percent(stats.translated, stats.total);
  const approvedPercent = percent(stats.approved, stats.total);

  return (
    <main className="min-h-screen bg-[#edf4f2] px-4 py-6 text-[#15292d] md:px-8 md:py-9">
      <header className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-6 border-b border-[#1d4d58]/20 pb-7">
        <div>
          <Link href="/admin" className="mono text-xs text-[#78979c] hover:text-[#1d4d58]">← Expression admin</Link>
          <p className="mono mt-5 text-[10px] uppercase tracking-[.22em] text-[#78979c]">Editorial observatory</p>
          <h1 className="display mt-1 text-5xl sm:text-6xl">Translation progress</h1>
        </div>
        <div className="max-w-md text-sm leading-6 text-[#52747a]">A live snapshot of what has been translated, what still needs editorial attention, and where the collection is ready to publish.</div>
      </header>

      <div className="mx-auto max-w-[1500px] py-7">
        <section className="grid overflow-hidden rounded-[2rem] border border-[#1d4d58]/15 bg-[#153f48] text-white shadow-[0_24px_70px_rgba(21,41,45,.12)] lg:grid-cols-[1.45fr_.55fr]">
          <div className="p-7 sm:p-10">
            <p className="mono text-[10px] uppercase tracking-[.2em] text-white/45">Collection translated</p>
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
              <strong className="display text-7xl font-normal sm:text-8xl">{translatedPercent}%</strong>
              <p className="pb-3 text-sm text-white/55">{stats.translated.toLocaleString()} of {stats.total.toLocaleString()} expressions</p>
            </div>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10" aria-label={`${translatedPercent}% translated`}>
              <div className="h-full rounded-full bg-[#b7d86a]" style={{ width: `${translatedPercent}%` }} />
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/55">“Translated” includes records marked translated or reviewed. Final readiness also requires editorial approval.</p>
          </div>
          <dl className="grid grid-cols-2 border-t border-white/10 lg:grid-cols-1 lg:border-l lg:border-t-0">
            <Metric label="Editorially approved" value={`${approvedPercent}%`} detail={`${stats.approved.toLocaleString()} records`} />
            <Metric label="Ready to publish" value={stats.ready.toLocaleString()} detail="Translated and approved" />
          </dl>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Distribution title="Translation pipeline" statuses={translationOrder} counts={stats.translationStatuses} total={stats.total} filter="translationStatus" />
          <Distribution title="Editorial review" statuses={reviewOrder} counts={stats.reviewStatuses} total={stats.total} filter="reviewStatus" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <div className="overflow-hidden rounded-3xl border border-[#1d4d58]/15 bg-white">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#1d4d58]/10 px-6 py-5">
              <div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">By collection</p><h2 className="display mt-1 text-3xl">Source progress</h2></div>
              <p className="text-xs text-[#78979c]">Click a source to inspect its records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="mono text-[9px] uppercase tracking-[.13em] text-[#78979c]"><tr><th className="px-6 py-4">Source</th><th className="px-4 py-4">Translated</th><th className="px-4 py-4">Reviewed status</th><th className="px-4 py-4">Approved</th><th className="px-4 py-4">Missing</th></tr></thead>
                <tbody>{stats.sources.map((source) => {
                  const completion = percent(source.translated, source.total);
                  return <tr key={source.source} className="border-t border-[#1d4d58]/10">
                    <td className="px-6 py-4"><Link href={`/admin?source=${encodeURIComponent(source.source)}`} className="font-semibold underline decoration-[#b7d86a] decoration-2 underline-offset-4">{source.source}</Link><span className="mono ml-2 text-[10px] text-[#78979c]">{source.total}</span></td>
                    <td className="min-w-52 px-4 py-4"><div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#dfe8e7]"><div className="h-full rounded-full bg-[#4f8990]" style={{ width: `${completion}%` }} /></div><span className="mono w-10 text-right text-[10px]">{completion}%</span></div></td>
                    <td className="mono px-4 py-4 text-xs">{source.reviewed.toLocaleString()}</td><td className="mono px-4 py-4 text-xs">{source.approved.toLocaleString()}</td><td className="mono px-4 py-4 text-xs">{source.missing.toLocaleString()}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-[#1d4d58]/15 bg-[#d9eeec] p-6">
            <p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">Field health</p>
            <h2 className="display mt-1 text-3xl">Translation completeness</h2>
            <div className="mt-7 space-y-5">
              <Completion label="English meaning" count={stats.completeness.meaning} total={stats.total} />
              <Completion label="Literal translation" count={stats.completeness.literal} total={stats.total} />
              <Completion label="Etymology / context" count={stats.completeness.why} total={stats.total} />
            </div>
            <div className="mt-7 border-t border-[#1d4d58]/15 pt-5"><p className="display text-4xl">{stats.completeness.complete.toLocaleString()}</p><p className="mt-1 text-sm text-[#52747a]">records contain all three English fields</p></div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#1d4d58]/15 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-[#78979c]">Across difficulty</p><h2 className="display mt-1 text-3xl">Level coverage</h2></div><div className="flex gap-4 text-[10px] text-[#78979c]"><Legend color="#4f8990" label="Translated" /><Legend color="#b7d86a" label="Approved" /></div></div>
          <div className="mt-7 grid grid-cols-10 gap-1.5 sm:grid-cols-[repeat(18,minmax(0,1fr))] lg:grid-cols-[repeat(23,minmax(0,1fr))]" aria-label="Translation and approval coverage by level">
            {stats.levels.map((level) => <Link key={level.level} href={`/admin?level=${level.level}`} title={`Level ${level.level}: ${level.translated}/${level.total} translated, ${level.approved} approved`} className="group flex min-h-16 flex-col justify-end overflow-hidden rounded-md bg-[#e7eeed] outline-none ring-[#1d4d58] focus-visible:ring-2">
              <div className="bg-[#b7d86a]" style={{ height: `${percent(level.approved, level.total)}%` }} /><div className="bg-[#4f8990]" style={{ height: `${percent(Math.max(0, level.translated - level.approved), level.total)}%` }} /><span className="mono py-1 text-center text-[8px] text-[#78979c] group-hover:text-[#15292d]">{level.level}</span>
            </Link>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="p-6 sm:p-8"><dt className="mono text-[9px] uppercase tracking-[.16em] text-white/40">{label}</dt><dd className="display mt-2 text-4xl">{value}</dd><p className="mt-1 text-xs text-white/45">{detail}</p></div>; }

function Distribution({ title, statuses, counts, total, filter }: { title: string; statuses: string[]; counts: { status: string; count: number }[]; total: number; filter: string }) {
  const values = new Map(counts.map((item) => [item.status, item.count]));
  return <section className="rounded-3xl border border-[#1d4d58]/15 bg-white p-6"><h2 className="display text-3xl">{title}</h2><div className="mt-6 flex h-4 overflow-hidden rounded-full bg-[#e7eeed]">{statuses.map((status) => <div key={status} style={{ width: `${percent(values.get(status) ?? 0, total)}%`, backgroundColor: colors[status] }} title={`${label(status)}: ${values.get(status) ?? 0}`} />)}</div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{statuses.map((status) => { const count = values.get(status) ?? 0; return <Link key={status} href={`/admin?${filter}=${status}`} className="rounded-2xl border border-[#1d4d58]/10 p-3 hover:border-[#1d4d58]/30"><span className="block h-2 w-2 rounded-full" style={{ backgroundColor: colors[status] }} /><strong className="display mt-2 block text-2xl font-normal">{count.toLocaleString()}</strong><span className="mono text-[9px] uppercase tracking-[.1em] text-[#78979c]">{label(status)} · {percent(count, total)}%</span></Link>; })}</div></section>;
}

function Completion({ label: text, count, total }: { label: string; count: number; total: number }) { const value = percent(count, total); return <div><div className="mb-2 flex justify-between gap-3 text-sm"><span>{text}</span><span className="mono text-xs">{value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-[#1d4d58]" style={{ width: `${value}%` }} /></div></div>; }
function Legend({ color, label: text }: { color: string; label: string }) { return <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{text}</span>; }
function label(value: string) { return value.replaceAll("_", " "); }
function percent(value: number, total: number) { return total === 0 ? 0 : Math.round((value / total) * 100); }
