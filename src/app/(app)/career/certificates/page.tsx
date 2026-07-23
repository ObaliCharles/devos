import { requireUser } from "@/lib/user";
import { getCertificates } from "@/lib/queries";
import { CertificatesPanel } from "@/components/career-panels";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const user = await requireUser();
  const certificates = await getCertificates(user._id);
  return <CertificatesPanel certificates={certificates} />;
}
