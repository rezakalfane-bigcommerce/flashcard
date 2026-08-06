import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main className="grid min-h-screen place-items-center bg-[#edf4f2] p-6"><SignIn /></main>;
}
