import { describe, expect, it } from "vitest";
import {
  buildStats,
  changeRate,
  contribution,
  linkFactors,
  shiftMonth,
} from "./derive";
import type { CpiTable } from "./parse";

/** 総合と2品目だけの小さな表（ウエイトは品目A:1、品目B:3） */
function makeTable(
  months: number[],
  values: [number, number, number][]
): CpiTable {
  return {
    columns: [
      {
        code: "0001",
        name: "総合",
        kind: "total",
        category: null,
        parent: null,
        serial: 1,
        weight: 4,
        weight10k: 10000,
      },
      {
        code: "1001",
        name: "品目A",
        kind: "item",
        category: "食料",
        parent: "0002",
        serial: 2,
        weight: 1,
        weight10k: 2500,
      },
      {
        code: "1002",
        name: "品目B",
        kind: "item",
        category: "住居",
        parent: "0045",
        serial: 3,
        weight: 3,
        weight10k: 7500,
      },
    ],
    months,
    values,
  };
}

describe("shiftMonth", () => {
  it("年をまたいで月をずらす", () => {
    expect(shiftMonth(202501, -1)).toBe(202412);
    expect(shiftMonth(202501, -12)).toBe(202401);
    expect(shiftMonth(202412, 1)).toBe(202501);
  });
});

describe("changeRate / contribution", () => {
  it("変化率（%）を計算し、欠けていれば null", () => {
    expect(changeRate(110, 100)).toBe(10);
    expect(changeRate(null, 100)).toBeNull();
    expect(changeRate(100, 0)).toBeNull();
  });

  it("寄与度はウエイトの割合で、総合の変化率を分け合う", () => {
    // 品目A（1/4）が100→120、品目B（3/4）が100→100 なら総合は 5% 上がる
    expect(contribution(120, 100, 1, 4, 100)).toBe(5);
    expect(contribution(100, 100, 3, 4, 100)).toBe(0);
    expect(contribution(120, 100, null, 4, 100)).toBeNull();
  });
});

describe("linkFactors", () => {
  it("新しい基準年の1年間の平均の比で、古い指数をつなぐ", () => {
    const months = Array.from({ length: 12 }, (_, i) => 202501 + i);
    const older = makeTable(
      months,
      months.map(() => [110, 120, 100])
    );
    const newer = makeTable(
      months,
      months.map(() => [100, 100, 100])
    );
    const factors = linkFactors(
      { base: 2020, table: older },
      { base: 2025, table: newer }
    );
    expect(factors.get("0001")).toBeCloseTo(100 / 110);
    expect(factors.get("1001")).toBeCloseTo(100 / 120);
  });
});

describe("buildStats", () => {
  it("前月比・前年同月比・寄与度を計算する", () => {
    const table = makeTable(
      [202401, 202501, 202502],
      [
        [100, 100, 100],
        [105, 120, 100],
        [106, 124, 100],
      ]
    );
    const rows = buildStats([{ base: 2025, table }]);
    const at = (ym: number, code: string) =>
      rows.find((row) => row.ym === ym && row.code === code);
    expect(at(202501, "0001")).toMatchObject({ yoy: 5, mom: null });
    expect(at(202501, "1001")).toMatchObject({ yoy: 20, contribYoy: 5 });
    expect(at(202501, "1002")).toMatchObject({ yoy: 0, contribYoy: 0 });
    expect(at(202502, "1001")?.mom).toBeCloseTo(3.33, 2);
    expect(at(202402, "0001")).toBeUndefined();
  });

  it("新しい基準年は翌年1月から担当し、古い月の指数は接続する", () => {
    const olderMonths = [
      202401,
      ...Array.from({ length: 12 }, (_, i) => 202501 + i),
      202601,
    ];
    const older = makeTable(
      olderMonths,
      olderMonths.map(() => [200, 200, 200])
    );
    const newerMonths = Array.from({ length: 13 }, (_, i) =>
      i < 12 ? 202501 + i : 202601
    );
    const newer = makeTable(
      newerMonths,
      newerMonths.map(() => [100, 100, 100])
    );
    const rows = buildStats([
      { base: 2020, table: older },
      { base: 2025, table: newer },
    ]);
    const total = (ym: number) =>
      rows.find((row) => row.ym === ym && row.code === "0001");
    expect(total(202401)).toMatchObject({ base: 2020, indexValue: 100 });
    expect(total(202512)).toMatchObject({ base: 2020, indexValue: 100 });
    expect(total(202601)).toMatchObject({ base: 2025, indexValue: 100 });
    // 同じ月が2つの基準年で重ならない
    expect(rows.filter((row) => row.ym === 202601)).toHaveLength(3);
  });
});
