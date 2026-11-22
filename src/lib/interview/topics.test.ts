import { describe, expect, it } from "vitest";
import {
  buildInstructions,
  CLOSING_PHRASE,
  checkConversation,
  MAX_ANSWER_LENGTH,
  MAX_USER_TURNS,
  messageText,
  openingMessage,
} from "./topics";

const user = (text: string) => ({ role: "user", parts: [{ type: "text", text }] });
const ai = (text: string) => ({ role: "assistant", parts: [{ type: "text", text }] });

describe("openingMessage", () => {
  it("あいさつ・数字の見出し・1つ目の質問を並べる", () => {
    const text = openingMessage("keiki", "2026年9月の国の判断は「改善」です。");
    expect(text).toContain("景気について");
    expect(text).toContain("国の判断は「改善」");
    expect(text).toContain("1つ目の質問です。国の判断と比べて");
  });
});

describe("buildInstructions", () => {
  it("質問の一覧とデータを入れ、全部聞き終えたらまとめるよう指示する", () => {
    const early = buildInstructions("cpi-national", "総合 +2.3%", 2);
    expect(early).toContain("1. 最近の買い物");
    expect(early).toContain("総合 +2.3%");
    expect(early).not.toContain("質問はすべて終わりました");
    const late = buildInstructions("cpi-national", "総合 +2.3%", 5);
    expect(late).toContain("質問はすべて終わりました");
    expect(late).toContain(CLOSING_PHRASE);
  });
});

describe("messageText", () => {
  it("テキストの部分だけをつなぐ", () => {
    expect(
      messageText({
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "text", text: "こんにちは" },
          { type: "text", text: "。" },
        ],
      })
    ).toBe("こんにちは。");
  });
});

describe("checkConversation", () => {
  it("最後が利用者の回答なら、回答の数を返す", () => {
    expect(checkConversation([ai("質問"), user("答え"), ai("質問2"), user("答え2")])).toEqual({
      ok: true,
      userTurns: 2,
    });
  });

  it("空・長すぎる回答、回答の数の上限、終了後の回答を拒否する", () => {
    expect(checkConversation([]).ok).toBe(false);
    expect(checkConversation([ai("質問"), user("   ")]).ok).toBe(false);
    expect(
      checkConversation([ai("質問"), user("あ".repeat(MAX_ANSWER_LENGTH + 1))]).ok
    ).toBe(false);
    const many = Array.from({ length: MAX_USER_TURNS + 1 }, (_, i) => [ai("q"), user(`a${i}`)]).flat();
    expect(checkConversation(many)).toMatchObject({ ok: false, status: 409 });
    expect(
      checkConversation([ai(`${CLOSING_PHRASE}。ありがとうございました。`), user("まだ話したい")])
    ).toMatchObject({ ok: false, status: 409 });
  });
});
