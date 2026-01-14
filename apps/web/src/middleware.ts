import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// シンプルな認証ミドルウェア（Clerk不要）
// 認証が必要なルートを定義
const protectedRoutes = [
  '/dashboard',
  '/my-learning',
  '/instructor',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 認証が必要なルートかチェック
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // セッションCookieをチェック
    const sessionToken = request.cookies.get('session_token');
    
    if (!sessionToken) {
      // 未認証の場合はログインページへリダイレクト
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
