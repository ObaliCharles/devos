import { CATALOG_TABS, CatalogTabPage, type CatalogTab } from "@/components/learn/catalog-tab-page";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const requested = CATALOG_TABS.find((t) => t.toLowerCase() === (tab ?? "").toLowerCase());

  return <CatalogTabPage tab={(requested ?? "Roadmaps") as CatalogTab} />;
}
