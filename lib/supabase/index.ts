/**
 * Supabase 클라이언트 export
 * client/server 모두 createClient를 export하므로 별칭으로 구분합니다
 */

export { createClient as createBrowserClient } from './client';
export { createClient as createSupabaseServerClient } from './server';
