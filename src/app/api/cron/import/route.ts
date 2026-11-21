import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { AREA_IDS } from "@/lib/cpi/areas";
import { importArea } from "@/lib/cpi/import";
import { CPI_CACHE_TAG } from "@/lib/cpi/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 総務省の CSV を取り込む（Vercel Cron が毎日呼ぶ）。
 * Authorization: Bearer <CRON_SECRET> が必要。?force=1 で変化がなくても取り込む。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const force = request.nextUrl.searchParams.get("force") === "1";
  const results = [];
  for (const area of AREA_IDS) {
    results.push(await importArea(area, { force }));
  }
  if (results.some((result) => result.status === "imported")) {
    revalidateTag(CPI_CACHE_TAG);
  }
  return NextResponse.json({ results });
}
