import { type NextRequest, NextResponse } from "next/server";
import { isAreaId } from "@/lib/cpi/areas";
import { getItemSeries } from "@/lib/cpi/queries";

/** 1つの類・品目の推移（品目の詳細グラフ用） */
export async function GET(request: NextRequest) {
  const area = request.nextUrl.searchParams.get("area") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!isAreaId(area) || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const points = await getItemSeries(area, code);
  return NextResponse.json(
    { points },
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
