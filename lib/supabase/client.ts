/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 * 'use client' 지시어가 있는 컴포넌트에서 사용
 */

import { createBrowserClient } from '@supabase/ssr';

/**
 * 클라이언트 사이드 Supabase 클라이언트 생성
 */
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
};
