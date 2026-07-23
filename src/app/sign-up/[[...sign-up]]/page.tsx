import { SignUp } from "@clerk/nextjs";
import { AuthShell, CLERK_APPEARANCE } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your workspace"
      description="One account for learning, practice, notes, projects and everything that comes after."
    >
      <SignUp appearance={CLERK_APPEARANCE} />
    </AuthShell>
  );
}
