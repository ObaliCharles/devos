import { requireUser } from "@/lib/user";
import { SettingsForm } from "@/components/settings-form";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const prefs = (user.preferences ?? {}) as Record<string, unknown>;

  return (
    <div className="page-body">
      <PageHeader eyebrow="System" title="Settings" />
      <SettingsForm
        name={String(user.name ?? "")}
        email={String(user.email ?? "")}
        prefs={{
          theme: String(prefs.theme ?? "dark"),
          timezone: String(prefs.timezone ?? ""),
          reminderHour: Number(prefs.reminderHour ?? 19),
          emailDigest: Boolean(prefs.emailDigest),
          notifyLearning: prefs.notifyLearning !== false,
          notifyProjects: prefs.notifyProjects !== false,
          notifyReviews: prefs.notifyReviews !== false,
          pomodoroMinutes: Number(prefs.pomodoroMinutes ?? 25),
        }}
      />
    </div>
  );
}
