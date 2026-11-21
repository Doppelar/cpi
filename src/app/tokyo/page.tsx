import type { Metadata } from "next";
import { AreaDashboard } from "@/components/area-dashboard";

export const metadata: Metadata = {
  title: "東京都区部の消費者物価指数",
  description:
    "東京都区部の消費者物価指数（CPI）の推移と、月ごとに値上がり・値下がりした品目。全国より約1か月早く公表され、物価の先行指標として注目されます。",
};

export default async function TokyoPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
        東京都区部の指数は、全国の指数よりも約1か月早く公表されるため、全国の物価の動きを先取りする目安として使われます。
      </p>
      <AreaDashboard area="tokyo" requestedYm={ym} />
    </div>
  );
}
