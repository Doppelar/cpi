import "server-only";
import { neon, Pool } from "@neondatabase/serverless";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が設定されていません");
  return url;
}

/** 読み取り用（HTTP で1回ずつ問い合わせる） */
export function sql() {
  return neon(databaseUrl());
}

/** 取り込み用（トランザクションを使う） */
export function createPool() {
  return new Pool({ connectionString: databaseUrl() });
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cpi_stats (
  area TEXT NOT NULL,
  ym INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  category TEXT,
  parent TEXT,
  serial INTEGER NOT NULL,
  weight10k REAL,
  base INTEGER NOT NULL,
  index_value REAL,
  mom REAL,
  yoy REAL,
  contrib_yoy REAL,
  contrib_mom REAL,
  PRIMARY KEY (area, ym, code)
);
CREATE INDEX IF NOT EXISTS cpi_stats_area_code_ym ON cpi_stats (area, code, ym);
CREATE TABLE IF NOT EXISTS cpi_imports (
  area TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL,
  latest_ym INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
