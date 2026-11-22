import "server-only";
import { schemaOnce, sql } from "@/lib/db";
import { type ChatMessageLike, isClosingMessage, messageText } from "./topics";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transcript JSONB NOT NULL,
    user_turns INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    sender_hash TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS interview_sessions_sender_time ON interview_sessions (sender_hash, created_at DESC)`,
  `ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false`,
];

const ensureSchema = schemaOnce(SCHEMA);

/** 同じ送信元が1日に始められるインタビューの数 */
const DAILY_SESSIONS = 20;

/** この会話を続けてよいか（新しい会話なら、1日の上限を超えていないか） */
export async function canContinue(id: string, sender: string): Promise<boolean> {
  await ensureSchema();
  const existing = await sql()`SELECT sender_hash FROM interview_sessions WHERE id = ${id}`;
  // 始めたインタビューは、回線が変わっても（Wi-Fi とモバイルの切り替えなど）続けられるようにする
  if (existing[0]) return true;
  const rows = await sql()`
    SELECT COUNT(*)::int AS count FROM interview_sessions
    WHERE sender_hash = ${sender} AND created_at > NOW() - INTERVAL '1 day'`;
  return Number(rows[0]?.count ?? 0) < DAILY_SESSIONS;
}

type TranscriptLine = { role: "user" | "assistant"; text: string };

/** 会話を保存する（同じ id なら上書き） */
export async function saveTranscript(
  id: string,
  topic: string,
  messages: readonly ChatMessageLike[],
  sender: string
): Promise<void> {
  await ensureSchema();
  const transcript: TranscriptLine[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as TranscriptLine["role"], text: messageText(m).slice(0, 2000) }));
  const userTurns = transcript.filter((line) => line.role === "user").length;
  const completed = transcript.some(
    (line) => line.role === "assistant" && isClosingMessage(line.text)
  );
  await sql()`
    INSERT INTO interview_sessions (id, topic, transcript, user_turns, completed, sender_hash)
    VALUES (${id}, ${topic}, ${JSON.stringify(transcript)}::jsonb, ${userTurns}, ${completed}, ${sender})
    ON CONFLICT (id) DO UPDATE SET transcript = EXCLUDED.transcript,
      user_turns = EXCLUDED.user_turns, completed = EXCLUDED.completed, updated_at = NOW()`;
}

export type InterviewSessionRow = {
  id: string;
  topic: string;
  createdAt: string;
  transcript: TranscriptLine[];
  userTurns: number;
  completed: boolean;
  isPublic: boolean;
  isHidden: boolean;
};

/** 管理ページ用：新しい順 */
export async function listInterviewSessions(limit = 200): Promise<InterviewSessionRow[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT id, topic, created_at, transcript, user_turns, completed, is_public, is_hidden
    FROM interview_sessions
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map((row) => ({
    id: String(row.id),
    topic: String(row.topic),
    createdAt: new Date(row.created_at).toISOString(),
    transcript: row.transcript as TranscriptLine[],
    userTurns: Number(row.user_turns),
    completed: Boolean(row.completed),
    isPublic: Boolean(row.is_public),
    isHidden: Boolean(row.is_hidden),
  }));
}

/** 終わったインタビューを公開する／しない（回答した本人がインタビューの最後に選ぶ） */
export async function setInterviewPublic(id: string, isPublic: boolean): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE interview_sessions SET is_public = ${isPublic}, updated_at = NOW()
    WHERE id = ${id} AND completed RETURNING id`;
  return rows.length > 0;
}

/** 「みんなの声」に載せる、公開に同意した AI インタビュー */
export async function listPublicInterviews(limit = 50): Promise<InterviewSessionRow[]> {
  const rows = await sql()`
    SELECT id, topic, created_at, transcript, user_turns, completed FROM interview_sessions
    WHERE is_public AND NOT is_hidden AND completed
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map((row) => ({
    id: String(row.id),
    topic: String(row.topic),
    createdAt: new Date(row.created_at).toISOString(),
    transcript: row.transcript as TranscriptLine[],
    userTurns: Number(row.user_turns),
    completed: true,
    isPublic: true,
    isHidden: false,
  }));
}

export async function setInterviewHidden(id: string, hidden: boolean) {
  await ensureSchema();
  await sql()`UPDATE interview_sessions SET is_hidden = ${hidden} WHERE id = ${id}`;
}
