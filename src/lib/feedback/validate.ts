/** ご意見フォームの入力チェック（純粋関数） */

export const FEEDBACK_TOPICS = [
  "消費者物価指数（全国）",
  "消費者物価指数（東京都区部）",
  "景気動向指数",
  "サイト全体・その他",
] as const;

export const FEEDBACK_KINDS = [
  "ご意見・ご感想",
  "わかりにくい点",
  "数字や説明の誤り",
  "追加してほしい機能・データ",
  "その他",
] as const;

export const BODY_MAX = 2000;
export const NAME_MAX = 40;

export type FeedbackInput = {
  topic: (typeof FEEDBACK_TOPICS)[number];
  kind: (typeof FEEDBACK_KINDS)[number];
  body: string;
  name: string | null;
  email: string | null;
};

export type FeedbackValidation =
  | { ok: true; value: FeedbackInput }
  | { ok: false; errors: Partial<Record<keyof FeedbackInput, string>> };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** 送られた値を確かめ、保存できる形にする */
export function validateFeedback(raw: Record<string, unknown>): FeedbackValidation {
  const errors: Partial<Record<keyof FeedbackInput, string>> = {};
  const topic = text(raw.topic);
  const kind = text(raw.kind);
  const body = text(raw.body).replace(/\r\n/g, "\n");
  const name = text(raw.name);
  const email = text(raw.email);

  if (!(FEEDBACK_TOPICS as readonly string[]).includes(topic)) {
    errors.topic = "対象を選んでください。";
  }
  if (!(FEEDBACK_KINDS as readonly string[]).includes(kind)) {
    errors.kind = "種類を選んでください。";
  }
  if (body.length === 0) {
    errors.body = "ご意見を入力してください。";
  } else if (body.length > BODY_MAX) {
    errors.body = `${BODY_MAX}文字以内で入力してください（いま${body.length}文字）。`;
  }
  if (name.length > NAME_MAX) {
    errors.name = `${NAME_MAX}文字以内で入力してください。`;
  }
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.email = "メールアドレスの形が正しくありません。";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      topic: topic as FeedbackInput["topic"],
      kind: kind as FeedbackInput["kind"],
      body,
      name: name || null,
      email: email || null,
    },
  };
}

/** 送信元ページのパスから、対象の初期値を決める */
export function topicFromPath(path: string | undefined): FeedbackInput["topic"] {
  if (path?.startsWith("/tokyo")) return "消費者物価指数（東京都区部）";
  if (path?.startsWith("/keiki")) return "景気動向指数";
  if (path === "/" || path?.startsWith("/?")) return "消費者物価指数（全国）";
  return "サイト全体・その他";
}
