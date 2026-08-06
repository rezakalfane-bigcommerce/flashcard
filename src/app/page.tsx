import { getDashboardData } from "@/lib/db";
import { FlashcardApp } from "@/components/flashcard-app";
import { requireApprovedUser } from "@/lib/auth";
import { UserButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function Home() {
  const access = await requireApprovedUser();
  if (!access.approved) return <main className="relative grid min-h-screen place-items-center bg-[#edf4f2] p-6"><div className="fixed right-6 top-5 z-50"><UserButton /></div><section className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><p className="mono text-[10px] uppercase tracking-[.2em] text-[#78979c]">Account pending</p><h1 className="display mt-3 text-4xl">Waiting for approval</h1><p className="mt-4 text-sm leading-6 text-[#52747a]">An administrator needs to approve your account before you can study the deck.</p></section></main>;
  const data = await getDashboardData(access.userId);

  return <FlashcardApp key={`${access.userId}-${data.study.currentLevel}`} initialData={data} canChangeLevel={access.isAdmin} />;
}
