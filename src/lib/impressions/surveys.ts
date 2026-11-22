/**
 * 指数を見た感想（実感）のアンケート。質問の定義・入力チェック・集計（純粋関数）。
 */

export type SurveyId = "cpi-national" | "cpi-tokyo" | "keiki";

export type Question = {
  id: string;
  /** {value} は画面で指数の値に置き換える */
  label: string;
  multiple: boolean;
  options: readonly string[];
};

const CPI_QUESTIONS: readonly Question[] = [
  {
    id: "feel",
    label: "指数では、物価は1年前より{value}。あなたが感じる値上がりは？",
    multiple: false,
    options: [
      "指数よりもっと上がっている",
      "だいたい指数どおり",
      "指数ほどは上がっていない",
      "わからない",
    ],
  },
  {
    id: "life",
    label: "1年前と比べて、暮らし向きはどうですか？",
    multiple: false,
    options: ["苦しくなった", "やや苦しくなった", "変わらない", "やや楽になった", "楽になった"],
  },
  {
    id: "items",
    label: "特に値上がりを感じるものは？（いくつでも）",
    multiple: true,
    options: [
      "食料品",
      "お米",
      "電気・ガス代",
      "ガソリン",
      "外食",
      "日用品",
      "家賃・住まい",
      "通信費",
      "医療・介護",
      "教育・子育て",
      "特にない",
    ],
  },
];

const KEIKI_QUESTIONS: readonly Question[] = [
  {
    id: "feel",
    label: "国の判断は「{value}」。あなたが感じる景気は？",
    multiple: false,
    options: [
      "よくなっている",
      "少しよくなっている",
      "変わらない",
      "少し悪くなっている",
      "悪くなっている",
    ],
  },
  {
    id: "outlook",
    label: "半年後の景気は、どうなると思いますか？",
    multiple: false,
    options: ["よくなる", "変わらない", "悪くなる", "わからない"],
  },
  {
    id: "reasons",
    label: "そう感じる理由は？（いくつでも）",
    multiple: true,
    options: [
      "給料・収入",
      "物価",
      "仕事の忙しさ・求人",
      "お店や街のにぎわい",
      "会社の業績",
      "株価・投資",
      "ニュース",
      "その他",
    ],
  },
];

export const SURVEYS: Record<SurveyId, { title: string; questions: readonly Question[] }> = {
  "cpi-national": { title: "全国の消費者物価指数", questions: CPI_QUESTIONS },
  "cpi-tokyo": { title: "東京都区部の消費者物価指数", questions: CPI_QUESTIONS },
  keiki: { title: "景気動向指数", questions: KEIKI_QUESTIONS },
};

export const AGE_OPTIONS = [
  "10代",
  "20代",
  "30代",
  "40代",
  "50代",
  "60代",
  "70代以上",
  "答えない",
] as const;

export const COMMENT_MAX = 500;

export function isSurveyId(value: string): value is SurveyId {
  return value in SURVEYS;
}

export type ImpressionInput = {
  survey: SurveyId;
  /** 見ていた指数の年月 */
  ym: number;
  answers: Record<string, string[]>;
  age: string | null;
  comment: string | null;
};

export type ImpressionValidation =
  | { ok: true; value: ImpressionInput }
  | { ok: false; message: string };

/** フォームの値（同じ名前が複数ある項目は配列）を確かめる */
export function validateImpression(
  fields: Record<string, string[]>
): ImpressionValidation {
  const first = (name: string) => fields[name]?.[0]?.trim() ?? "";
  const survey = first("survey");
  if (!isSurveyId(survey)) return { ok: false, message: "アンケートが見つかりません。" };
  const ym = Number(first("ym"));
  if (!/^\d{6}$/.test(String(ym))) return { ok: false, message: "年月が正しくありません。" };

  const answers: Record<string, string[]> = {};
  for (const question of SURVEYS[survey].questions) {
    const chosen = [...new Set(fields[`q_${question.id}`] ?? [])].filter((value) =>
      question.options.includes(value)
    );
    if (chosen.length === 0) {
      return { ok: false, message: `「${question.label.replace(/\{value\}/, "…")}」を選んでください。` };
    }
    answers[question.id] = question.multiple ? chosen : chosen.slice(0, 1);
  }

  const age = first("age");
  const comment = first("comment").replace(/\r\n/g, "\n");
  if (comment.length > COMMENT_MAX) {
    return { ok: false, message: `感想は${COMMENT_MAX}文字以内でお願いします。` };
  }
  return {
    ok: true,
    value: {
      survey,
      ym,
      answers,
      age: (AGE_OPTIONS as readonly string[]).includes(age) && age !== "答えない" ? age : null,
      comment: comment || null,
    },
  };
}

export type QuestionResult = {
  id: string;
  /** 選択肢ごとの人数（定義の順） */
  counts: { option: string; count: number }[];
  /** その質問に答えた人数 */
  respondents: number;
};

export type SurveyResult = { total: number; questions: QuestionResult[] };

/** 回答をまとめて、選択肢ごとの人数にする（定義にない値は数えない） */
export function aggregateAnswers(
  survey: SurveyId,
  rows: readonly Record<string, string[]>[]
): SurveyResult {
  const questions = SURVEYS[survey].questions.map((question) => {
    const counts = new Map(question.options.map((option) => [option, 0]));
    let respondents = 0;
    for (const answers of rows) {
      const chosen = (answers[question.id] ?? []).filter((value) => counts.has(value));
      if (chosen.length === 0) continue;
      respondents++;
      for (const value of new Set(chosen)) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return {
      id: question.id,
      counts: question.options.map((option) => ({ option, count: counts.get(option) ?? 0 })),
      respondents,
    };
  });
  return { total: rows.length, questions };
}

/** 人数を割合（%、整数）にする */
export function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
