import type { Metadata } from "next";
import Link from "next/link";
import { MODE_INIT_SCRIPT, ModeToggle } from "@/components/explain-mode";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "物価のものさし｜物価と景気をわかりやすく",
    template: "%s｜物価のものさし",
  },
  description:
    "総務省統計局の消費者物価指数（CPI）と内閣府の景気動向指数を、グラフでわかりやすく。推移や、月ごとに動いた品目・指標を確認できます。",
};

const NAV = [
  { href: "/", label: "全国" },
  { href: "/tokyo", label: "東京都区部" },
  { href: "/keiki", label: "景気動向指数" },
  { href: "/about", label: "CPIとは" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 覚えている「詳しくない方向け」の表示を、画面が出る前に反映する */}
        <script dangerouslySetInnerHTML={{ __html: MODE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-surface font-sans text-ink">
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="leading-tight">
              <span className="block text-lg font-bold">物価のものさし</span>
              <span className="block text-xs text-ink-3">
                物価と景気をわかりやすく
              </span>
            </Link>
            <div className="sm:order-last">
              <ModeToggle />
            </div>
            <nav className="-mx-2 flex w-full flex-wrap gap-1 text-sm sm:mx-0 sm:ml-auto sm:w-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        <footer className="border-t border-line bg-card">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-xs text-ink-3">
            <p>
              物価のページの出典：総務省統計局「消費者物価指数」（
              <a
                className="underline"
                href="https://www.stat.go.jp/data/cpi/1.html"
                target="_blank"
                rel="noreferrer"
              >
                https://www.stat.go.jp/data/cpi/1.html
              </a>
              ）の品目別価格指数をもとに作成。前年同月比・前月比・寄与度は、公表された指数から当サイトで計算した値です。
            </p>
            <p>
              景気動向指数のページの出典：内閣府経済社会総合研究所「景気動向指数」（
              <a
                className="underline"
                href="https://www.esri.cao.go.jp/jp/stat/di/di.html"
                target="_blank"
                rel="noreferrer"
              >
                https://www.esri.cao.go.jp/jp/stat/di/di.html
              </a>
              ）
            </p>
            <p>
              寄与度は年間のウエイトを使った概算で、公表値と小数点以下が異なることがあります。
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
