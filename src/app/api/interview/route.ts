import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { senderHash } from "@/lib/feedback/store";
import { getInterviewContext } from "@/lib/interview/context";
import { GATEWAY_OPTIONS, INTERVIEW_MODEL } from "@/lib/interview/models";
import { canContinue, saveTranscript } from "@/lib/interview/store";
import {
  buildInstructions,
  checkConversation,
  isInterviewTopic,
} from "@/lib/interview/topics";

export const runtime = "nodejs";
export const maxDuration = 60;


export async function POST(request: NextRequest) {
  let body: { id?: unknown; topic?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "形式が正しくありません。" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id) || !isInterviewTopic(body.topic)) {
    return NextResponse.json({ error: "形式が正しくありません。" }, { status: 400 });
  }
  const topic = body.topic;
  const messages = (Array.isArray(body.messages) ? body.messages : []) as UIMessage[];
  const check = checkConversation(messages);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const sender = senderHash(ip);
  if (!(await canContinue(id, sender))) {
    return NextResponse.json(
      { error: "今日はたくさんのインタビューにご協力いただきました。また明日お願いします。" },
      { status: 429 }
    );
  }

  const context = await getInterviewContext(topic);
  const result = streamText({
    model: INTERVIEW_MODEL,
    system: buildInstructions(topic, context.data, check.userTurns),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 500,
    providerOptions: GATEWAY_OPTIONS,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: all }) => {
      try {
        await saveTranscript(id, topic, all, sender);
      } catch (error) {
        console.error("インタビューの保存に失敗しました", error);
      }
    },
    onError: (error) => {
      console.error("AI インタビューでエラーが起きました", error);
      return "AIの応答でエラーが起きました。少し時間をおいて、もう一度送ってください。";
    },
  });
}
