import { describe, expect, it } from "vitest";
import { aggregateAnswers, percent, validateImpression } from "./surveys";

const cpiFields = {
  survey: ["cpi-national"],
  ym: ["202610"],
  q_feel: ["指数よりもっと上がっている"],
  q_life: ["やや苦しくなった"],
  q_items: ["お米", "電気・ガス代", "お米", "宇宙旅行"],
  age: ["40代"],
  comment: ["  スーパーに行くたびに高いと感じます。\r\n  "],
};

describe("validateImpression", () => {
  it("選択肢にない値と重複を除き、感想の空白を整える", () => {
    expect(validateImpression(cpiFields)).toEqual({
      ok: true,
      value: {
        survey: "cpi-national",
        ym: 202610,
        answers: {
          feel: ["指数よりもっと上がっている"],
          life: ["やや苦しくなった"],
          items: ["お米", "電気・ガス代"],
        },
        age: "40代",
        comment: "スーパーに行くたびに高いと感じます。",
      },
    });
  });

  it("選ばれていない質問があれば受け付けない", () => {
    const result = validateImpression({ ...cpiFields, q_life: [] });
    expect(result.ok).toBe(false);
  });

  it("1つだけ選ぶ質問は、最初の1つだけにする。年代「答えない」と空の感想は null", () => {
    const result = validateImpression({
      ...cpiFields,
      q_feel: ["わからない", "だいたい指数どおり"],
      age: ["答えない"],
      comment: [""],
    });
    expect(result.ok && result.value).toMatchObject({
      answers: { feel: ["わからない"] },
      age: null,
      comment: null,
    });
  });

  it("知らないアンケート・長すぎる感想は受け付けない", () => {
    expect(validateImpression({ ...cpiFields, survey: ["other"] }).ok).toBe(false);
    expect(
      validateImpression({ ...cpiFields, comment: ["あ".repeat(501)] }).ok
    ).toBe(false);
  });
});

describe("aggregateAnswers", () => {
  it("選択肢ごとの人数と、質問ごとの回答者数を数える", () => {
    const result = aggregateAnswers("keiki", [
      { feel: ["変わらない"], outlook: ["悪くなる"], reasons: ["物価", "給料・収入"] },
      { feel: ["変わらない"], outlook: ["わからない"], reasons: ["物価"] },
      { feel: ["よくなっている"], reasons: ["謎の理由"] },
    ]);
    expect(result.total).toBe(3);
    const feel = result.questions.find((q) => q.id === "feel");
    expect(feel?.respondents).toBe(3);
    expect(feel?.counts.find((c) => c.option === "変わらない")?.count).toBe(2);
    const outlook = result.questions.find((q) => q.id === "outlook");
    expect(outlook?.respondents).toBe(2);
    const reasons = result.questions.find((q) => q.id === "reasons");
    expect(reasons?.respondents).toBe(2);
    expect(reasons?.counts.find((c) => c.option === "物価")?.count).toBe(2);
  });

  it("割合は整数の%（0人なら0）", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});
