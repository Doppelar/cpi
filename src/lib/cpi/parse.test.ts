import { describe, expect, it } from "vitest";
import { parseCpiCsv, parseCsvLine } from "./parse";

export const SAMPLE_CSV = [
  "類・品目,総合,食料,穀類,米,パン,住居,家賃,生鮮食品",
  'Group/Item,All items,Food,Cereals,Rice,"Bread, white",Housing,Rent,Fresh food',
  "類・品目符号(Group/Item code),0001,0002,0003,1001,1021,0045,3001,0157",
  "含類総連番(Serial number),001,002,003,004,005,006,007,008",
  "ウエイト(Weight),1000,600,200,100,100,400,400,50",
  "ウエイト１万分比(Weight per 10000),10000,6000,2000,1000,1000,4000,4000,500",
  "202401,100,100,100,100,100,100,100,100",
  "202402,101,102,103,106,100,99.5,99.5,",
].join("\r\n");

describe("parseCsvLine", () => {
  it("ダブルクォート内のカンマと、二重のダブルクォートを扱う", () => {
    expect(parseCsvLine('a,"b, c","d ""e"""')).toEqual(["a", "b, c", 'd "e"']);
  });
});

describe("parseCpiCsv", () => {
  const table = parseCpiCsv(SAMPLE_CSV);

  it("類・品目の種類と、属する10大費目・類を判定する", () => {
    expect(
      table.columns.map(({ code, kind, category, parent }) => ({
        code,
        kind,
        category,
        parent,
      }))
    ).toEqual([
      { code: "0001", kind: "total", category: null, parent: null },
      { code: "0002", kind: "major", category: "食料", parent: "0001" },
      { code: "0003", kind: "group", category: "食料", parent: null },
      { code: "1001", kind: "item", category: "食料", parent: "0003" },
      { code: "1021", kind: "item", category: "食料", parent: "0003" },
      { code: "0045", kind: "major", category: "住居", parent: "0001" },
      { code: "3001", kind: "item", category: "住居", parent: "0045" },
      { code: "0157", kind: "special", category: null, parent: null },
    ]);
  });

  it("ウエイトと、月ごとの指数（欠測は null）を読む", () => {
    expect(table.columns[3]).toMatchObject({ weight: 100, weight10k: 1000 });
    expect(table.months).toEqual([202401, 202402]);
    expect(table.values[1]).toEqual([
      101,
      102,
      103,
      106,
      100,
      99.5,
      99.5,
      null,
    ]);
  });
});
