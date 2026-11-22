import { describe, expect, it } from "vitest";
import {
  backwardMovingAverage,
  coincidentGroupOf,
  extractJudgment,
  judgmentLabel,
  monthlyDiff,
  parseComponents,
  parseLongSeries,
  TREND_CODE,
} from "./parse";

describe("parseLongSeries", () => {
  it("時間軸コードの行から CI・DI を読み、値のない月は除く", () => {
    const rows = [
      ["", "", "", "ＣＩ指数"],
      ["時間軸コード", "西暦年", "月", "先行指数"],
      ["1980000101", 1980, 1, "", "", "", "", "", "", 54.5, 75, 83.3],
      ["2026000909", 2026, 9, 116.4, 119.5, 116, 114, 116, 112, 55.6, 37.5, 100],
      ["", "", "", "", "", "", "", "", "", "", "", ""],
    ];
    expect(parseLongSeries(rows)).toEqual([
      {
        ym: 198001,
        ciLeading: null,
        ciCoincident: null,
        ciLagging: null,
        diLeading: 54.5,
        diCoincident: 75,
        diLagging: 83.3,
      },
      {
        ym: 202609,
        ciLeading: 116.4,
        ciCoincident: 119.5,
        ciLagging: 116,
        diLeading: 55.6,
        diCoincident: 37.5,
        diLagging: 100,
      },
    ]);
  });
});

describe("parseComponents", () => {
  const values = [
    ["", "", "", "L1", "L2(注)", "L2A"],
    ["時間軸コード", "西暦年", "月", "在庫率", "求人数", "参考"],
    ["Time", "Calendar year", "Month", "a", "b", "c"],
    ["", "", "", "(令和2年=100)", "(人)", ""],
    ["", "", "", "2020=100", "persons", ""],
    ["2026000909", 2026, 9, 113.3, 799039, 1],
  ];
  const contributions = [
    ["", "", "", "", "L1", "L2"],
    ["時間軸コード", "西暦年", "月", "一致指数トレンド成分", "在庫率", "求人数"],
    ["2026000909", 2026, 9, -0.02, -0.63, 0.23],
  ];

  it("寄与度の表の系列に、元の値と単位をつなぐ（参考系列は除く）", () => {
    expect(parseComponents("leading", contributions, values)).toEqual([
      {
        ym: 202609,
        series: "leading",
        code: "L1",
        name: "在庫率",
        value: 113.3,
        unit: "令和2年=100",
        contribution: -0.63,
      },
      {
        ym: 202609,
        series: "leading",
        code: "L2",
        name: "求人数",
        value: 799039,
        unit: "人",
        contribution: 0.23,
      },
      {
        ym: 202609,
        series: "leading",
        code: TREND_CODE,
        name: "一致指数のトレンド成分",
        value: null,
        unit: null,
        contribution: -0.02,
      },
    ]);
  });
});

describe("extractJudgment", () => {
  it("概要 PDF の文字から、対象月と基調判断を取り出す", () => {
    const text = `令和8(2026)年11月9日 景気動向指数(令和8(2026)年9月分速報)結果の概要
      ②一致指数の基調判断 景気動向指数（ＣＩ一致指数）は、改善を 示している。(注)…`;
    expect(extractJudgment(text)).toEqual({
      ym: 202609,
      text: "改善を示している。",
      label: "改善",
    });
    expect(extractJudgment("関係のない文書")).toBeNull();
  });

  it("局面変化は上方・下方を区別する", () => {
    expect(judgmentLabel("下方への局面変化を示している。")).toBe(
      "下方への局面変化"
    );
    expect(judgmentLabel("下げ止まりを示している。")).toBe("下げ止まり");
    expect(judgmentLabel("足踏みを示している。")).toBe("足踏み");
  });
});

describe("backwardMovingAverage / monthlyDiff", () => {
  it("後方移動平均と前月差を計算する（欠けた月は null）", () => {
    expect(backwardMovingAverage([1, 2, 3, 4, null, 6], 3)).toEqual([
      null,
      null,
      2,
      3,
      null,
      null,
    ]);
    expect(monthlyDiff([1, 1.5, null, 3])).toEqual([null, 0.5, null, null]);
  });
});

describe("coincidentGroupOf", () => {
  it("一致指数の採用系列を分野に分ける", () => {
    expect(coincidentGroupOf("生産指数(鉱工業)")).toBe("生産・出荷");
    expect(coincidentGroupOf("有効求人倍率(除学卒)")).toBe("雇用");
    expect(coincidentGroupOf("商業販売額(小売業)(前年同月比)")).toBe("販売");
    expect(coincidentGroupOf("営業利益(全産業)")).toBe("企業収益");
    expect(coincidentGroupOf("輸出数量指数")).toBe("輸出");
    expect(coincidentGroupOf("新しい系列")).toBe("その他");
  });
});
