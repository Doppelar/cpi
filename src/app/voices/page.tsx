import type { Metadata } from "next";
import Link from "next/link";
import { EasyNote } from "@/components/explain-mode";
import { formatMonth } from "@/lib/cpi/areas";
import { listPublicFeedback } from "@/lib/feedback/store";
import { listPublicImpressions } from "@/lib/impressions/store";
import { isSurveyId, SURVEYS } from "@/lib/impressions/surveys";
import { listPublicInterviews } from "@/lib/interview/store";
import { INTERVIEW_TOPICS, isInterviewTopic } from "@/lib/interview/topics";
import {
  feedbackTopicId,
  pairQuestionsAndAnswers,
  parseVoiceTopic,
  parseVoiceType,
  VOICE_TOPICS,
  VOICE_TYPES,
  type VoiceTopic,
  type VoiceType,
} from "@/lib/voices/format";
import { maskPersonalInfo } from "@/lib/voices/mask";

export const metadata: Metadata = {
  title: "みんなの声",
  description:
    "消費者物価指数・景気動向指数を見た人たちの実感や意見。AIインタビュー、アンケートの感想、ご意見を公開しています。",
};

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const TOPIC_LABEL: Record<Exclude<VoiceTopic, "all">, string> = {
  "cpi-national": "物価（全国）",
  "cpi-tokyo": "物価（東京都区部）",
  keiki: "景気",
  other: "サイト全体・その他",
};

type Entry = {
  key: string;
  kind: Exclude<VoiceType, "all">;
  topic: Exclude<VoiceTopic, "all">;
  createdAt: string;
  node: React.ReactNode;
};

/** 読み込みに失敗したら記録に残し、その種類は0件として表示する */
function logEmpty(label: string) {
  return (error: unknown) => {
    console.error(`みんなの声：${label}の読み込みに失敗しました`, error);
    return [];
  };
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{children}</span>
  );
}

function filterHref(type: VoiceType, topic: VoiceTopic) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (topic !== "all") params.set("topic", topic);
  const query = params.toString();
  return query ? `/voices?${query}` : "/voices";
}

export default async function VoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; topic?: string }>;
}) {
  const params = await searchParams;
  const type = parseVoiceType(params.type);
  const topic = parseVoiceTopic(params.topic);

  const [feedback, impressions, interviews] = await Promise.all([
    listPublicFeedback().catch(logEmpty("ご意見")),
    listPublicImpressions().catch(logEmpty("実感の声")),
    listPublicInterviews().catch(logEmpty("AIインタビュー")),
  ]);

  const entries: Entry[] = [
    ...interviews.map((session): Entry => ({
      key: `i-${session.id}`,
      kind: "interviews",
      topic: isInterviewTopic(session.topic) ? session.topic : "other",
      createdAt: session.createdAt,
      node: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>AIインタビュー</Badge>
            <Badge>
              {isInterviewTopic(session.topic) ? INTERVIEW_TOPICS[session.topic].short : session.topic}
            </Badge>
          </div>
          <dl className="mt-3 space-y-3">
            {pairQuestionsAndAnswers(session.transcript).map((pair, i) => (
              <div key={`${session.id}-${i}`}>
                <dt className="text-sm text-ink-3">Q. {pair.question}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed">{pair.answer}</dd>
              </div>
            ))}
          </dl>
        </>
      ),
    })),
    ...impressions.map((row): Entry => {
      const survey = isSurveyId(row.survey) ? SURVEYS[row.survey] : null;
      const feel = row.answers.feel?.[0];
      const second = row.answers.life?.[0] ?? row.answers.outlook?.[0];
      return {
        key: `s-${row.id}`,
        kind: "impressions",
        topic: isSurveyId(row.survey) ? row.survey : "other",
        createdAt: row.createdAt,
        node: (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>実感の声</Badge>
              <Badge>{survey?.title ?? row.survey}（{formatMonth(row.ym)}分を見て）</Badge>
              {row.age && <Badge>{row.age}</Badge>}
            </div>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">
              {maskPersonalInfo(row.comment ?? "")}
            </p>
            {(feel || second) && (
              <p className="mt-2 text-sm text-ink-3">
                {[feel, second].filter(Boolean).join("／")}
              </p>
            )}
          </>
        ),
      };
    }),
    ...feedback.map((row): Entry => ({
      key: `f-${row.id}`,
      kind: "feedback",
      topic: feedbackTopicId(row.topic),
      createdAt: row.createdAt,
      node: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>ご意見</Badge>
            <Badge>{row.topic}</Badge>
            <Badge>{row.kind}</Badge>
          </div>
          <p className="mt-3 whitespace-pre-wrap leading-relaxed">{maskPersonalInfo(row.body)}</p>
        </>
      ),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const counts = {
    interviews: interviews.length,
    impressions: impressions.length,
    feedback: feedback.length,
  };
  const shown = entries.filter(
    (entry) => (type === "all" || entry.kind === type) && (topic === "all" || entry.topic === topic)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">みんなの声</h1>
        <p className="leading-relaxed text-ink-2">
          消費者物価指数・景気動向指数を見た人たちが、実際の暮らしの中でどう感じているか。AIインタビュー・アンケートの感想・ご意見のうち、公開に同意いただいたものを掲載しています。
        </p>
        <p className="text-sm text-ink-3">
          AIインタビュー {counts.interviews}件・実感の声 {counts.impressions}件・ご意見 {counts.feedback}件
        </p>
      </header>

      <EasyNote title="このページの見方">
        <p>
          ここに載っているのは、このサイトを見た人が自分の言葉で書いた実感です。国が発表する指数（数字）と、一人ひとりの暮らしの感じ方がどれくらい同じか・違うかを比べられます。
          上のボタンで、種類（AIインタビューなど）や、どの指数についての声かをしぼり込めます。
        </p>
      </EasyNote>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {VOICE_TYPES.map((item) => (
            <Link
              key={item.id}
              href={filterHref(item.id, topic)}
              scroll={false}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                type === item.id
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-card text-ink-2 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {VOICE_TOPICS.map((item) => (
            <Link
              key={item.id}
              href={filterHref(type, item.id)}
              scroll={false}
              className={`rounded-full border px-3 py-1 text-xs ${
                topic === item.id
                  ? "border-ink bg-ink text-card"
                  : "border-line bg-surface-2 text-ink-2 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-line bg-card p-6 text-ink-2">
          <p>
            {topic !== "all" ? `${TOPIC_LABEL[topic]}について、` : ""}
            公開されている声はまだありません。最初の声をお寄せください。
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/interview" className="rounded-full bg-accent px-4 py-2 font-bold text-white">
              AIインタビューに答える
            </Link>
            <Link href="/feedback" className="rounded-full border border-line px-4 py-2 font-semibold">
              ご意見を送る
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((entry) => (
            <li key={entry.key} className="rounded-2xl border border-line bg-card p-4 sm:p-5">
              {entry.node}
              <p className="tabular mt-3 text-xs text-ink-3">
                {dateFormat.format(new Date(entry.createdAt))}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-ink-3">
        掲載している声は個人の感想で、このサイトや国の見解ではありません。お名前・メールアドレスは掲載せず、電話番号などの連絡先は伏せ字にしています。不適切な内容は、管理者の判断で掲載をとりやめることがあります。
      </p>
    </div>
  );
}
