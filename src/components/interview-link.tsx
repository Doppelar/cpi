import Link from "next/link";
import type { InterviewTopic } from "@/lib/interview/topics";

/** AIインタビューへの入口 */
export function InterviewLink({ topic, subject }: { topic: InterviewTopic; subject: string }) {
  return (
    <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 p-5">
      <div>
        <p className="font-bold">もっと話したい方は、AIインタビューへ</p>
        <p className="text-sm text-ink-2">
          {subject}について、AIが5つほど質問しながら、あなたの実感を自分の言葉でお聞きします（5分ほど）。
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
      <Link href={`/voices?topic=${topic}`} className="text-sm text-accent underline">
        みんなの声を見る
      </Link>
      <Link
        href={`/interview?topic=${topic}`}
        className="rounded-full border-2 border-accent bg-card px-5 py-2.5 text-sm font-bold text-accent"
      >
        AIインタビューに答える
      </Link>
      </div>
    </aside>
  );
}
