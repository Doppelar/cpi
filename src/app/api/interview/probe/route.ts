import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 一時的な確認用：各モデルが AI Gateway で使えるかを調べる（鍵が必要） */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const models = [
    "anthropic/claude-haiku-5.5",
    "anthropic/claude-haiku-4.5",
    "google/gemini-3.5-flash-lite",
    "google/gemini-2.5-flash-lite",
    "openai/gpt-4.1-mini",
  ];
  const results = await Promise.all(
    models.map(async (model) => {
      const started = Date.now();
      try {
        const { text, response } = await generateText({
          model,
          prompt: "「こんにちは」と一言だけ返してください。",
          maxOutputTokens: 200,
        });
        return { model, ok: true, ms: Date.now() - started, text: text.slice(0, 40), served: response.modelId };
      } catch (error) {
        return { model, ok: false, ms: Date.now() - started, error: String(error).slice(0, 300) };
      }
    })
  );
  return NextResponse.json({ results });
}
