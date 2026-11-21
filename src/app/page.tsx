import { AreaDashboard } from "@/components/area-dashboard";

export default async function NationalPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  return <AreaDashboard area="national" requestedYm={ym} />;
}
