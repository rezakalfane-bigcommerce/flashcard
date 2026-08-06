"use client";

import { useFormStatus } from "react-dom";

export function ReinviteButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} aria-busy={pending} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#1d4d58]/20 px-4 py-2 text-xs font-semibold text-[#1d4d58] hover:bg-[#d9eeec] disabled:cursor-wait disabled:opacity-60">{pending && <Spinner />}{pending ? "Re-inviting…" : "Re-invite"}</button>;
}

function Spinner() {
  return <span aria-hidden="true" className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}
