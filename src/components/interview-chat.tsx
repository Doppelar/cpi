"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  errorText,
  INTERVIEW_TOPICS,
  type InterviewTopic,
  isClosingMessage,
  MAX_ANSWER_LENGTH,
  messageText,
} from "@/lib/interview/topics";

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function InterviewChat({
  topic,
  opening,
}: {
  topic: InterviewTopic;
  /** 最初のあいさつ（AI を呼ばずにすぐ出す） */
  opening: string;
}) {
  const id = useMemo(() => newId(), []);
  const initial = useMemo<UIMessage[]>(
    () => [{ id: "opening", role: "assistant", parts: [{ type: "text", text: opening }] }],
    [opening]
  );
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/interview", body: { topic } }),
    [topic]
  );
  const { messages, sendMessage, regenerate, clearError, status, error } = useChat({
    id,
    messages: initial,
    transport,
  });
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";
  const finished = messages.some(
    (message) => message.role === "assistant" && isClosingMessage(messageText(message))
  );
  const answered = messages.filter((message) => message.role === "user").length;
  const total = INTERVIEW_TOPICS[topic].questions.length;

  const send = () => {
    const text = input.trim();
    if (!text || busy || finished || !ready) return;
    setInput("");
    void sendMessage({ text });
  };

  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 text-sm">
        <span className="font-semibold">AIインタビュー：{INTERVIEW_TOPICS[topic].short}</span>
        <span className="tabular text-ink-3">
          {finished ? "完了" : `質問 ${Math.min(answered + 1, total)} / ${total}`}
        </span>
      </div>

      <ol className="space-y-3 px-4 py-4" aria-live="polite">
        {messages.map((message) => {
          const text = messageText(message);
          if (!text) return null;
          const mine = message.role === "user";
          return (
            <li key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 leading-relaxed ${
                  mine ? "rounded-br-sm bg-accent text-white" : "rounded-bl-sm bg-surface-2 text-ink"
                }`}
              >
                {!mine && <span className="mb-0.5 block text-xs font-semibold text-ink-3">AI</span>}
                {text}
              </div>
            </li>
          );
        })}
        {status === "submitted" && (
          <li className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2.5 text-ink-3">考えています…</div>
          </li>
        )}
      </ol>
      <div ref={bottomRef} />

      {error && (
        <div role="alert" className="mx-4 mb-3 space-y-2 rounded-lg bg-up-soft px-3 py-2 text-sm">
          <p>{errorText(error.message)}</p>
          {messages[messages.length - 1]?.role === "user" && (
            <button
              type="button"
              onClick={() => {
                clearError();
                void regenerate();
              }}
              className="rounded-full border border-line bg-card px-3 py-1 font-semibold"
            >
              もう一度送る
            </button>
          )}
        </div>
      )}

      {finished ? (
        <PublishChoice id={id} topic={topic} saving={busy} />
      ) : (
        <form
          className="space-y-2 border-t border-line px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                send();
              }
            }}
            rows={3}
            placeholder="ここに回答を書いてください（短くても大丈夫です）"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-base"
            aria-label="回答"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="tabular text-xs text-ink-3">
              {input.length} / {MAX_ANSWER_LENGTH}文字
            </span>
            <button
              type="submit"
              disabled={!ready || busy || input.trim().length === 0}
              className="rounded-full bg-accent px-6 py-2.5 font-bold text-white disabled:opacity-50"
            >
              {!ready ? "準備中…" : busy ? "返事を待っています…" : "送る"}
            </button>
          </div>
          <p className="text-xs text-ink-3">
            名前や住所など、個人がわかることは書かないでください。「終わりたい」と書けば、いつでも終われます。
          </p>
        </form>
      )}
    </div>
  );
}

/** インタビューの最後に、「みんなの声」に公開するかを選んでもらう */
function PublishChoice({
  id,
  topic,
  saving,
}: {
  id: string;
  topic: InterviewTopic;
  saving: boolean;
}) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const choose = async (publish: boolean) => {
    setSending(true);
    setProblem(null);
    try {
      // 会話の保存が終わるのを少し待ってから送る（見つからなければもう一度試す）
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetch("/api/interview/consent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, publish }),
        });
        if (response.ok) {
          setChoice(publish);
          return;
        }
        if (response.status !== 404) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setProblem("うまく保存できませんでした。もう一度選んでください。");
    } catch {
      setProblem("うまく保存できませんでした。もう一度選んでください。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-line px-4 py-4 text-sm">
      <p className="font-semibold">ご協力ありがとうございました。</p>
      {choice === null ? (
        <>
          <p className="text-ink-2">
            このインタビューの内容を、AIが要約して「みんなの声」のページで公開してもよいですか？（要約の下で、やり取りの全文も見られるようになります）
            名前などは表示せず、電話番号などの連絡先は自動で伏せ字にします。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending || saving}
              onClick={() => void choose(true)}
              className="rounded-full bg-accent px-5 py-2 font-bold text-white disabled:opacity-50"
            >
              公開してよい
            </button>
            <button
              type="button"
              disabled={sending || saving}
              onClick={() => void choose(false)}
              className="rounded-full border border-line bg-card px-5 py-2 font-semibold disabled:opacity-50"
            >
              公開しない
            </button>
          </div>
          {problem && <p className="text-up">{problem}</p>}
        </>
      ) : (
        <p className="text-ink-2">
          {choice
            ? "AIが要約して「みんなの声」に掲載しました（不適切な内容は掲載しないことがあります）。"
            : "公開しません。いただいたお話は、サイトの改善の参考にだけ使います。"}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        <a href="/voices" className="text-accent underline">みんなの声を見る</a>
        <a href={INTERVIEW_TOPICS[topic].path} className="text-accent underline">グラフのページにもどる</a>
      </div>
    </div>
  );
}
