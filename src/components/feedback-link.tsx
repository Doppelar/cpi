import Link from "next/link";

/** ページの終わりに置く、ご意見フォームへの案内 */
export function FeedbackLink({ from, subject }: { from: string; subject: string }) {
  return (
    <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5">
      <div>
        <p className="font-bold">{subject}へのご意見をお聞かせください</p>
        <p className="text-sm text-ink-2">
          わかりにくい点、見たいデータ、数字の誤りなど、どんなことでもどうぞ。
        </p>
      </div>
      <Link
        href={`/feedback?from=${encodeURIComponent(from)}`}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white"
      >
        ご意見を送る
      </Link>
    </aside>
  );
}
