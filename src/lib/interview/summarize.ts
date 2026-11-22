import "server-only";
import { generateText } from "ai";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { GATEWAY_OPTIONS, INTERVIEW_MODEL } from "./models";
import { getCompletedInterview, saveInterviewSummary } from "./store";
import {
  buildDigestPrompt,
  buildSummaryPrompt,
  DIGEST_MIN_INTERVIEWS,
} from "./summary";
import { parseBullets } from "./summary";
import { type InterviewTopic, isInterviewTopic } from "./topics";

/** 「みんなの声」の表示に使うキャッシュの名前（新しい声が公開されたら作り直す） */
export const VOICES_CACHE_TAG = "voices";

/** 1件のインタビューの要約を作って保存する（すでにあれば作らない） */
export async function ensureInterviewSummary(id: string): Promise<string[] | null> {
  const interview = await getCompletedInterview(id);
  if (!interview || !isInterviewTopic(interview.topic)) return null;
  if (interview.summary && interview.summary.length > 0) return interview.summary;
  const { text } = await generateText({
    model: INTERVIEW_MODEL,
    prompt: buildSummaryPrompt(interview.topic, interview.transcript),
    maxOutputTokens: 400,
    providerOptions: GATEWAY_OPTIONS,
  });
  const bullets = parseBullets(text, 4);
  if (bullets.length === 0) return null;
  await saveInterviewSummary(id, bullets);
  return bullets;
}

const cachedDigest = unstable_cache(
  async (topic: InterviewTopic, summaries: string[][], _key: string) => {
    const { text } = await generateText({
      model: INTERVIEW_MODEL,
      prompt: buildDigestPrompt(topic, summaries),
      maxOutputTokens: 600,
      providerOptions: GATEWAY_OPTIONS,
    });
    return parseBullets(text, 5);
  },
  ["interview-digest"],
  { revalidate: 60 * 60 * 24, tags: [VOICES_CACHE_TAG] }
);

/**
 * テーマごとのまとめ。公開された要約が DIGEST_MIN_INTERVIEWS 件以上あるときだけ作る。
 * 同じ要約の組み合わせなら作り直さない（キャッシュ）。
 */
export async function getInterviewDigest(
  topic: InterviewTopic,
  summaries: string[][]
): Promise<string[] | null> {
  if (summaries.length < DIGEST_MIN_INTERVIEWS) return null;
  const recent = summaries.slice(0, 60);
  const key = createHash("sha256").update(JSON.stringify(recent)).digest("hex").slice(0, 16);
  try {
    const bullets = await cachedDigest(topic, recent, key);
    return bullets.length > 0 ? bullets : null;
  } catch (error) {
    console.error("みんなの声：まとめの作成に失敗しました", error);
    return null;
  }
}
