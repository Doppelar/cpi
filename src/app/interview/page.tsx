import type { Metadata } from "next";
import Link from "next/link";
import { EasyNote } from "@/components/explain-mode";
import { InterviewChat } from "@/components/interview-chat";
import { getInterviewContext } from "@/lib/interview/context";
import {
  INTERVIEW_TOPICS,
  type InterviewTopic,
  isInterviewTopic,
  openingMessage,
} from "@/lib/interview/topics";

export const metadata: Metadata = {
  title: "AIインタビュー",
  description:
    "消費者物価指数・景気動向指数を見て、実際の暮らしでどう感じているかを、AIがインタビュー形式でお聞きします。",
};

export default async function InterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic: requested } = await searchParams;
  const topic: InterviewTopic | null = isInterviewTopic(requested) ? requested : null;

  if (!topic) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">AIインタビュー</h1>
          <p className="leading-relaxed text-ink-2">
            指数の数字を見て、実際の暮らしではどう感じているか。AIが5つほど質問しながら、あなたの実感をお聞きします。5分ほどで終わります。
          </p>
        </header>
        <EasyNote title="AIインタビューってなに？">
          <p>
            チャットで、AIの質問に自分の言葉で答えていく形のアンケートです。「最近、何の値上がりを感じる？」のような質問に、思ったことを短く書くだけで大丈夫です。
            わからない言葉があれば、AIに「○○ってなに？」と聞くこともできます。
          </p>
        </EasyNote>
        <ul className="grid gap-3">
          {(Object.keys(INTERVIEW_TOPICS) as InterviewTopic[]).map((id) => (
            <li key={id}>
              <Link
                href={`/interview?topic=${id}`}
                className="block rounded-2xl border border-line bg-card p-4 hover:border-accent"
              >
                <p className="font-bold">{INTERVIEW_TOPICS[id].label}</p>
                <p className="mt-1 text-sm text-ink-2">
                  {INTERVIEW_TOPICS[id].questions.slice(0, 2).join(" ")}…
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-3">
          お話の内容はサイトの改善や、みなさんの実感を知るための参考にします。インタビューの最後に「公開してよい」を選んだものだけ、「みんなの声」に掲載します。AIの応答には Vercel AI Gateway 経由の AI モデルを使います。
        </p>
      </div>
    );
  }

  const context = await getInterviewContext(topic);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-ink-3">
          <Link href="/interview" className="underline">AIインタビュー</Link>
        </p>
        <h1 className="text-2xl font-bold">{INTERVIEW_TOPICS[topic].label}</h1>
      </header>
      <InterviewChat topic={topic} opening={openingMessage(topic, context.headline)} />
      <p className="text-xs text-ink-3">
        お話の内容はサイトの改善や、みなさんの実感を知るための参考にします。インタビューの最後に「公開してよい」を選んだものだけ、「みんなの声」に掲載します。AIの説明はまちがうこともあるため、正確な数字はグラフのページでご確認ください。
      </p>
    </div>
  );
}
