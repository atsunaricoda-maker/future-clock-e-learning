import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ミドルウェアでは認証チェックを行わない
// JWTトークンはlocalStorageに保存されており、サーバーサイドからアクセスできないため
// 認証チェックはクライアントサイドのコンポーネントで行う

export function middleware(_request: NextRequest) {
  // すべてのリクエストを通過させる
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
