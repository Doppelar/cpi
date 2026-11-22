"use server";

import { headers } from "next/headers";
import { senderHash } from "@/lib/feedback/store";
import {
  getSurveyResult,
  isImpressionLimited,
  saveImpression,
} from "@/lib/impressions/store";
import { type SurveyResult, validateImpression } from "@/lib/impressions/surveys";

export type ImpressionState = {
  status: "idle" | "sent" | "error";
  message?: string;
  result?: SurveyResult;
};

export async function submitImpression(
  _previous: ImpressionState,
  form: FormData
): Promise<ImpressionState> {
  if (String(form.get("website") ?? "").length > 0) return { status: "sent" };
  const fields: Record<string, string[]> = {};
  for (const key of new Set(form.keys())) {
    fields[key] = form.getAll(key).map(String);
  }
  const checked = validateImpression(fields);
  if (!checked.ok) return { status: "error", message: checked.message };

  const list = await headers();
  const ip =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown";
  const sender = senderHash(ip);
  try {
    if (await isImpressionLimited(checked.value.survey, sender)) {
      return {
        status: "error",
        message: "今日はもう何度か回答いただいています。また明日お寄せください。",
      };
    }
    await saveImpression(checked.value, sender);
    return { status: "sent", result: await getSurveyResult(checked.value.survey) };
  } catch (error) {
    console.error("感想の保存に失敗しました", error);
    return {
      status: "error",
      message: "送信できませんでした。時間をおいてもう一度お試しください。",
    };
  }
}
