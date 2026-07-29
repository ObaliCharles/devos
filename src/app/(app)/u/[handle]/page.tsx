import { notFound } from "next/navigation";
import { requireUser } from "@/lib/user";
import { getProfile } from "@/lib/queries";
import { Heatmap } from "@/components/heatmap";
import { ProfileView } from "@/components/profile/profile-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `@${handle} · DeveloperOS` };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const viewer = await requireUser();
  const profile = await getProfile(viewer._id, handle).catch(() => null);
  if (!profile) notFound();

  return (
    <div className="page-body">
      <ProfileView profile={profile} />

      {/* The contribution graph sits below the fold on purpose: it is the most
          convincing thing on the page but also the widest, and putting it up
          top would push everything you actually clicked through for off screen. */}
      <section className="card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eyebrow">Contributions</h2>
          <span className="text-meta text-[12px]">Last 26 weeks</span>
        </div>
        <div className="mt-3">
          <Heatmap days={profile.activity} />
        </div>
      </section>
    </div>
  );
}
