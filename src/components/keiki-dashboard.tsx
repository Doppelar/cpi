import { formatMonth } from "@/lib/cpi/areas";
import { formatSigned } from "@/lib/cpi/chart-data";
import { buildCiRows, buildCoincidentContribRows } from "@/lib/keiki/chart-data";
import {
  getCoincidentContributions,
  getJudgments,
  getKeikiComponents,
  getKeikiMonthly,
} from "@/lib/keiki/queries";
import { DI_PAGE_URL } from "@/lib/keiki/source";
import { KeikiIntroNote } from "./easy-notes";
import { FeedbackLink } from "./feedback-link";
import { JudgmentBadge } from "./judgment-badge";
import { KeikiCharts } from "./keiki-charts";
import { KeikiMonthExplorer } from "./keiki-month-explorer";

export async function KeikiDashboard({ requestedYm }: { requestedYm?: string }) {
  const [monthly, contributions, judgments] = await Promise.all([
    getKeikiMonthly(),
    getCoincidentContributions(),
    getJudgments(),
  ]);
  const ci = buildCiRows(monthly);
  if (ci.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-card p-6 text-ink-2">
        データを準備中です。しばらくしてからもう一度ご覧ください。
      </p>
    );
  }
  const months = ci.map((row) => row.ym);
  const latest = ci[ci.length - 1];
  const selected =
    requestedYm && months.includes(Number(requestedYm))
      ? Number(requestedYm)
      : latest.ym;
  const selectedIndex = months.indexOf(selected);
  const selectedRow = ci[selectedIndex];
  const previousRow = ci[selectedIndex - 1];
  const components = await getKeikiComponents(selected);
  const contrib = buildCoincidentContribRows(contributions, ci);
  const judgmentByMonth = new Map(judgments.map((j) => [j.ym, j]));
  const latestJudgment = judgments[judgments.length - 1];
  const recentJudgments = judgments.slice(-12).reverse();

  const diff = (key: "leading" | "lagging") =>
    selectedRow?.[key] != null && previousRow?.[key] != null
      ? Math.round(((selectedRow[key] as number) - (previousRow[key] as number)) * 10) / 10
      : null;
  const latestPrev = ci[ci.length - 2];
  const latestDiff = (key: "leading" | "lagging") =>
    latest[key] != null && latestPrev?.[key] != null
      ? Math.round(((latest[key] as number) - (latestPrev[key] as number)) * 10) / 10
      : null;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">景気動向指数</h1>
          <p className="text-sm text-ink-3">最新：{formatMonth(latest.ym)}分（速報・改訂を反映）</p>
        </div>

        <KeikiIntroNote label={latestJudgment?.label ?? null} />

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-line bg-card p-6">
            <p className="text-sm text-ink-2">
              内閣府の基調判断（{latestJudgment ? formatMonth(latestJudgment.ym) : "—"}分）
            </p>
            <div className="mt-2">
              <JudgmentBadge label={latestJudgment?.label ?? null} size="lg" />
            </div>
            {latestJudgment && (
              <p className="mt-3 text-sm text-ink-2">
                「景気動向指数（CI一致指数）は、{latestJudgment.text}」
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <div>
                <dt className="text-ink-3">一致指数（2020年＝100）</dt>
                <dd className="tabular text-2xl font-bold">
                  {latest.coincident?.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3">前月差</dt>
                <dd className="tabular text-2xl font-bold">
                  {formatSigned(latest.coincidentDiff, 1, "")}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-ink-3">
              3か月後方移動平均の前月差 {formatSigned(latest.ma3Diff, 2, "")}／7か月後方移動平均の前月差{" "}
              {formatSigned(latest.ma7Diff, 2, "")}。基調判断は主にこの2つの動きで決まります。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-sm font-semibold">先行指数</p>
              <p className="tabular mt-1 text-3xl font-bold">{latest.leading?.toFixed(1) ?? "—"}</p>
              <p className="tabular text-sm text-ink-2">前月差 {formatSigned(latestDiff("leading"), 1, "")}</p>
              <p className="mt-1 text-xs text-ink-3">数か月先の景気を映す（株価・新規求人・機械受注など）</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-sm font-semibold">遅行指数</p>
              <p className="tabular mt-1 text-3xl font-bold">{latest.lagging?.toFixed(1) ?? "—"}</p>
              <p className="tabular text-sm text-ink-2">前月差 {formatSigned(latestDiff("lagging"), 1, "")}</p>
              <p className="mt-1 text-xs text-ink-3">景気を後から確かめる（失業率・家計消費・物価など）</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-4 sm:col-span-2">
              <p className="text-sm font-semibold">基調判断のうつりかわり（直近12か月）</p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
                {recentJudgments.map((judgment) => (
                  <li key={judgment.ym} className="flex items-center gap-1.5">
                    <span className="tabular text-ink-3">{formatMonth(judgment.ym)}</span>
                    <JudgmentBadge label={judgment.label} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="text-sm text-ink-2">
          景気動向指数は、生産・雇用・消費などの経済指標をまとめて、景気がよくなっているか・悪くなっているかを1つの数字で示すものです。
          <a href="#about" className="text-accent underline">
            くわしい見方はこちら
          </a>
        </p>
      </section>

      <KeikiCharts ci={ci} contrib={contrib} />

      <KeikiMonthExplorer
        months={months}
        selected={selected}
        row={selectedRow}
        diffs={{
          coincident: selectedRow?.coincidentDiff ?? null,
          leading: diff("leading"),
          lagging: diff("lagging"),
        }}
        components={components}
        judgment={judgmentByMonth.get(selected)}
      />

      <KeikiAbout />

      <FeedbackLink from="/keiki" subject="景気動向指数" />

      <p className="text-xs text-ink-3">
        出典：内閣府経済社会総合研究所「景気動向指数」（
        <a className="underline" href={DI_PAGE_URL} target="_blank" rel="noreferrer">
          {DI_PAGE_URL}
        </a>
        ）の長期系列・個別系列・寄与度をもとに作成。基調判断は各月の「結果の概要」（速報時点）の記載です。景気後退期は内閣府「景気基準日付」によります。
      </p>
    </div>
  );
}

function KeikiAbout() {
  return (
    <section id="about" className="scroll-mt-4 space-y-6 rounded-2xl border border-line bg-card p-5 sm:p-8">
      <h2 className="text-xl font-bold">景気動向指数とは</h2>
      <div className="space-y-3 leading-relaxed text-ink-2">
        <p>
          内閣府が毎月発表する、景気の動きを表す指標です。生産、雇用、消費、投資、金融など、景気に敏感な約30の経済指標を組み合わせて作られています。翌々月の上旬に速報が発表されます（例：9月分は11月上旬）。
        </p>
        <h3 className="pt-2 font-bold text-ink">CIとDIの違い</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">CI（コンポジット・インデックス）</strong>
            ：景気の「強さ」や「勢い」を表します。数字が上がれば景気が拡大、下がれば後退の方向です。現在はCIが中心です。
          </li>
          <li>
            <strong className="text-ink">DI（ディフュージョン・インデックス）</strong>
            ：景気の「広がり」を表します。3か月前より改善した指標の割合で、50%を上回ると改善している指標のほうが多いことになります。
          </li>
        </ul>
        <h3 className="pt-2 font-bold text-ink">先行・一致・遅行</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-3">
                <th className="py-2 pr-3 font-medium">指数</th>
                <th className="py-2 pr-3 font-medium">動くタイミング</th>
                <th className="py-2 font-medium">主な指標の例</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              <tr className="border-b border-line align-top">
                <td className="py-2 pr-3 font-semibold">先行指数</td>
                <td className="py-2 pr-3">景気より数か月早く動く</td>
                <td className="py-2">株価、新規求人数、機械受注、住宅着工、消費者態度指数</td>
              </tr>
              <tr className="border-b border-line align-top">
                <td className="py-2 pr-3 font-semibold">一致指数</td>
                <td className="py-2 pr-3">景気とほぼ同時に動く</td>
                <td className="py-2">生産、出荷、有効求人倍率、販売額、営業利益、輸出</td>
              </tr>
              <tr className="align-top">
                <td className="py-2 pr-3 font-semibold">遅行指数</td>
                <td className="py-2 pr-3">景気より遅れて動く</td>
                <td className="py-2">完全失業率、家計消費支出、法人税収入、消費者物価</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 className="pt-2 font-bold text-ink">基調判断の5段階</h3>
        <p>内閣府は、一致指数の動きから景気の基調を機械的に判断し、毎月の発表で示しています。</p>
        <ul className="space-y-2">
          {[
            ["改善", "景気拡張の可能性が高い"],
            ["足踏み", "景気拡張の動きが足踏み状態になっている可能性が高い"],
            ["上方への局面変化", "景気の谷が、それ以前の数か月にあった可能性が高い"],
            ["下方への局面変化", "景気の山が、それ以前の数か月にあった可能性が高い"],
            ["悪化", "景気後退の可能性が高い"],
            ["下げ止まり", "景気後退の動きが下げ止まっている可能性が高い"],
          ].map(([label, text]) => (
            <li key={label} className="flex flex-wrap items-center gap-2">
              <JudgmentBadge label={label} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <h3 className="pt-2 font-bold text-ink">見るときの注意</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>速報値は、翌月に改訂されることがあります。このページは毎日、内閣府の最新の数値に更新しています。</li>
          <li>
            景気の「山」と「谷」（景気基準日付）は、後から専門家の議論を経て正式に決まります。基調判断は暫定的な目安です。
          </li>
          <li>景気動向指数は景気の方向や勢いを表すもので、暮らし向きの実感とは異なることがあります。</li>
        </ul>
      </div>
    </section>
  );
}
