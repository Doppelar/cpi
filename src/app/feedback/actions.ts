"use server";

import { headers } from "next/headers";
import { isRateLimited, saveFeedback, senderHash } from "@/lib/feedback/store";
import { type FeedbackInput, validateFeedback } from "@/lib/feedback/validate";

export type FeedbackState = {
  status: "idle" | "sent" | "error";
  message?: string;
  errors?: Partial<Record<keyof FeedbackInput, string>>;
};

export async function submitFeedback(
  _previous: FeedbackState,
  form: FormData
): Promise<FeedbackState> {
  // 機械的な投稿よけ（人には見えない欄に入力があれば、受け付けたふりをして保存しない）
  if (String(form.get("website") ?? "").length > 0) {
    return { status: "sent" };
  }
  const result = validateFeedback(Object.fromEntries(form.entries()));
  if (!result.ok) {
    return {
      status: "error",
      message: "入力内容をご確認ください。",
      errors: result.errors,
    };
  }

  const list = await headers();
  const ip =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown";
  const sender = senderHash(ip);
  const page = String(form.get("page") ?? "").slice(0, 200) || null;

  try {
    if (await isRateLimited(sender)) {
      return {
        status: "error",
        message: "短い時間に何度も送信されています。しばらくしてからお送りください。",
      };
    }
    await saveFeedback(result.value, page, sender);
    return { status: "sent" };
  } catch (error) {
    console.error("ご意見の保存に失敗しました", error);
    return {
      status: "error",
      message: "送信できませんでした。時間をおいてもう一度お試しください。",
    };
  }
}
