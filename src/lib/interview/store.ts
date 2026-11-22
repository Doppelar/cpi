import "server-only";
import { sql } from "@/lib/db";
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
];

let schemaReady: Promise<void> | null = null;
function ensureSchema() {
  schemaReady ??= (async () => {
    const db = sql();
    for (const statement of SCHEMA) await db.query(statement);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

/** 同じ送信元が1日に始められるインタビューの数 */
const DAILY_SESSIONS = 5;

/** この会話を続けてよいか（新しい会話なら、1日の上限を超えていないか） */
export async function canContinue(id: string, sender: string): Promise<boolean> {
  await ensureSchema();
  const existing = await sql()`SELECT sender_hash FROM interview_sessions WHERE id = ${id}`;
  if (existing[0]) return existing[0].sender_hash === sender;
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
};

/** 管理ページ用：新しい順 */
export async function listInterviewSessions(limit = 200): Promise<InterviewSessionRow[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT id, topic, created_at, transcript, user_turns, completed FROM interview_sessions
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map((row) => ({
    id: String(row.id),
    topic: String(row.topic),
    createdAt: new Date(row.created_at).toISOString(),
    transcript: row.transcript as TranscriptLine[],
    userTurns: Number(row.user_turns),
    completed: Boolean(row.completed),
  }));
}
