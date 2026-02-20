/**
 * 인증 관련 타입 정의
 */

/**
 * 사용자 정보 타입
 */
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

/**
 * 로그인 요청 데이터
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * 회원가입 요청 데이터
 */
export interface SignupCredentials {
  email: string;
  password: string;
}

/**
 * 비밀번호 재설정 요청 데이터
 */
export interface ResetPasswordRequest {
  email: string;
}

/**
 * 인증 세션 타입
 */
export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * 인증 상태 타입
 */
export type AuthState = 'authenticated' | 'unauthenticated' | 'loading';
