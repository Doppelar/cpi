/** 管理用パスワードの確認（middleware と管理用の処理で共通に使う） */
export function isAdminAuthorization(header: string | null | undefined): boolean {
  const password = process.env.FEEDBACK_ADMIN_PASSWORD;
  if (!password || !header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const given = decoded.slice(decoded.indexOf(":") + 1);
  return given.length === password.length && given === password;
}
