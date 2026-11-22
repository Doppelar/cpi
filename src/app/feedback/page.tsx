import type { Metadata } from "next";
import { EasyNote } from "@/components/explain-mode";
import { FeedbackForm } from "@/components/feedback-form";
import { topicFromPath } from "@/lib/feedback/validate";

export const metadata: Metadata = {
  title: "ご意見・ご要望",
  description:
    "消費者物価指数・景気動向指数のページへのご意見・ご要望、わかりにくい点や誤りのご指摘をお寄せください。",
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const page = from && from.startsWith("/") ? from.slice(0, 200) : null;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">ご意見・ご要望</h1>
        <p className="leading-relaxed text-ink-2">
          消費者物価指数・景気動向指数について、感じたことや知りたいこと、わかりにくかった点、数字や説明の誤りなどをお寄せください。いただいた声をもとに、ページを改善していきます。
        </p>
      </header>
      <EasyNote title="どんなことを書けばいいの？">
        <p>
          「この言葉の意味がわからなかった」「お米の値段の動きをもっと詳しく見たい」「グラフが見にくい」など、どんな小さなことでも大丈夫です。
          指数の数字そのものへの感想（「物価が上がって生活が大変」など）も歓迎します。
        </p>
      </EasyNote>
      <FeedbackForm initialTopic={topicFromPath(page ?? undefined)} page={page} />
    </div>
  );
}
