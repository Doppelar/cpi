import { describe, expect, it } from "vitest";
import {
  buildContribRows,
  buildHeadlineRows,
  formatSigned,
  rangeStart,
  topMovers,
} from "./chart-data";
import type { MonthItem } from "./types";

const item = (
  code: string,
  contribYoy: number | null,
  kind: MonthItem["kind"] = "item"
): MonthItem => ({
  code,
  name: code,
  kind,
  category: "食料",
  weight10k: 10,
  index: 100,
  mom: null,
  yoy: contribYoy == null ? null : contribYoy * 10,
  contribYoy,
  contribMom: null,
});

describe("rangeStart", () => {
  it("最新月を含めた12か月・36か月の始まりを返す", () => {
    expect(rangeStart(202610, "1y")).toBe(202511);
    expect(rangeStart(202610, "3y")).toBe(202311);
    expect(rangeStart(202610, "all")).toBe(0);
  });
});

describe("buildHeadlineRows", () => {
  it("系列を年月ごとにまとめ、総合の前年同月比がない月は除く", () => {
    const rows = buildHeadlineRows([
      { ym: 202602, code: "0001", index: 1, mom: 0, yoy: 2 },
      { ym: 202602, code: "0161", index: 1, mom: 0, yoy: 1.5 },
      { ym: 202601, code: "0001", index: 1, mom: 0, yoy: null },
      { ym: 202603, code: "0178", index: 1, mom: 0, yoy: 1 },
      { ym: 202603, code: "0001", index: 1, mom: 0, yoy: 3 },
    ]);
    expect(rows).toEqual([
      { ym: 202602, total: 2, core: 1.5, coreCore: null },
      { ym: 202603, total: 3, core: null, coreCore: 1 },
    ]);
  });
});

describe("buildContribRows", () => {
  it("色分けしない費目を「その他」に足し合わせる", () => {
    const rows = buildContribRows(
      [
        { ym: 202601, name: "食料", yoy: 5, contribYoy: 1.2 },
        { ym: 202601, name: "教育", yoy: 1, contribYoy: 0.1 },
        { ym: 202601, name: "保健医療", yoy: 1, contribYoy: 0.2 },
        { ym: 202512, name: "食料", yoy: 5, contribYoy: 1 },
      ],
      [{ ym: 202601, total: 1.5, core: null, coreCore: null }]
    );
    expect(rows).toEqual([
      { ym: 202601, total: 1.5, 食料: 1.2, その他: 0.3 },
    ]);
  });
});

describe("topMovers", () => {
  it("品目だけを、上がった順・下がった順に n 件ずつ返す", () => {
    const items = [
      item("a", 0.3),
      item("b", -0.2),
      item("c", 0.5),
      item("d", 0),
      item("e", null),
      item("f", -0.4),
      item("g", 9, "major"),
    ];
    const { up, down } = topMovers(items, "contribYoy", 1);
    expect(up.map((x) => x.code)).toEqual(["c"]);
    expect(down.map((x) => x.code)).toEqual(["f"]);
  });
});

describe("formatSigned", () => {
  it("符号をつけ、0 と欠測を見やすくする", () => {
    expect(formatSigned(2.33)).toBe("+2.3%");
    expect(formatSigned(-0.04)).toBe("0.0%");
    expect(formatSigned(-1.25, 2, "pt")).toBe("-1.25pt");
    expect(formatSigned(null)).toBe("—");
  });
});
