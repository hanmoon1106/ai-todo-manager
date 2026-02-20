/**
 * 서버 컴포넌트용 Supabase 클라이언트
 * Server Components, Server Actions, Route Handlers에서 사용
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 서버 사이드 Supabase 클라이언트 생성
 * Next.js 15의 async cookies()를 지원
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll은 Server Component에서 호출될 때 무시됨
            // 이는 미들웨어나 Server Action에서만 작동함
          }
        },
      },
    }
  );
};
