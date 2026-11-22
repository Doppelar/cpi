import { describe, expect, it } from "vitest";
import {
  buildCiRows,
  buildCoincidentContribRows,
  keikiRangeStart,
  recessionsWithin,
  usedGroups,
} from "./chart-data";
import type { MonthlyIndex } from "./parse";

const month = (ym: number, coincident: number | null): MonthlyIndex => ({
  ym,
  ciLeading: 100,
  ciCoincident: coincident,
  ciLagging: 100,
  diLeading: 50,
  diCoincident: 50,
  diLagging: 50,
});

describe("keikiRangeStart", () => {
  it("最新月を含めた5年・10年の始まりを返す", () => {
    expect(keikiRangeStart(202609, "5y")).toBe(202110);
    expect(keikiRangeStart(202609, "10y")).toBe(201610);
    expect(keikiRangeStart(202609, "all")).toBe(0);
  });
});

describe("buildCiRows", () => {
  it("CI のない月を除き、前月差と移動平均の前月差をつける", () => {
    const rows = buildCiRows([
      month(198412, null),
      month(198501, 100),
      month(198502, 101),
      month(198503, 103),
      month(198504, 102),
    ]);
    expect(rows.map((row) => row.ym)).toEqual([198501, 198502, 198503, 198504]);
    expect(rows.map((row) => row.coincidentDiff)).toEqual([null, 1, 2, -1]);
    // 3か月平均：101.333 → 102 なので前月差は 0.667
    expect(rows[3].ma3Diff).toBeCloseTo(0.667, 3);
    expect(rows[3].ma7Diff).toBeNull();
  });
});

describe("buildCoincidentContribRows", () => {
  it("採用系列の寄与度を分野ごとに足し、前月差を添える", () => {
    const ci = buildCiRows([month(202608, 118.8), month(202609, 119.5)]);
    const rows = buildCoincidentContribRows(
      [
        { ym: 202609, name: "生産指数(鉱工業)", contribution: 0.37 },
        { ym: 202609, name: "耐久消費財出荷指数", contribution: 0.22 },
        { ym: 202609, name: "輸出数量指数", contribution: -0.09 },
        { ym: 202001, name: "輸出数量指数", contribution: 1 },
      ],
      ci
    );
    expect(rows).toEqual([
      { ym: 202609, diff: 0.7, "生産・出荷": 0.59, 輸出: -0.09 },
    ]);
    expect(usedGroups(rows)).toEqual(["生産・出荷", "輸出"]);
  });
});

describe("recessionsWithin", () => {
  it("表示期間にかかる景気後退期を、期間の内側に切って返す", () => {
    expect(recessionsWithin(201901, 202609)).toEqual([
      { start: 201901, end: 202005 },
    ]);
    expect(recessionsWithin(202101, 202609)).toEqual([]);
  });
});
