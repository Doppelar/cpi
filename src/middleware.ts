import { type NextRequest, NextResponse } from "next/server";

/** 管理ページ（/admin）を、ベーシック認証のパスワードで守る */
export function middleware(request: NextRequest) {
  const password = process.env.FEEDBACK_ADMIN_PASSWORD;
  const header = request.headers.get("authorization") ?? "";
  if (password && header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given.length === password.length && given === password) {
      return NextResponse.next();
    }
  }
  return new NextResponse("パスワードが必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/admin/:path*"] };
