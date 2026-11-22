/**
 * 指数についての AI インタビュー。テーマ・質問の流れ・AI への指示（純粋関数）。
 */

export type InterviewTopic = "cpi-national" | "cpi-tokyo" | "keiki";

export const INTERVIEW_TOPICS: Record<
  InterviewTopic,
  { label: string; short: string; path: string; questions: readonly string[] }
> = {
  "cpi-national": {
    label: "全国の消費者物価（物価の実感）",
    short: "物価（全国）",
    path: "/",
    questions: [
      "最近の買い物や支払いで、値上がりを一番感じたのはどんな場面ですか？",
      "指数の上がり方と比べて、あなたの実感はどうですか？",
      "値上がりで、暮らしや家計に変化はありましたか？工夫していることはありますか？",
      "給料や収入の増え方と比べて、物価の上がり方をどう感じますか？（答えにくければ飛ばして大丈夫です）",
      "物価について、国や政治に期待することはありますか？",
    ],
  },
  "cpi-tokyo": {
    label: "東京都区部の消費者物価（物価の実感）",
    short: "物価（東京都区部）",
    path: "/tokyo",
    questions: [
      "最近の買い物や支払いで、値上がりを一番感じたのはどんな場面ですか？",
      "指数の上がり方と比べて、あなたの実感はどうですか？",
      "家賃や住まいの費用、交通費など、東京ならではの負担を感じることはありますか？",
      "値上がりで、暮らしや家計に変化はありましたか？工夫していることはありますか？",
      "物価について、国や東京都に期待することはありますか？",
    ],
  },
  keiki: {
    label: "景気動向指数（景気の実感）",
    short: "景気",
    path: "/keiki",
    questions: [
      "国の判断と比べて、あなたが感じる景気はどうですか？",
      "仕事や職場、取引先などで、景気の変化を感じることはありますか？",
      "お店や街のにぎわい、人の動きで感じることはありますか？",
      "これから半年くらいの景気は、どうなると思いますか？その理由も教えてください。",
      "景気について、国や政治に期待することはありますか？",
    ],
  },
};

export function isInterviewTopic(value: unknown): value is InterviewTopic {
  return typeof value === "string" && value in INTERVIEW_TOPICS;
}

/** 1回のインタビューで受け付ける回答の数と、1回の回答の長さ */
export const MAX_USER_TURNS = 8;
export const MAX_ANSWER_LENGTH = 400;
/** インタビューを終えるときに、AI が必ず書く言葉 */
export const CLOSING_PHRASE = "インタビューは以上です";

export function isClosingMessage(text: string): boolean {
  return text.includes(CLOSING_PHRASE);
}

/** 最初の AI のあいさつ（AI を呼ばずにすぐ出す） */
export function openingMessage(topic: InterviewTopic, headline: string): string {
  const first = INTERVIEW_TOPICS[topic].questions[0];
  return [
    `こんにちは。${INTERVIEW_TOPICS[topic].short}について、あなたの実感をお聞かせください。5つほど質問します（5分ほどで終わります）。`,
    headline,
    `では、1つ目の質問です。${first}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** AI への指示（システムプロンプト） */
export function buildInstructions(
  topic: InterviewTopic,
  dataContext: string,
  userTurns: number
): string {
  const { label, questions } = INTERVIEW_TOPICS[topic];
  const wrapUp = userTurns >= questions.length;
  return [
    `あなたは「物価のものさし」というサイトのインタビュアーです。テーマは「${label}」。`,
    "公表された指数を見た人が、実際の暮らしの中でどう感じているかを聞き取ります。",
    "",
    "## 進め方",
    "- 次の質問を、上から順に1つずつ聞きます。1回のメッセージで聞く質問は1つだけです。",
    ...questions.map((question, i) => `  ${i + 1}. ${question}`),
    "- 相手の答えに一言だけ共感や確認を返してから、次の質問に進みます。答えがあいまいなときだけ、1回まで短く深掘りしてかまいません。",
    "- 1回のメッセージは120文字程度までにし、やさしい言葉づかい（です・ます）で話します。",
    "- 相手が数字や言葉の意味を聞いたら、下の「指数のデータ」の範囲で、中学生にもわかるように短く説明してから質問に戻ります。データにない数字は作らず、「このサイトのデータにはありません」と伝えます。",
    "- 投資・家計・病気などの個別の助言、政党や候補者への支持・不支持の誘導はしません。",
    "- 名前・住所・勤務先など、個人を特定できる情報は聞きません。書かれても繰り返しません。",
    "- 相手が「終わりたい」と言ったら、すぐにまとめに進みます。",
    wrapUp
      ? `- 質問はすべて終わりました。いまから、相手の話を2〜3行でまとめ、お礼を伝えて、最後に必ず「${CLOSING_PHRASE}。ありがとうございました。」と書いて終えてください。新しい質問はしません。`
      : `- すべての質問が終わったら、相手の話を2〜3行でまとめ、お礼を伝えて、最後に必ず「${CLOSING_PHRASE}。ありがとうございました。」と書いて終えます。`,
    "",
    "## 指数のデータ（このサイトに表示している最新の数字）",
    dataContext,
  ].join("\n");
}

export type ChatPart = { type: string; text?: string };
export type ChatMessageLike = { role: string; parts?: ChatPart[] };

/** メッセージの本文（テキストの部分だけ）を取り出す */
export function messageText(message: ChatMessageLike): string {
  return (message.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

export type InterviewCheck =
  | { ok: true; userTurns: number }
  | { ok: false; status: number; message: string };

/** 送られてきた会話を確かめる（回答の数・長さ・すでに終わっていないか） */
export function checkConversation(messages: readonly ChatMessageLike[]): InterviewCheck {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, status: 400, message: "会話がありません。" };
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return { ok: false, status: 400, message: "回答がありません。" };
  }
  const answer = messageText(last).trim();
  if (answer.length === 0) {
    return { ok: false, status: 400, message: "回答を入力してください。" };
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `1回の回答は${MAX_ANSWER_LENGTH}文字以内でお願いします。`,
    };
  }
  const userTurns = messages.filter((message) => message.role === "user").length;
  if (userTurns > MAX_USER_TURNS) {
    return { ok: false, status: 409, message: "このインタビューは終了しました。" };
  }
  const ended = messages.some(
    (message) => message.role === "assistant" && isClosingMessage(messageText(message))
  );
  if (ended) {
    return { ok: false, status: 409, message: "このインタビューは終了しました。" };
  }
  return { ok: true, userTurns };
}
