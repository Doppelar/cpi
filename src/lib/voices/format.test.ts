import { describe, expect, it } from "vitest";
import {
  feedbackTopicId,
  lastQuestion,
  pairQuestionsAndAnswers,
  parseVoiceTopic,
  parseVoiceType,
} from "./format";
import { MASK } from "./mask";

describe("lastQuestion", () => {
  it("最後の質問の一文を取り出し、「2つ目の質問です」などの前置きを除く", () => {
    expect(
      lastQuestion(
        "ありがとうございます。キノコの値上がりですね。\n\nでは、2つ目の質問です。指数の上がり方と比べて、あなたの実感はどうですか？"
      )
    ).toBe("指数の上がり方と比べて、あなたの実感はどうですか？");
    expect(lastQuestion("では、最後の質問です。国に期待することはありますか？")).toBe(
      "国に期待することはありますか？"
    );
    expect(lastQuestion("ありがとうございました。")).toBe("ありがとうございました。");
  });
});

describe("pairQuestionsAndAnswers", () => {
  it("AI の質問と回答を組にし、回答の連絡先を伏せる", () => {
    expect(
      pairQuestionsAndAnswers([
        { role: "assistant", text: "こんにちは。1つ目の質問です。値上がりを感じた場面は？" },
        { role: "user", text: "卵です。連絡は 090-1234-5678 まで" },
        { role: "assistant", text: "なるほど。では、2つ目の質問です。実感はどうですか？" },
        { role: "user", text: "  " },
        { role: "user", text: "指数より高い気がします" },
      ])
    ).toEqual([
      { question: "値上がりを感じた場面は？", answer: `卵です。連絡は ${MASK} まで` },
      { question: "実感はどうですか？", answer: "指数より高い気がします" },
    ]);
  });
});

describe("テーマ・種類の読み取り", () => {
  it("ご意見の対象をテーマの ID にそろえ、知らない値は「すべて」にする", () => {
    expect(feedbackTopicId("消費者物価指数（全国）")).toBe("cpi-national");
    expect(feedbackTopicId("消費者物価指数（東京都区部）")).toBe("cpi-tokyo");
    expect(feedbackTopicId("景気動向指数")).toBe("keiki");
    expect(feedbackTopicId("サイト全体・その他")).toBe("other");
    expect(parseVoiceType("interviews")).toBe("interviews");
    expect(parseVoiceType("x")).toBe("all");
    expect(parseVoiceTopic("keiki")).toBe("keiki");
    expect(parseVoiceTopic(undefined)).toBe("all");
  });
});
