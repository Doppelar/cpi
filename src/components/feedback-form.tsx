"use client";

import { useActionState, useEffect, useState } from "react";
import { type FeedbackState, submitFeedback } from "@/app/feedback/actions";
import {
  BODY_MAX,
  FEEDBACK_KINDS,
  FEEDBACK_TOPICS,
  type FeedbackInput,
} from "@/lib/feedback/validate";

const fieldClass =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-base text-ink focus:border-accent focus:outline-none";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-up">{message}</p> : null;
}

export function FeedbackForm({
  initialTopic,
  page,
}: {
  initialTopic: FeedbackInput["topic"];
  page: string | null;
}) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    submitFeedback,
    { status: "idle" }
  );
  const [length, setLength] = useState(0);
  // 画面の準備（読み込み）が終わるまでは送信ボタンを押せないようにする
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-line bg-card p-6" role="status">
        <p className="text-lg font-bold">ご意見ありがとうございました。</p>
        <p className="mt-2 text-sm text-ink-2">
          いただいた内容は、サイトの改善の参考にさせていただきます。個別のお返事はお約束できませんが、すべて目を通します。
        </p>
        <a href="/feedback" className="mt-4 inline-block text-sm text-accent underline">
          続けて別のご意見を送る
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-line bg-card p-5 sm:p-6">
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg bg-up-soft px-3 py-2 text-sm text-ink">
          {state.message}
        </p>
      )}
      <input type="hidden" name="page" value={page ?? ""} />
      {/* 機械的な投稿よけ。人には見えない */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          ウェブサイト
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="topic" className="mb-1 block font-semibold">
          どの指数についてですか <span className="text-xs text-up">必須</span>
        </label>
        <select id="topic" name="topic" defaultValue={initialTopic} className={fieldClass}>
          {FEEDBACK_TOPICS.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
        <FieldError message={state.errors?.topic} />
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold">
          ご意見の種類 <span className="text-xs text-up">必須</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_KINDS.map((kind, i) => (
            <label
              key={kind}
              className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="kind"
                value={kind}
                defaultChecked={i === 0}
                className="sr-only"
              />
              {kind}
            </label>
          ))}
        </div>
        <FieldError message={state.errors?.kind} />
      </fieldset>

      <div>
        <label htmlFor="body" className="mb-1 block font-semibold">
          ご意見 <span className="text-xs text-up">必須</span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={7}
          maxLength={BODY_MAX}
          onChange={(event) => setLength(event.target.value.length)}
          placeholder="例：「寄与度」の説明がわかりやすかった／東京都区部の昔のデータも見たい／○月の数字が公表値と違う など"
          className={fieldClass}
        />
        <p className="mt-1 text-right text-xs text-ink-3">
          {length} / {BODY_MAX}文字
        </p>
        <FieldError message={state.errors?.body} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block font-semibold">
            お名前・ニックネーム <span className="text-xs text-ink-3">任意</span>
          </label>
          <input id="name" name="name" maxLength={40} className={fieldClass} />
          <FieldError message={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block font-semibold">
            メールアドレス <span className="text-xs text-ink-3">任意</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-ink-3">お返事が必要な場合のみご記入ください。</p>
          <FieldError message={state.errors?.email} />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-3">
        いただいたご意見はサイトの改善のためにだけ使い、サイト上には公開しません。お名前・メールアドレスは、お返事が必要な場合の連絡にだけ使います。
        病気の相談や、個人を特定できる情報は書かないでください。
      </p>

      <button
        type="submit"
        disabled={pending || !ready}
        className="w-full rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-60 sm:w-auto"
      >
        {!ready ? "準備中…" : pending ? "送信しています…" : "送信する"}
      </button>
    </form>
  );
}
