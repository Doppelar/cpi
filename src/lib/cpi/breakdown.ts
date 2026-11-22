/**
 * 「総合指数の前年同月比に寄与した主な内訳」をつくる（純粋関数）。
 * 10大費目 → 中分類 → 主な品目 の3段で、押し上げ・押し下げの大きいものを選ぶ。
 */
import type { MonthItem } from "./types";

/**
 * 内訳で使う「中分類」。総務省の中分類を基本に、生鮮と加工で動きが違う
 * 魚介・野菜・果物は、生鮮〜／加工品の単位に分ける（公表資料の書き方に合わせる）。
 */
export const MIDDLE_GROUPS = new Set([
  "穀類",
  "生鮮魚介",
  "塩干魚介",
  "魚肉練製品",
  "他の魚介加工品",
  "肉類",
  "乳卵類",
  "生鮮野菜",
  "乾物・加工品類",
  "生鮮果物",
  "果物加工品",
  "油脂・調味料",
  "菓子類",
  "調理食品",
  "飲料",
  "酒類",
  "外食",
  "家賃",
  "設備修繕・維持",
  "電気代",
  "ガス代",
  "他の光熱",
  "上下水道料",
  "家庭用耐久財",
  "室内装備品",
  "寝具類",
  "家事雑貨",
  "家事用消耗品",
  "家事サービス",
  "衣料",
  "シャツ・セーター・下着類",
  "履物類",
  "他の被服",
  "被服関連サービス",
  "医薬品・健康保持用摂取品",
  "保健医療用品・器具",
  "保健医療サービス",
  "交通",
  "自動車等関係費",
  "通信",
  "授業料等",
  "教科書・学習参考教材",
  "補習教育",
  "教養娯楽用耐久財",
  "教養娯楽用品",
  "書籍・他の印刷物",
  "教養娯楽サービス",
  "理美容サービス",
  "理美容用品",
  "身の回り用品",
  "たばこ",
  "他の諸雑費",
]);

export type BreakdownKey = "contribYoy" | "contribMom";

export type BreakdownMiddle = {
  code: string;
  name: string;
  /** 中分類の変化率（%） */
  rate: number | null;
  /** 中分類の寄与度（pt） */
  contrib: number;
  /** 同じ向きに一番効いた品目 */
  topItem: { name: string; rate: number | null; contrib: number } | null;
};

export type BreakdownMajor = {
  name: string;
  /** 10大費目全体の寄与度（pt） */
  contrib: number | null;
  middles: BreakdownMiddle[];
};

export type Breakdown = {
  up: BreakdownMajor[];
  down: BreakdownMajor[];
};

/** 載せる中分類の目安（これ以上の寄与度）。足りなければ大きい順に最低件数まで足す */
const THRESHOLD = 0.1;
const MIN_UP = 5;
const MIN_DOWN = 2;
const MAX_EACH = 12;

/**
 * 月の全行（費目・類・品目、分類の順）から内訳をつくる。
 * key：前年同月比の寄与度（contribYoy）か、前月比の寄与度（contribMom）。
 */
export function buildBreakdown(items: readonly MonthItem[], key: BreakdownKey): Breakdown {
  const rateKey = key === "contribYoy" ? "yoy" : "mom";
  const middles: (BreakdownMiddle & { major: string })[] = [];
  const itemsByMiddle = new Map<string, MonthItem[]>();
  const majorContrib = new Map<string, number | null>();
  let currentMajor = "";
  let currentMiddle: string | null = null;

  for (const item of items) {
    if (item.kind === "major") {
      currentMajor = item.name;
      currentMiddle = null;
      majorContrib.set(item.name, item[key]);
      continue;
    }
    if (item.kind === "group") {
      if (MIDDLE_GROUPS.has(item.name)) {
        currentMiddle = item.code;
        if (item[key] != null) {
          middles.push({
            code: item.code,
            name: item.name,
            rate: item[rateKey],
            contrib: item[key] as number,
            topItem: null,
            major: item.category ?? currentMajor,
          });
        }
      }
      continue;
    }
    if (currentMiddle) {
      const list = itemsByMiddle.get(currentMiddle) ?? [];
      list.push(item);
      itemsByMiddle.set(currentMiddle, list);
    }
  }

  const pick = (direction: 1 | -1, minimum: number) => {
    const sorted = middles
      .filter((middle) => middle.contrib * direction > 0)
      .sort((a, b) => (b.contrib - a.contrib) * direction);
    const chosen = sorted.filter((middle) => Math.abs(middle.contrib) >= THRESHOLD);
    const list = (chosen.length >= minimum ? chosen : sorted.slice(0, minimum)).slice(0, MAX_EACH);
    for (const middle of list) {
      const top = (itemsByMiddle.get(middle.code) ?? [])
        .filter((item) => item[key] != null && (item[key] as number) * direction > 0)
        .sort((a, b) => ((b[key] as number) - (a[key] as number)) * direction)[0];
      middle.topItem = top
        ? { name: top.name, rate: top[rateKey], contrib: top[key] as number }
        : null;
    }
    // 10大費目ごとにまとめ、費目は中分類の寄与度の合計が大きい順
    const majors = new Map<string, BreakdownMajor>();
    for (const middle of list) {
      const major = majors.get(middle.major) ?? {
        name: middle.major,
        contrib: majorContrib.get(middle.major) ?? null,
        middles: [],
      };
      const { major: _major, ...rest } = middle;
      major.middles.push(rest);
      majors.set(middle.major, major);
    }
    return [...majors.values()].sort(
      (a, b) =>
        (b.middles.reduce((s, m) => s + m.contrib, 0) - a.middles.reduce((s, m) => s + m.contrib, 0)) *
        direction
    );
  };

  return { up: pick(1, MIN_UP), down: pick(-1, MIN_DOWN) };
}
