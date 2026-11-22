import type { Metadata } from "next";
import { formatMonth } from "@/lib/cpi/areas";
import { listFeedback } from "@/lib/feedback/store";
import { listImpressions } from "@/lib/impressions/store";
import { isSurveyId, SURVEYS } from "@/lib/impressions/surveys";

export const metadata: Metadata = {
  title: "ご意見・感想の一覧（管理）",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";


const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** 届いたご意見の一覧。middleware のパスワードで守る */
export default async function FeedbackAdminPage() {
  const [rows, impressions] = await Promise.all([listFeedback(), listImpressions()]);
  const byTopic = new Map<string, number>();
  for (const row of rows) byTopic.set(row.topic, (byTopic.get(row.topic) ?? 0) + 1);
  return (
    <div className="space-y-5">
      <nav className="flex gap-3 text-sm">
        <a href="#feedback" className="text-accent underline">ご意見・ご要望</a>
        <a href="#impressions" className="text-accent underline">指数を見た感想（{impressions.length}件）</a>
      </nav>
      <h1 id="feedback" className="text-2xl font-bold">ご意見の一覧</h1>
      <p className="text-sm text-ink-2">
        全{rows.length}件（新しい順、最大500件）。
        {[...byTopic].map(([topic, count]) => `${topic}：${count}件`).join("　")}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-card p-6 text-ink-2">まだご意見は届いていません。</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <span className="tabular">{dateFormat.format(new Date(row.createdAt))}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">{row.topic}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">{row.kind}</span>
                {row.page && <span>送信元：{row.page}</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{row.body}</p>
              {(row.name || row.email) && (
                <p className="mt-2 text-sm text-ink-2">
                  {row.name ?? "（名前なし）"}
                  {row.email && (
                    <>
                      {" "}／ <a className="text-accent underline" href={`mailto:${row.email}`}>{row.email}</a>
                    </>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <h2 id="impressions" className="pt-6 text-2xl font-bold">指数を見た感想</h2>
      <p className="text-sm text-ink-2">
        全{impressions.length}件（新しい順、最大500件）。選択の集計は各ページの「みんなの実感」に表示されています。ここでは自由記入も含めて1件ずつ見られます。
      </p>
      <ul className="space-y-3">
        {impressions.map((row) => {
          const survey = isSurveyId(row.survey) ? SURVEYS[row.survey] : null;
          return (
            <li key={row.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <span className="tabular">{dateFormat.format(new Date(row.createdAt))}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-2">
                  {survey?.title ?? row.survey}（{formatMonth(row.ym)}分を見て）
                </span>
                {row.age && <span>{row.age}</span>}
              </div>
              <dl className="mt-2 space-y-0.5 text-sm">
                {(survey?.questions ?? []).map((question, index) => (
                  <div key={question.id} className="flex flex-wrap gap-x-2">
                    <dt className="text-ink-3" title={question.label}>
                      Q{index + 1}（{question.short}）：
                    </dt>
                    <dd>{(row.answers[question.id] ?? []).join("、") || "—"}</dd>
                  </div>
                ))}
              </dl>
              {row.comment && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 p-3 leading-relaxed">{row.comment}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
