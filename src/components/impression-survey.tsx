"use client";

import { useActionState, useEffect, useState } from "react";
import { type ImpressionState, submitImpression } from "@/app/impressions/actions";
import { formatMonth } from "@/lib/cpi/areas";
import {
  AGE_OPTIONS,
  COMMENT_MAX,
  percent,
  SURVEYS,
  type SurveyId,
  type SurveyResult,
} from "@/lib/impressions/surveys";

const storageKey = (survey: SurveyId, ym: number) => `impression-${survey}-${ym}`;

/** みんなの回答（質問ごとの割合の横棒） */
function Results({
  survey,
  result,
  value,
  days,
}: {
  survey: SurveyId;
  result: SurveyResult;
  value: string;
  days: number;
}) {
  if (result.total === 0) {
    return <p className="text-sm text-ink-3">まだ回答がありません。最初の回答をお寄せください。</p>;
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-2">
        直近{days}日の回答 <strong className="tabular">{result.total}人</strong>
        （このサイトに答えた人の集計で、世の中全体の割合とは限りません）
      </p>
      {SURVEYS[survey].questions.map((question) => {
        const data = result.questions.find((q) => q.id === question.id);
        if (!data) return null;
        const max = Math.max(...data.counts.map((c) => c.count), 1);
        return (
          <div key={question.id}>
            <p className="mb-2 text-sm font-semibold">
              {question.label.replace("{value}", value)}
              {question.multiple && (
                <span className="ml-1 font-normal text-ink-3">（回答者に占める割合）</span>
              )}
            </p>
            <ul className="space-y-1">
              {data.counts.map(({ option, count }) => (
                <li
                  key={option}
                  className="grid grid-cols-[minmax(0,9.5rem)_1fr_4.5rem] items-center gap-2 text-sm sm:grid-cols-[13rem_1fr_5rem]"
                >
                  <span className="truncate" title={option}>
                    {option}
                  </span>
                  <span className="h-3 rounded-r bg-surface-2">
                    <span
                      className="block h-3 rounded-r bg-accent"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </span>
                  <span className="tabular text-right">
                    <strong>{percent(count, data.respondents)}%</strong>
                    <span className="ml-1 text-xs text-ink-3">{count}人</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** 選択ボタン（見た目はチップ、中身はラジオ／チェックボックス） */
function Choice({
  name,
  value,
  multiple,
}: {
  name: string;
  value: string;
  multiple: boolean;
}) {
  return (
    <label className="cursor-pointer select-none rounded-full border border-line bg-card px-3 py-2 text-sm leading-none has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
      <input
        type={multiple ? "checkbox" : "radio"}
        name={name}
        value={value}
        className="sr-only"
      />
      {value}
    </label>
  );
}

export function ImpressionSurvey({
  survey,
  ym,
  value,
  initialResult,
  days,
}: {
  survey: SurveyId;
  /** 見ている指数の年月 */
  ym: number;
  /** 質問文に入れる指数の値（「2.3%上がっています」「改善」など） */
  value: string;
  initialResult: SurveyResult;
  days: number;
}) {
  const [state, action, pending] = useActionState<ImpressionState, FormData>(
    submitImpression,
    { status: "idle" }
  );
  const [answered, setAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [length, setLength] = useState(0);
  // 画面の準備（読み込み）が終わるまでは送信ボタンを押せないようにする
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  useEffect(() => {
    try {
      setAnswered(localStorage.getItem(storageKey(survey, ym)) === "1");
    } catch {
      // 覚えておけなくても回答はできる
    }
  }, [survey, ym]);

  useEffect(() => {
    if (state.status !== "sent") return;
    setAnswered(true);
    setShowResults(true);
    try {
      localStorage.setItem(storageKey(survey, ym), "1");
    } catch {
      // 何もしない
    }
  }, [state.status, survey, ym]);

  const result = state.result ?? initialResult;
  const definition = SURVEYS[survey];

  return (
    <section id="impression" className="scroll-mt-4 space-y-4 rounded-2xl border-2 border-accent/30 bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">この数字を見て、あなたはどう感じますか？</h2>
        <p className="mt-1 text-sm text-ink-2">
          {formatMonth(ym)}の{definition.title}について、あなたの実感を教えてください。ボタンを選ぶだけで、30秒ほどで終わります。回答は匿名で、選んだ結果は「みんなの実感」として下に集計されます。
        </p>
      </div>

      {state.status === "sent" ? (
        <p role="status" className="rounded-lg bg-surface-2 px-4 py-3 font-semibold">
          ご回答ありがとうございました。みんなの実感は下のとおりです。
        </p>
      ) : answered ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 px-4 py-3 text-sm">
          <span>この月の数字には、すでに回答いただいています。</span>
          <button
            type="button"
            onClick={() => setAnswered(false)}
            className="text-accent underline"
          >
            もう一度答える
          </button>
        </div>
      ) : (
        <form action={action} className="space-y-5">
          {state.status === "error" && state.message && (
            <p role="alert" className="rounded-lg bg-up-soft px-3 py-2 text-sm">
              {state.message}
            </p>
          )}
          <input type="hidden" name="survey" value={survey} />
          <input type="hidden" name="ym" value={ym} />
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          {definition.questions.map((question, index) => (
            <fieldset key={question.id}>
              <legend className="mb-2 font-semibold">
                <span className="mr-1 text-accent">Q{index + 1}.</span>
                {question.label.replace("{value}", value)}
              </legend>
              <div className="flex flex-wrap gap-2">
                {question.options.map((option) => (
                  <Choice
                    key={option}
                    name={`q_${question.id}`}
                    value={option}
                    multiple={question.multiple}
                  />
                ))}
              </div>
            </fieldset>
          ))}

          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <div>
              <label htmlFor={`age-${survey}`} className="mb-1 block text-sm font-semibold">
                年代 <span className="text-xs font-normal text-ink-3">任意</span>
              </label>
              <select
                id={`age-${survey}`}
                name="age"
                defaultValue="答えない"
                className="w-full rounded-lg border border-line bg-card px-3 py-2 text-base"
              >
                {AGE_OPTIONS.map((age) => (
                  <option key={age}>{age}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`comment-${survey}`} className="mb-1 block text-sm font-semibold">
                感想・実感（自由記入） <span className="text-xs font-normal text-ink-3">任意</span>
              </label>
              <textarea
                id={`comment-${survey}`}
                name="comment"
                rows={3}
                maxLength={COMMENT_MAX}
                onChange={(event) => setLength(event.target.value.length)}
                placeholder="例：スーパーの買い物が1回で千円近く高くなった気がする"
                className="w-full rounded-lg border border-line bg-card px-3 py-2 text-base"
              />
              <p className="text-right text-xs text-ink-3">
                {length} / {COMMENT_MAX}文字（自由記入は公開しません）
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending || !ready}
            className="w-full rounded-full bg-accent px-6 py-3 font-bold text-white disabled:opacity-60 sm:w-auto"
          >
            {!ready ? "準備中…" : pending ? "送信しています…" : "回答してみんなの実感を見る"}
          </button>
        </form>
      )}

      <div className="border-t border-line pt-4">
        {showResults || answered || state.status === "sent" ? (
          <>
            <h3 className="mb-3 font-bold">みんなの実感</h3>
            <Results survey={survey} result={result} value={value} days={days} />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowResults(true)}
            className="text-sm text-accent underline"
          >
            回答せずに、みんなの実感を見る（{result.total}人）
          </button>
        )}
      </div>
    </section>
  );
}
