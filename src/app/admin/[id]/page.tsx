import { notFound } from "next/navigation";
import { ExpressionForm } from "../expression-form";
import { getAdminExpressions, getExpression, type AdminFilters } from "@/lib/db";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ExpressionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const phrase = await getExpression(Number(id));
  if (!phrase) notFound();
  const raw = await searchParams;
  const notice = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const returnTo = typeof raw.returnTo === "string" ? raw.returnTo : "";
  let previousId: number | undefined;
  let nextId: number | undefined;
  if (returnTo) {
    const [pathname, query = ""] = returnTo.split("?");
    const params = new URLSearchParams(query);
    const value = (key: string) => (params.get(key) ?? "").trim();
    const filters: AdminFilters = {
      query: value("query"),
      source: value("source"),
      translationStatus: value("translationStatus"),
      reviewStatus: value("reviewStatus"),
      level: Number(value("level")) || undefined,
      sort: (value("sort") as AdminFilters["sort"]) || "level",
      direction: value("direction") === "desc" ? "desc" : "asc",
      page: Number(value("page")) || 1,
      archived: pathname === "/admin/archive",
    };
    const page = await getAdminExpressions(filters);
    const position = page.rows.findIndex((row) => row.id === phrase.id);
    previousId = page.rows[position - 1]?.id;
    nextId = page.rows[position + 1]?.id;
  }
  return <ExpressionForm phrase={phrase} notice={notice} navigation={{ returnTo, previousId, nextId }} />;
}
