import { describe, expect, it } from "vitest";
import { buildBreakdown } from "./breakdown";
import type { MonthItem } from "./types";

const row = (
  kind: MonthItem["kind"],
  code: string,
  name: string,
  yoy: number | null,
  contribYoy: number | null,
  category = "食料"
): MonthItem => ({
  code,
  name,
  kind,
  category,
  weight10k: 10,
  index: 100,
  mom: null,
  yoy,
  contribYoy,
  contribMom: null,
});

/** 分類の順（費目 → 中分類 → 小分類 → 品目）に並んだ月のデータ */
const ITEMS: MonthItem[] = [
  row("major", "0002", "食料", 3, 0.9),
  row("group", "0003", "穀類", -8.8, -0.23),
  row("group", "0004", "米類", -20, -0.2),
  row("item", "1001", "うるち米Ａ", -10, -0.02),
  row("item", "1002", "うるち米Ｂ", -29.8, -0.22),
  row("item", "1021", "食パン", 1, 0.01),
  row("group", "0034", "調理食品", 4.2, 0.16),
  row("item", "1500", "からあげ", 9.6, 0.04),
  row("item", "1501", "コロッケ", 5, 0.03),
  row("group", "0021", "野菜・海藻", 5, 0.16),
  row("group", "0022", "生鮮野菜", 8.1, 0.15),
  row("item", "1300", "レタス", 95.6, 0.08),
  row("group", "0042", "外食", 0.5, 0.02),
  row("item", "1700", "すし（外食）", 1, 0.02),
  row("major", "0118", "教育", -5, -0.14, "教育"),
  row("group", "0119", "授業料等", -6.4, -0.14, "教育"),
  row("item", "9000", "高等学校授業料（私立）", -73.2, -0.15, "教育"),
];

describe("buildBreakdown", () => {
  const { up, down } = buildBreakdown(ITEMS, "contribYoy");

  it("中分類ごとの寄与度と、同じ向きに一番効いた品目を選ぶ", () => {
    expect(up).toHaveLength(1);
    expect(up[0]).toMatchObject({ name: "食料", contrib: 0.9 });
    expect(up[0].middles.map((m) => [m.name, m.contrib, m.topItem?.name])).toEqual([
      ["調理食品", 0.16, "からあげ"],
      ["生鮮野菜", 0.15, "レタス"],
      // 0.1 未満でも、上昇は最低5件まで大きい順に足す
      ["外食", 0.02, "すし（外食）"],
    ]);
  });

  it("下落は、小分類（米類）の下の品目も中分類（穀類）に入れて選ぶ", () => {
    expect(down.map((major) => major.name)).toEqual(["食料", "教育"]);
    expect(down[0].middles[0]).toMatchObject({
      name: "穀類",
      rate: -8.8,
      topItem: { name: "うるち米Ｂ", rate: -29.8, contrib: -0.22 },
    });
    expect(down[1].middles[0].topItem?.name).toBe("高等学校授業料（私立）");
  });

  it("寄与度のない月（前年同月比がない月）は空になる", () => {
    const empty = buildBreakdown(
      ITEMS.map((item) => ({ ...item, contribYoy: null })),
      "contribYoy"
    );
    expect(empty).toEqual({ up: [], down: [] });
  });
});
