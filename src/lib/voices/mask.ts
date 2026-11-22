/** 公開する文章から、個人の連絡先などを伏せる（純粋関数） */

const PATTERNS: RegExp[] = [
  // メールアドレス
  /[\w.+-]+@[\w-]+(\.[\w-]+)+/g,
  // URL
  /https?:\/\/[^\s　]+/g,
  // 電話番号（ハイフンや空白の区切りあり・なし、全角数字も）
  /(?:\+?81[-\s]?)?[0０][0-9０-９]{1,4}[-ー－\s]?[0-9０-９]{1,4}[-ー－\s]?[0-9０-９]{3,4}/g,
  // 郵便番号
  /〒?\s?[0-9０-９]{3}[-ー－][0-9０-９]{4}/g,
];

export const MASK = "＊＊＊";

export function maskPersonalInfo(text: string): string {
  return PATTERNS.reduce((current, pattern) => current.replace(pattern, MASK), text);
}
