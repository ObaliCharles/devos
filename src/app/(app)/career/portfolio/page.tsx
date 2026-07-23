import { requireUser } from "@/lib/user";
import { getPortfolioData } from "@/lib/queries";
import { PortfolioEditor } from "@/components/career-panels";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await requireUser();
  const { portfolio, projects } = await getPortfolioData(user._id);
  return <PortfolioEditor portfolio={portfolio} projects={projects} />;
}
