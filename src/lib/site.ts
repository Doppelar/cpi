/** 公開URL（検索エンジン向けのサイトマップ・正規URLに使う）。 */
export const SITE_URL = "https://cpi-phi.vercel.app";

/** 検索結果に出したい公開ページ。 */
export const PUBLIC_PAGES = [
  { path: "/", priority: 1 },
  { path: "/tokyo", priority: 0.9 },
  { path: "/keiki", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/voices", priority: 0.6 },
  { path: "/interview", priority: 0.5 },
  { path: "/feedback", priority: 0.4 },
] as const;
