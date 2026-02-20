/**
 * Next.js 미들웨어 — Supabase 인증 기반 라우트 가드
 * 모든 요청에서 세션을 갱신하고, 인증 상태에 따라 리다이렉트 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * 로그인된 사용자만 접근할 수 없는 인증 전용 경로
 * (이미 로그인 상태면 메인 페이지로 리다이렉트)
 */
const AUTH_ONLY_PATHS = ['/login', '/signup', '/reset-password'];

/**
 * 미들웨어 핸들러
 * getUser()는 서버에서 세션을 직접 검증하므로 getSession()보다 안전함
 */
export const middleware = async (request: NextRequest) => {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);
  const pathname = request.nextUrl.pathname;

  // 세션 갱신 및 사용자 정보 확인 (서버 검증)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthOnlyPath = AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // 비로그인 사용자가 보호된 경로 접근 → /login으로 리다이렉트
  if (!user && !isAuthOnlyPath) {
    const redirectUrl = new URL('/login', request.url);
    // 로그인 후 원래 경로로 돌아올 수 있도록 next 파라미터 추가
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 로그인된 사용자가 인증 전용 경로 접근 → 메인 페이지로 리다이렉트
  if (user && isAuthOnlyPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 세션 쿠키가 갱신된 응답 반환
  return supabaseResponse;
};

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 미들웨어 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - 이미지/폰트/SVG 등 정적 에셋
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
};
