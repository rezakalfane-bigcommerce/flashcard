import { notFound } from "next/navigation";
import { ExpressionForm } from "../expression-form";
import { getExpression } from "@/lib/db";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ExpressionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const phrase = await getExpression(Number(id));
  if (!phrase) notFound();
  const raw = await searchParams;
  const notice = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  return <ExpressionForm phrase={phrase} notice={notice} />;
}
