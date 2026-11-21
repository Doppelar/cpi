/**
 * 総務省統計局の「品目別価格指数（月次）」CSV（zmi2025aa.csv など）を読み取る。
 *
 * CSV の形（1列目が見出し、2列目以降が類・品目）:
 *   1行目 類・品目（日本語名）
 *   2行目 英語名
 *   3行目 類・品目符号
 *   4行目 含類総連番
 *   5行目 ウエイト
 *   6行目 ウエイト1万分比
 *   7行目以降 年月（202501 など）と指数
 */

export type ColumnKind = "total" | "major" | "group" | "item" | "special";

export type CpiColumn = {
  code: string;
  name: string;
  kind: ColumnKind;
  /** 10大費目の名前（総合・特殊分類は null） */
  category: string | null;
  /** 品目が属する類（直前の類）の符号。10大費目は総合。それ以外は null */
  parent: string | null;
  serial: number;
  /** ウエイト（実数）。寄与度の計算に使う */
  weight: number | null;
  /** ウエイト1万分比 */
  weight10k: number | null;
};

export type CpiTable = {
  columns: CpiColumn[];
  /** 年月（202501 など）の昇順 */
  months: number[];
  /** values[月の位置][列の位置]。欠測は null */
  values: (number | null)[][];
};

/** 10大費目 */
export const MAJOR_CATEGORIES = [
  "食料",
  "住居",
  "光熱・水道",
  "家具・家事用品",
  "被服及び履物",
  "保健医療",
  "交通・通信",
  "教育",
  "教養娯楽",
  "諸雑費",
] as const;

/** 総合 */
export const TOTAL_CODE = "0001";
/** 特殊分類の始まり（生鮮食品）。ここから後ろは分類の再掲・組み替え */
const FIRST_SPECIAL_CODE = "0157";

/** ダブルクォートで囲まれたカンマに対応した、1行分の CSV 分解 */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "…") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCpiCsv(text: string): CpiTable {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
  if (lines.length < 7) throw new Error("CPI CSV: 行が足りません");
  const [names, , codes, serials, weights, weights10k] = lines;

  const columns: CpiColumn[] = [];
  let category: string | null = null;
  let group: string | null = null;
  let special = false;
  for (let i = 1; i < codes.length; i++) {
    const code = codes[i].trim();
    const name = names[i]?.trim() ?? "";
    if (!code) continue;
    if (code === FIRST_SPECIAL_CODE) special = true;
    let kind: ColumnKind;
    let parent: string | null = null;
    if (special) {
      kind = "special";
    } else if (code === TOTAL_CODE) {
      kind = "total";
    } else if ((MAJOR_CATEGORIES as readonly string[]).includes(name)) {
      kind = "major";
      category = name;
      parent = TOTAL_CODE;
    } else if (code.startsWith("0")) {
      kind = "group";
    } else {
      kind = "item";
      parent = group;
    }
    columns.push({
      code,
      name,
      kind,
      category: kind === "total" || kind === "special" ? null : category,
      parent,
      serial: Number(serials[i]) || i,
      weight: toNumber(weights[i]),
      weight10k: toNumber(weights10k[i]),
    });
    if (kind === "group" || kind === "major") group = code;
  }

  const months: number[] = [];
  const values: (number | null)[][] = [];
  for (const row of lines.slice(6)) {
    const ym = Number(row[0]);
    if (!/^\d{6}$/.test(row[0]?.trim() ?? "")) continue;
    months.push(ym);
    const rowValues: (number | null)[] = [];
    let column = 0;
    for (let i = 1; i < codes.length; i++) {
      if (!codes[i].trim()) continue;
      rowValues[column++] = toNumber(row[i]);
    }
    values.push(rowValues);
  }
  return { columns, months, values };
}

/** Shift_JIS（CP932）のバイト列を文字列にする */
export function decodeShiftJis(buffer: ArrayBuffer): string {
  return new TextDecoder("shift_jis").decode(buffer);
}
