import type { Metadata } from "next";
import { KeikiDashboard } from "@/components/keiki-dashboard";

export const metadata: Metadata = {
  title: "景気動向指数",
  description:
    "内閣府の景気動向指数（CI・DI）をグラフでわかりやすく。基調判断、先行・一致・遅行指数の推移、月ごとに景気を動かした指標を確認できます。",
};

export default async function KeikiPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  return <KeikiDashboard requestedYm={ym} />;
}
