import { getDashboardData } from "@/lib/db";
import { FlashcardApp } from "@/components/flashcard-app";

export const dynamic = "force-dynamic";

export default function Home() {
  const data = getDashboardData();

  return <FlashcardApp key={data.study.currentLevel} initialData={data} />;
}
