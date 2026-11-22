/**
 * AI インタビューで使う AI（Vercel AI Gateway 経由。混雑・障害のときは次のモデルに切り替える）。
 * AI Gateway の無料枠で使えて、考える時間（推論）なしにすぐ返すモデルを選ぶ。
 * 有料クレジットにすれば、より高性能なモデル（Claude Haiku など）も使える。
 */
export const INTERVIEW_MODEL = "google/gemini-2.5-flash-lite";
export const INTERVIEW_FALLBACK_MODELS = ["openai/gpt-4.1-mini", "openai/gpt-4o-mini"];
export const GATEWAY_OPTIONS = { gateway: { models: INTERVIEW_FALLBACK_MODELS } };
