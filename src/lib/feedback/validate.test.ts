import { describe, expect, it } from "vitest";
import { BODY_MAX, topicFromPath, validateFeedback } from "./validate";

const base = {
  topic: "景気動向指数",
  kind: "ご意見・ご感想",
  body: "  グラフが見やすいです。\r\nありがとうございます。  ",
  name: "",
  email: "",
};

describe("validateFeedback", () => {
  it("前後の空白を除き、改行をそろえ、空の任意項目は null にする", () => {
    expect(validateFeedback(base)).toEqual({
      ok: true,
      value: {
        topic: "景気動向指数",
        kind: "ご意見・ご感想",
        body: "グラフが見やすいです。\nありがとうございます。",
        name: null,
        email: null,
      },
    });
  });

  it("選択肢にない値・空の本文・長すぎる本文・正しくないメールを拒否する", () => {
    const result = validateFeedback({
      topic: "株価",
      kind: "",
      body: "あ".repeat(BODY_MAX + 1),
      name: "名".repeat(41),
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["body", "email", "kind", "name", "topic"].sort()
      );
    }
    const empty = validateFeedback({ ...base, body: "   " });
    expect(empty.ok).toBe(false);
  });

  it("名前とメールは任意で、入力されていれば保存する", () => {
    const result = validateFeedback({
      ...base,
      name: "みらい",
      email: "someone@example.com",
    });
    expect(result.ok && result.value).toMatchObject({
      name: "みらい",
      email: "someone@example.com",
    });
  });
});

describe("topicFromPath", () => {
  it("送信元のページから対象の初期値を決める", () => {
    expect(topicFromPath("/")).toBe("消費者物価指数（全国）");
    expect(topicFromPath("/tokyo")).toBe("消費者物価指数（東京都区部）");
    expect(topicFromPath("/keiki")).toBe("景気動向指数");
    expect(topicFromPath("/about")).toBe("サイト全体・その他");
    expect(topicFromPath(undefined)).toBe("サイト全体・その他");
  });
});
