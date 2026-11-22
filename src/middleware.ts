import { type NextRequest, NextResponse } from "next/server";
import { isAdminAuthorization } from "@/lib/admin-auth";

/** 管理ページ（/admin）を、ベーシック認証のパスワードで守る */
export function middleware(request: NextRequest) {
  if (isAdminAuthorization(request.headers.get("authorization"))) {
    return NextResponse.next();
  }
  return new NextResponse("パスワードが必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/admin/:path*"] };
