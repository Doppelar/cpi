"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { setFeedbackHidden } from "@/lib/feedback/store";
import { setImpressionHidden } from "@/lib/impressions/store";
import { setInterviewHidden } from "@/lib/interview/store";

/**
 * 「みんなの声」への掲載をとりやめる／戻す。
 * Server Action はどの URL からでも呼べるため、ここでも管理用パスワードを確かめる。
 */
export async function toggleHidden(form: FormData): Promise<void> {
  const list = await headers();
  if (!isAdminAuthorization(list.get("authorization"))) {
    throw new Error("unauthorized");
  }
  const kind = String(form.get("kind") ?? "");
  const id = String(form.get("id") ?? "");
  const hidden = form.get("hidden") === "1";
  if (kind === "feedback" && /^\d+$/.test(id)) await setFeedbackHidden(Number(id), hidden);
  else if (kind === "impression" && /^\d+$/.test(id)) await setImpressionHidden(Number(id), hidden);
  else if (kind === "interview" && /^[A-Za-z0-9_-]{8,64}$/.test(id)) await setInterviewHidden(id, hidden);
  else throw new Error("bad request");
  revalidatePath("/admin/feedback");
  revalidatePath("/voices");
}
