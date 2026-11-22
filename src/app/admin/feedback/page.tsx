import type { Metadata } from "next";
import { listFeedback } from "@/lib/feedback/store";

export const metadata: Metadata = {
  title: "ご意見の一覧（管理）",
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
  const rows = await listFeedback();
  const byTopic = new Map<string, number>();
  for (const row of rows) byTopic.set(row.topic, (byTopic.get(row.topic) ?? 0) + 1);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">ご意見の一覧</h1>
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
    </div>
  );
}
