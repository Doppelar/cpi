import "server-only";
import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import type { FeedbackInput } from "./validate";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  topic TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  name TEXT,
  email TEXT,
  page TEXT,
  sender_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_sender_time ON feedback (sender_hash, created_at DESC);
`;

let schemaReady: Promise<void> | null = null;
function ensureSchema() {
  schemaReady ??= (async () => {
    const db = sql();
    for (const statement of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.query(statement);
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

/** 送信元を特定できないようにした識別子（連続投稿の制限だけに使う） */
export function senderHash(ip: string): string {
  const salt = process.env.CRON_SECRET ?? "cpi-feedback";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** 1時間あたりの投稿数の上限（同じ送信元） */
const HOURLY_LIMIT = 5;

export async function countRecent(sender: string): Promise<number> {
  await ensureSchema();
  const rows = await sql()`
    SELECT COUNT(*)::int AS count FROM feedback
    WHERE sender_hash = ${sender} AND created_at > NOW() - INTERVAL '1 hour'`;
  return Number(rows[0]?.count ?? 0);
}

export async function isRateLimited(sender: string): Promise<boolean> {
  return (await countRecent(sender)) >= HOURLY_LIMIT;
}

export async function saveFeedback(
  input: FeedbackInput,
  page: string | null,
  sender: string
): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO feedback (topic, kind, body, name, email, page, sender_hash)
    VALUES (${input.topic}, ${input.kind}, ${input.body}, ${input.name}, ${input.email}, ${page}, ${sender})`;
}

export type FeedbackRow = {
  id: number;
  createdAt: string;
  topic: string;
  kind: string;
  body: string;
  name: string | null;
  email: string | null;
  page: string | null;
};

/** 管理ページ用：新しい順 */
export async function listFeedback(limit = 500): Promise<FeedbackRow[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT id, created_at, topic, kind, body, name, email, page FROM feedback
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map((row) => ({
    id: Number(row.id),
    createdAt: new Date(row.created_at).toISOString(),
    topic: String(row.topic),
    kind: String(row.kind),
    body: String(row.body),
    name: row.name == null ? null : String(row.name),
    email: row.email == null ? null : String(row.email),
    page: row.page == null ? null : String(row.page),
  }));
}
