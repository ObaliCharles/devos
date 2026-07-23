import { SignIn } from "@clerk/nextjs";
import { AuthShell, CLERK_APPEARANCE } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to DeveloperOS"
      description="Your roadmap, projects and review queue are exactly where you left them."
    >
      <SignIn appearance={CLERK_APPEARANCE} />
    </AuthShell>
  );
}
