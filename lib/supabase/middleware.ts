/**
 * 미들웨어 전용 Supabase 클라이언트
 * Next.js middleware에서 세션 갱신 및 인증 상태 확인에 사용
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * 미들웨어용 Supabase 클라이언트 생성
 * request/response 쿠키를 양방향으로 동기화하여 세션 토큰을 갱신함
 */
export const createMiddlewareClient = (request: NextRequest) => {
  // 기본 응답 객체 생성 (쿠키 전파를 위해 request 포함)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request 쿠키 업데이트
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 갱신된 request로 response 재생성 후 쿠키 동기화
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, supabaseResponse };
};
