import { describe, expect, it } from "vitest";
import { MASK, maskPersonalInfo } from "./mask";

describe("maskPersonalInfo", () => {
  it("メールアドレス・URL・電話番号・郵便番号を伏せる", () => {
    expect(maskPersonalInfo("連絡は taro.y+cpi@example.co.jp まで")).toBe(`連絡は ${MASK} まで`);
    expect(maskPersonalInfo("詳しくは https://example.com/a?b=1 を見て")).toBe(`詳しくは ${MASK} を見て`);
    expect(maskPersonalInfo("電話 090-1234-5678 か 03 1234 5678")).toBe(`電話 ${MASK} か ${MASK}`);
    expect(maskPersonalInfo("携帯は０９０１２３４５６７８です")).toBe(`携帯は${MASK}です`);
    expect(maskPersonalInfo("〒370-3601 の近く")).toBe(`${MASK} の近く`);
  });

  it("物価の数字や年月はそのまま残す", () => {
    const text = "卵が1パック298円から350円に、2.3%の上昇は2026年10月の数字";
    expect(maskPersonalInfo(text)).toBe(text);
  });
});
