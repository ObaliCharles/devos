import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { AuthShell, AuthWidget, CLERK_APPEARANCE } from "@/components/auth-shell";

export default async function Page() {
  // A signed-in person should never see "Welcome back". Redirect on the server,
  // before this page renders, so there is no flash of the sign-in screen while
  // Clerk hydrates and then bounces them to the app.
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to DeveloperOS"
      description="Your roadmap, projects and review queue are exactly where you left them."
    >
      <AuthWidget>
        <SignIn appearance={CLERK_APPEARANCE} />
      </AuthWidget>
    </AuthShell>
  );
}
