import "server-only";
import { sql } from "@/lib/db";
import {
  aggregateAnswers,
  type ImpressionInput,
  type SurveyId,
  type SurveyResult,
} from "./surveys";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS impressions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    survey TEXT NOT NULL,
    ym INTEGER NOT NULL,
    answers JSONB NOT NULL,
    age TEXT,
    comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 500),
    sender_hash TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS impressions_survey_time ON impressions (survey, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS impressions_sender_time ON impressions (sender_hash, created_at DESC)`,
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

/** 集計する期間（日） */
export const RESULT_DAYS = 90;
/** 同じ送信元が同じアンケートに答えられる回数（1日あたり） */
const DAILY_LIMIT = 3;

export async function isImpressionLimited(
  survey: SurveyId,
  sender: string
): Promise<boolean> {
  await ensureSchema();
  const rows = await sql()`
    SELECT COUNT(*)::int AS count FROM impressions
    WHERE survey = ${survey} AND sender_hash = ${sender}
      AND created_at > NOW() - INTERVAL '1 day'`;
  return Number(rows[0]?.count ?? 0) >= DAILY_LIMIT;
}

export async function saveImpression(
  input: ImpressionInput,
  sender: string
): Promise<void> {
  await ensureSchema();
  await sql()`
    INSERT INTO impressions (survey, ym, answers, age, comment, sender_hash)
    VALUES (${input.survey}, ${input.ym}, ${JSON.stringify(input.answers)}::jsonb,
            ${input.age}, ${input.comment}, ${sender})`;
}

/** 直近 RESULT_DAYS 日の回答の集計 */
export async function getSurveyResult(survey: SurveyId): Promise<SurveyResult> {
  try {
    await ensureSchema();
    const rows = await sql()`
      SELECT answers FROM impressions
      WHERE survey = ${survey}
        AND created_at > NOW() - make_interval(days => ${RESULT_DAYS})`;
    return aggregateAnswers(
      survey,
      rows.map((row) => row.answers as Record<string, string[]>)
    );
  } catch (error) {
    console.error("アンケートの集計に失敗しました", error);
    return aggregateAnswers(survey, []);
  }
}

export type ImpressionRow = {
  id: number;
  createdAt: string;
  survey: string;
  ym: number;
  answers: Record<string, string[]>;
  age: string | null;
  comment: string | null;
};

/** 管理ページ用：新しい順 */
export async function listImpressions(limit = 500): Promise<ImpressionRow[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT id, created_at, survey, ym, answers, age, comment FROM impressions
    ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map((row) => ({
    id: Number(row.id),
    createdAt: new Date(row.created_at).toISOString(),
    survey: String(row.survey),
    ym: Number(row.ym),
    answers: row.answers as Record<string, string[]>,
    age: row.age == null ? null : String(row.age),
    comment: row.comment == null ? null : String(row.comment),
  }));
}
