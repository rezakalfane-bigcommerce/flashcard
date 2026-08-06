"use client";

import { archiveExpressionAction, unarchiveExpressionAction } from "./actions";
import { ArchiveConfirmation } from "./archive-confirmation";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ArchiveControl({ id, phrase, archived, disabled = false }: { id: number; phrase: string; archived: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  function toggle() {
    startTransition(async () => {
      if (archived) {
        await unarchiveExpressionAction(id);
        setConfirmOpen(false);
        router.push("/admin");
      } else {
        await archiveExpressionAction(id);
        setConfirmOpen(false);
        router.push("/admin/archive");
      }
    });
  }
  return <><button type="button" onClick={() => setConfirmOpen(true)} disabled={pending || disabled} className={`rounded-full border px-5 py-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-50 ${archived ? "border-[#b7d86a] bg-[#b7d86a]/25 text-[#1d4d58] hover:bg-[#b7d86a]/40" : "border-[#1d4d58]/20 text-[#52747a] hover:bg-[#d9eeec]"}`}>{pending ? "Saving…" : archived ? "Un-archive" : "Archive"}</button>{confirmOpen && <ArchiveConfirmation archived={archived} phrase={phrase} pending={pending} onCancel={() => setConfirmOpen(false)} onConfirm={toggle} />}</>;
}
