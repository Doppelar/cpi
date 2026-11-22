/**
 * AI インタビューの要約（1件ずつ）と、テーマごとのまとめに使う指示文と読み取り（純粋関数）。
 */
import { maskPersonalInfo } from "@/lib/voices/mask";
import { INTERVIEW_TOPICS, type InterviewTopic } from "./topics";

export type TranscriptLine = { role: "user" | "assistant"; text: string };

/** まとめを表示するのに必要な、公開されたインタビューの件数 */
export const DIGEST_MIN_INTERVIEWS = 3;

/** 1件のインタビューを要約させる指示 */
export function buildSummaryPrompt(topic: InterviewTopic, transcript: readonly TranscriptLine[]): string {
  const conversation = transcript
    .map((line) => `${line.role === "user" ? "回答者" : "インタビュアー"}：${line.text}`)
    .join("\n");
  return [
    `次は「${INTERVIEW_TOPICS[topic].label}」についてのインタビューです。`,
    "回答者が話した内容だけを、サイトを見る人向けに3〜4個の箇条書きで要約してください。",
    "- 1行は40文字以内。各行は「・」で始める。",
    "- 回答者が言っていないことを付け足さない。インタビュアーの説明や数字は書かない。",
    "- 名前・住所・勤務先・連絡先など、個人を特定できる情報は書かない。",
    "- 「回答者は」で始めず、「○○の値上がりを実感」のように短く書く。",
    "- 箇条書き以外の文（前置きや結び）は書かない。",
    "",
    conversation,
  ].join("\n");
}

/** テーマごとに、要約を集めて傾向をまとめさせる指示 */
export function buildDigestPrompt(topic: InterviewTopic, summaries: readonly string[][]): string {
  return [
    `次は「${INTERVIEW_TOPICS[topic].label}」についてのAIインタビュー${summaries.length}件の要約です。`,
    "全体として、どんな声が多かったかを、サイトを見る人向けに3〜5個の箇条書きでまとめてください。",
    "- 1行は60文字以内。各行は「・」で始める。",
    "- 多かった声から順に書く。少数でも目立つ声は「〜という声もあった」と書く。",
    "- 「○人中○人」のような人数は書かず、「多くの人が」「一部の人は」などの言い方にする。",
    "- 要約にないことを付け足さない。個人を特定できる情報は書かない。",
    "- 箇条書き以外の文（前置きや結び）は書かない。",
    "",
    ...summaries.map((bullets, i) => `【${i + 1}】${bullets.join(" ")}`),
  ].join("\n");
}

/** AI の出力から箇条書きの行を取り出す（記号を除き、連絡先は伏せる） */
export function parseBullets(text: string, max = 5): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^([・\-*•●]|\d+[.)．])/.test(line))
    .map((line) => line.replace(/^([・\-*•●]|\d+[.)．])\s*/, "").replace(/\*\*/g, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, max)
    .map(maskPersonalInfo);
}
