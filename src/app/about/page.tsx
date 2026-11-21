import type { Metadata } from "next";
import Link from "next/link";
import { formatMonth } from "@/lib/cpi/areas";
import { formatSigned } from "@/lib/cpi/chart-data";
import { getMonthItems, getMonths } from "@/lib/cpi/queries";

export const metadata: Metadata = {
  title: "消費者物価指数（CPI）とは",
  description:
    "消費者物価指数（CPI）とは何か、前年同月比・コア・寄与度の読み方、使われ方や注意点をやさしく解説します。",
};

export const revalidate = 3600;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-3">
      <h2 className="border-l-4 border-accent pl-3 text-xl font-bold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink">
      {children}
    </div>
  );
}

/** 買い物かごの中身（10大費目のウエイト） */
async function BasketChart() {
  const months = await getMonths("national").catch(() => []);
  const latest = months[months.length - 1];
  if (!latest) return null;
  const majors = (await getMonthItems("national", latest))
    .filter((item) => item.kind === "major" && item.weight10k != null)
    .sort((a, b) => (b.weight10k ?? 0) - (a.weight10k ?? 0));
  const max = Math.max(...majors.map((m) => m.weight10k ?? 0));
  return (
    <div className="rounded-2xl border border-line bg-card p-4 sm:p-6">
      <p className="font-semibold text-ink">
        全国の買い物かごの中身（支出1万円あたり）
      </p>
      <p className="text-xs text-ink-3">
        2025年基準のウエイト。右の数字は{formatMonth(latest)}の前年同月比
      </p>
      <ul className="mt-4 space-y-2">
        {majors.map((major) => (
          <li
            key={major.code}
            className="grid grid-cols-[6.5rem_1fr_3.5rem_4rem] items-center gap-2 text-sm sm:grid-cols-[8rem_1fr_4rem_4.5rem]"
          >
            <span className="text-ink">{major.name}</span>
            <span className="h-4 rounded-r bg-surface-2">
              <span
                className="block h-4 rounded-r bg-[var(--s1)]"
                style={{ width: `${((major.weight10k ?? 0) / max) * 100}%` }}
              />
            </span>
            <span className="tabular text-right font-semibold text-ink">
              {(major.weight10k ?? 0).toLocaleString()}円
            </span>
            <span className="tabular text-right text-ink-2">
              {formatSigned(major.yoy)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TOC = [
  ["what", "消費者物価指数ってなに？"],
  ["read", "数字の読み方"],
  ["basket", "買い物かごの中身"],
  ["core", "総合・コア・コアコア"],
  ["contrib", "寄与度とは"],
  ["tokyo", "全国と東京都区部"],
  ["use", "どこで使われている？"],
  ["gap", "実感とずれる理由"],
] as const;

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          消費者物価指数（CPI）とは
        </h1>
        <p className="leading-relaxed text-ink-2">
          ニュースで「物価が前年より3%上がった」と聞くとき、その元になっている数字が消費者物価指数（CPI：Consumer
          Price Index）です。総務省統計局が毎月発表しています。
        </p>
        <nav className="rounded-xl border border-line bg-card p-4 text-sm">
          <p className="mb-2 font-semibold">もくじ</p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {TOC.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="text-accent hover:underline">
                  {i + 1}. {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <Section id="what" title="1. 消費者物価指数ってなに？">
        <p>
          全国の家庭が買っている
          <strong className="text-ink">モノとサービス約580品目</strong>
          （お米、卵、電気代、家賃、スマホの通信料、散髪代など）を1つの「買い物かご」に入れ、そのかご全体の値段が、基準の年と比べてどれだけ変わったかを表す数字です。
        </p>
        <p>
          全国の店で毎月値段を調べ、品目ごとの値動きを、家計がその品目にどれだけお金を使っているか（ウエイト）で重みづけして平均します。よく買うもの・支出が大きいものほど、全体の数字に強く効きます。
        </p>
      </Section>

      <Section id="read" title="2. 数字の読み方">
        <p>
          <strong className="text-ink">指数</strong>
          ：基準の年（いまは2025年）の平均を100としたときの値段の水準です。103なら、2025年より3%高い水準です。
        </p>
        <p>
          <strong className="text-ink">前年同月比</strong>
          ：1年前の同じ月と比べた変化率。季節による値動き（夏のエアコン、年末の旅行など）の影響を受けにくいため、ニュースでいちばんよく使われます。
        </p>
        <p>
          <strong className="text-ink">前月比</strong>
          ：前の月と比べた変化率。動きは早くつかめますが、季節による変化も含みます。
        </p>
        <Example>
          たとえば前年同月比が<strong>+2.5%</strong>
          なら、1年前に1万円で買えた「いつもの買い物」に、いまは約10,250円かかる、という意味です。
        </Example>
      </Section>

      <Section id="basket" title="3. 買い物かごの中身（ウエイト）">
        <p>
          品目は「食料」「住居」など10の大きな費目に分かれています。支出に占める割合が大きい費目ほど、物価全体への影響が大きくなります。
        </p>
        <BasketChart />
        <p className="text-sm">
          住居には、持ち家に住む人が「家賃を払っている」とみなした費用（持家の帰属家賃）が含まれるため、大きな割合になっています。
        </p>
      </Section>

      <Section id="core" title="4. 総合・コア・コアコア">
        <p>
          物価全体の数字は1つではありません。値動きが激しいものを除いた数字も、あわせて発表されます。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-3">
                <th className="py-2 pr-3 font-medium">名前</th>
                <th className="py-2 pr-3 font-medium">中身</th>
                <th className="py-2 font-medium">見るポイント</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              <tr className="border-b border-line align-top">
                <td className="py-2 pr-3 font-semibold">総合</td>
                <td className="py-2 pr-3">すべての品目</td>
                <td className="py-2">家計が実際に感じる物価に近い</td>
              </tr>
              <tr className="border-b border-line align-top">
                <td className="py-2 pr-3 font-semibold">
                  コア
                  <br />
                  <span className="text-xs font-normal text-ink-3">
                    生鮮食品を除く総合
                  </span>
                </td>
                <td className="py-2 pr-3">天候で大きく動く野菜・魚・果物を除く</td>
                <td className="py-2">日本でいちばん注目される物価の基調</td>
              </tr>
              <tr className="align-top">
                <td className="py-2 pr-3 font-semibold">
                  コアコア
                  <br />
                  <span className="text-xs font-normal text-ink-3">
                    生鮮食品及びエネルギーを除く総合
                  </span>
                </td>
                <td className="py-2 pr-3">さらに電気・ガス・ガソリンなども除く</td>
                <td className="py-2">
                  原油価格や補助金の影響を除いた、国内の物価の勢い
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="contrib" title="5. 寄与度とは">
        <p>
          総合の上昇率のうち、それぞれの品目が「何%分」を押し上げたかを表す数字です（単位はポイント）。
          <strong className="text-ink">値上がり率 × 支出に占める割合</strong>
          で決まるので、値上がり率が大きくても、あまり買わない品目なら寄与度は小さくなります。
        </p>
        <Example>
          総合が+3.0%のとき、食料の寄与度が+1.2ポイントなら、3.0%の上昇のうち1.2%分は食料の値上がりによるもの、という意味です。全部の費目の寄与度を足すと、総合の上昇率になります。
        </Example>
      </Section>

      <Section id="tokyo" title="6. 全国と東京都区部">
        <p>
          <strong className="text-ink">全国</strong>
          の指数は、翌月の20日ごろに発表されます（例：10月分は11月20日ごろ）。
          <strong className="text-ink">東京都区部</strong>
          の指数は、その月の中旬までの値段で計算した速報値が、その月の末に発表されます。全国より約1か月早いため、物価の動きを先取りする目安として注目されます。
        </p>
        <p className="text-sm">
          東京都区部は家賃などの割合が全国と違うため、全国と同じ動きになるとは限りません。
        </p>
      </Section>

      <Section id="use" title="7. どこで使われている？">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">年金</strong>
            ：年金額は、物価や賃金の動きに合わせて毎年度改定されます。
          </li>
          <li>
            <strong className="text-ink">日本銀行の金融政策</strong>
            ：日本銀行は、前年比2%の物価上昇を目標にしています。
          </li>
          <li>
            <strong className="text-ink">実質賃金</strong>
            ：給料の伸びから物価の伸びを差し引いて、暮らし向きがよくなったかを測ります。
          </li>
          <li>
            <strong className="text-ink">契約・家賃の改定</strong>
            ：長期の契約で、値段の見直しの目安に使われることがあります。
          </li>
        </ul>
      </Section>

      <Section id="gap" title="8. 実感とずれる理由">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            よく買う食品（お米・野菜・卵など）の値上がりは目につきやすい一方、指数には値段があまり変わらない家賃や通信料も含まれます。
          </li>
          <li>
            持ち家の人が実際には払っていない「持家の帰属家賃」が約16%を占め、その値動きが小さいため、全体を落ち着かせる方向に働きます。
          </li>
          <li>
            同じ値段でも性能が上がった商品（パソコンなど）は「実質的には値下がり」として計算されます。
          </li>
          <li>
            家族構成や住む地域によって買い物かごの中身が違うため、一人ひとりの実感とは差が出ます。
          </li>
        </ul>
        <p className="text-sm">
          指数の基準年は5年ごとに見直されます。2026年夏からは、2025年を基準（＝100）とした指数が公表されています。
        </p>
      </Section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          全国の推移を見る
        </Link>
        <Link
          href="/tokyo"
          className="rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold"
        >
          東京都区部の推移を見る
        </Link>
      </div>
    </article>
  );
}
