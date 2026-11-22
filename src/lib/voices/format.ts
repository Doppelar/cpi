/** 「みんなの声」の表示用の変換（純粋関数） */
import { maskPersonalInfo } from "./mask";

type Line = { role: "user" | "assistant"; text: string };

/** AI のメッセージから、最後の質問の一文を取り出す（質問がなければ最後の一文） */
export function lastQuestion(text: string): string {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[。？?！!])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const questions = sentences.filter((sentence) => /[？?]$/.test(sentence));
  const picked = questions[questions.length - 1] ?? sentences[sentences.length - 1] ?? "";
  // 「では、2つ目の質問です。」などの前置きを除く
  return picked.replace(/^(では|それでは)?、?(最後の|[0-9０-９一二三四五]+つ目の)質問です。?/, "").trim();
}

export type QAPair = { question: string; answer: string };

/** AI の質問と、それに続く回答の組にする（回答は連絡先を伏せる） */
export function pairQuestionsAndAnswers(transcript: readonly Line[]): QAPair[] {
  const pairs: QAPair[] = [];
  let question = "";
  for (const line of transcript) {
    if (line.role === "assistant") {
      question = lastQuestion(line.text);
    } else if (line.text.trim()) {
      pairs.push({ question, answer: maskPersonalInfo(line.text.trim()) });
    }
  }
  return pairs;
}

export type VoiceType = "all" | "feedback" | "impressions" | "interviews";
export type VoiceTopic = "all" | "cpi-national" | "cpi-tokyo" | "keiki" | "other";

export const VOICE_TYPES: readonly { id: VoiceType; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "interviews", label: "AIインタビュー" },
  { id: "impressions", label: "実感の声" },
  { id: "feedback", label: "ご意見" },
];

export const VOICE_TOPICS: readonly { id: VoiceTopic; label: string }[] = [
  { id: "all", label: "すべての指数" },
  { id: "cpi-national", label: "物価（全国）" },
  { id: "cpi-tokyo", label: "物価（東京都区部）" },
  { id: "keiki", label: "景気" },
  { id: "other", label: "サイト全体・その他" },
];

/** ご意見フォームの「対象」を、テーマの ID にそろえる */
export function feedbackTopicId(topic: string): Exclude<VoiceTopic, "all"> {
  if (topic.includes("全国")) return "cpi-national";
  if (topic.includes("東京")) return "cpi-tokyo";
  if (topic.includes("景気")) return "keiki";
  return "other";
}

export function parseVoiceType(value: string | undefined): VoiceType {
  return VOICE_TYPES.some((type) => type.id === value) ? (value as VoiceType) : "all";
}

export function parseVoiceTopic(value: string | undefined): VoiceTopic {
  return VOICE_TOPICS.some((topic) => topic.id === value) ? (value as VoiceTopic) : "all";
}
