import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { inviteUserAction, reinviteUserAction, setUserApprovalAction } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { ReinviteButton } from "../reinvite-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const current = params[key];
  return (Array.isArray(current) ? current[0] ?? "" : current ?? "").trim();
}

function configuredAdminEmails() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const access = await requireAdmin();
  const client = await clerkClient();
  const result = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });
  const users = result.data;
  const invitationResult = await client.invitations.getInvitationList({ status: "pending", limit: 100 });
  const existingEmails = new Set(users.flatMap((user) => user.emailAddresses.map((address) => address.emailAddress.toLowerCase())));
  const pendingInvitations = invitationResult.data.filter((invitation) => !existingEmails.has(invitation.emailAddress.toLowerCase()));
  const adminEmails = configuredAdminEmails();
  const error = value(params, "error");
  const invited = value(params, "invited") === "1";
  const resent = value(params, "resent") === "1";
  return <main className="min-h-screen bg-[#edf4f2] px-4 py-6 text-[#15292d] md:px-8"><header className="mx-auto flex max-w-6xl items-end justify-between gap-5 border-b border-[#1d4d58]/20 pb-6"><div><Link href="/admin" className="mono text-xs text-[#78979c] hover:text-[#1d4d58]">← Expression admin</Link><p className="mono mt-5 text-[10px] uppercase tracking-[.22em] text-[#78979c]">Access control</p><h1 className="display mt-1 text-5xl">Users</h1></div><p className="mono text-xs text-[#78979c]">{users.length} users{pendingInvitations.length > 0 ? `, ${pendingInvitations.length} invited` : ""}</p></header><section className="mx-auto max-w-6xl py-7">{(error || invited || resent) && <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${error ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#b7d86a] bg-[#b7d86a]/20 text-[#1d4d58]"}`} role="status"><strong>{error || (resent ? "Invitation re-sent." : "Invitation sent.")}</strong></div>}<p className="mb-4 text-sm text-[#527980]">Rights are determined by the configured administrator allowlist and approval metadata. Admins can manage the database and approve users. You cannot revoke your own access.</p><form action={inviteUserAction} className="mb-6 flex items-center gap-3"><input type="email" name="email" required placeholder="name@example.com" className="w-full max-w-sm rounded-full border border-[#1d4d58]/20 bg-white px-5 py-3 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-[#b7d86a]" /><button type="submit" className="rounded-full bg-[#15292d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4d58]">+ Add user</button></form><div className="overflow-hidden rounded-3xl border border-[#1d4d58]/15 bg-white shadow-sm"><div className="grid grid-cols-[1fr_130px_180px_150px] gap-4 bg-[#1d4d58] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white/70"><span>User</span><span>Rights</span><span>Status</span><span className="text-right">Action</span></div>{pendingInvitations.map((invitation) => <div key={invitation.id} className="grid grid-cols-[1fr_130px_180px_150px] items-center gap-4 border-t border-[#1d4d58]/10 px-6 py-5"><div><p className="font-semibold text-[#78979c]">Awaiting sign-up</p><p className="mt-1 text-sm text-[#78979c]">{invitation.emailAddress}</p></div><span className="w-fit rounded-full bg-[#d9eeec] px-3 py-1 text-xs font-semibold text-[#1d4d58]">Member</span><span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Invited</span><form action={reinviteUserAction} className="text-right"><input type="hidden" name="invitationId" value={invitation.id} /><input type="hidden" name="email" value={invitation.emailAddress} /><ReinviteButton /></form></div>)}{users.map((user) => { const email = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ?? "No email"; const approved = user.publicMetadata?.approved === true; const isAdmin = adminEmails.has(email.toLowerCase()) || user.publicMetadata?.role === "admin"; const isSelf = user.id === access.userId; return <div key={user.id} className="grid grid-cols-[1fr_130px_180px_150px] items-center gap-4 border-t border-[#1d4d58]/10 px-6 py-5"><div><p className="font-semibold">{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user"}</p><p className="mt-1 text-sm text-[#78979c]">{email}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${isAdmin ? "bg-[#1d4d58] text-white" : "bg-[#d9eeec] text-[#1d4d58]"}`}>{isAdmin ? "Admin" : "Member"}</span><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${approved || isAdmin ? "bg-[#b7d86a]/35 text-[#1d4d58]" : "bg-amber-100 text-amber-900"}`}>{approved || isAdmin ? "Approved" : "Pending"}</span><form action={setUserApprovalAction} className="text-right"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="approved" value={String(!approved)} /><button disabled={isSelf} title={isSelf ? "You cannot revoke your own access" : undefined} className="rounded-full border border-[#1d4d58]/20 px-4 py-2 text-xs font-semibold text-[#1d4d58] hover:bg-[#d9eeec] disabled:cursor-not-allowed disabled:opacity-40">{approved || isAdmin ? (isSelf ? "Keep access" : "Revoke") : "Approve"}</button></form></div>; })}{users.length === 0 && pendingInvitations.length === 0 && <p className="p-10 text-center text-[#78979c]">No Clerk users yet.</p>}</div></section></main>;
}
