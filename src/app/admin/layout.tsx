import { requireAdmin } from "@/lib/auth";
import { UserButton } from "@clerk/nextjs";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <><div className="fixed right-6 top-5 z-50"><UserButton /></div>{children}</>;
}
