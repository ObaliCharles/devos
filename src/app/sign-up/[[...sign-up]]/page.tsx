import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { AuthShell, AuthWidget, CLERK_APPEARANCE } from "@/components/auth-shell";

export default async function Page() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your workspace"
      description="One account for learning, practice, notes, projects and everything that comes after."
    >
      <AuthWidget>
        <SignUp appearance={CLERK_APPEARANCE} />
      </AuthWidget>
    </AuthShell>
  );
}
