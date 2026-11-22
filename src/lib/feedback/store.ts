import "server-only";
import { createHash } from "node:crypto";
import { schemaOnce, sql } from "@/lib/db";
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
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
`;

const ensureSchema = schemaOnce(
  SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean)
);

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
    INSERT INTO feedback (topic, kind, body, name, email, page, sender_hash, is_public)
    VALUES (${input.topic}, ${input.kind}, ${input.body}, ${input.name}, ${input.email}, ${page}, ${sender}, ${input.publish})`;
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
  isPublic: boolean;
  isHidden: boolean;
};

/** 管理ページ用：新しい順 */
export async function listFeedback(limit = 500): Promise<FeedbackRow[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT id, created_at, topic, kind, body, name, email, page, is_public, is_hidden FROM feedback
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
    isPublic: Boolean(row.is_public),
    isHidden: Boolean(row.is_hidden),
  }));
}

/** 「みんなの声」に載せるご意見（公開に同意し、非公開にしていないもの） */
export async function listPublicFeedback(limit = 100) {
  const rows = await sql()`
    SELECT id, created_at, topic, kind, body FROM feedback
    WHERE is_public AND NOT is_hidden
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map((row) => ({
    id: Number(row.id),
    createdAt: new Date(row.created_at).toISOString(),
    topic: String(row.topic),
    kind: String(row.kind),
    body: String(row.body),
  }));
}

/** 管理ページから、公開中のご意見を非公開にする（または戻す） */
export async function setFeedbackHidden(id: number, hidden: boolean) {
  await ensureSchema();
  await sql()`UPDATE feedback SET is_hidden = ${hidden} WHERE id = ${id}`;
}
