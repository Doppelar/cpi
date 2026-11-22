import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { ensureInterviewSummary, VOICES_CACHE_TAG } from "@/lib/interview/summarize";
import { setInterviewPublic } from "@/lib/interview/store";

/** インタビューを終えた本人が、「みんなの声」に公開するかを選ぶ */
export async function POST(request: NextRequest) {
  let body: { id?: unknown; publish?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません。" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id) || typeof body.publish !== "boolean") {
    return NextResponse.json({ error: "形式が正しくありません。" }, { status: 400 });
  }
  const ok = await setInterviewPublic(id, body.publish);
  if (!ok) {
    return NextResponse.json(
      { error: "インタビューの記録が見つかりませんでした。少し待ってから、もう一度選んでください。" },
      { status: 404 }
    );
  }
  if (body.publish) {
    // 公開するときは、その場で要約を作る（失敗しても公開はする。要約がなければやり取りを表示）
    try {
      await ensureInterviewSummary(id);
    } catch (error) {
      console.error("インタビューの要約に失敗しました", error);
    }
  }
  revalidateTag(VOICES_CACHE_TAG);
  return NextResponse.json({ ok: true, publish: body.publish });
}

export const maxDuration = 60;
