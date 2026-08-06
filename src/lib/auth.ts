import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

function adminEmails() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export async function getAccess() {
  const { userId } = await auth();
  if (!userId) return { userId: null, user: null, isAdmin: false, approved: false };
  const user = await currentUser();
  const email = user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
  const isAdmin = Boolean(email && adminEmails().has(email));
  const approved = isAdmin || user?.publicMetadata?.approved === true;
  return { userId, user, isAdmin, approved };
}

export async function requireApprovedUser() {
  const access = await getAccess();
  if (!access.userId) redirect("/sign-in");
  return access;
}

export async function requireAdmin() {
  const access = await getAccess();
  if (!access.userId) redirect("/sign-in");
  if (!access.isAdmin) notFound();
  return access;
}
