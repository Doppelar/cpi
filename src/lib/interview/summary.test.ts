import { describe, expect, it } from "vitest";
import { MASK } from "@/lib/voices/mask";
import { buildDigestPrompt, buildSummaryPrompt, parseBullets } from "./summary";

describe("buildSummaryPrompt", () => {
  it("テーマと、回答者・インタビュアーを区別した会話を入れる", () => {
    const prompt = buildSummaryPrompt("keiki", [
      { role: "assistant", text: "景気の実感は？" },
      { role: "user", text: "あまり良くないです" },
    ]);
    expect(prompt).toContain("景気動向指数（景気の実感）");
    expect(prompt).toContain("インタビュアー：景気の実感は？");
    expect(prompt).toContain("回答者：あまり良くないです");
  });
});

describe("buildDigestPrompt", () => {
  it("件数と、番号つきの要約を並べる", () => {
    const prompt = buildDigestPrompt("cpi-national", [["卵の値上がり"], ["外食を減らした", "給料は横ばい"]]);
    expect(prompt).toContain("AIインタビュー2件");
    expect(prompt).toContain("【2】外食を減らした 給料は横ばい");
  });
});

describe("parseBullets", () => {
  it("箇条書きの行だけを取り出し、記号と太字を除き、連絡先を伏せる", () => {
    const text = [
      "以下が要約です。",
      "・卵とお米の値上がりを実感",
      "- **外食**を減らして節約",
      "1. 連絡先は 090-1234-5678",
      "",
      "以上です。",
    ].join("\n");
    expect(parseBullets(text)).toEqual([
      "卵とお米の値上がりを実感",
      "外食を減らして節約",
      `連絡先は ${MASK}`,
    ]);
  });

  it("上限の数までにする", () => {
    expect(parseBullets("・a\n・b\n・c", 2)).toEqual(["a", "b"]);
  });
});
