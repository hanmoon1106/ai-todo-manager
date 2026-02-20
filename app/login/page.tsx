'use client';

/**
 * 로그인 페이지
 * 이메일/비밀번호 기반 로그인 및 회원가입 링크 제공
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';

// 로그인 폼 유효성 검사 스키마
const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
    .max(100, '비밀번호는 100자 이내로 입력해주세요'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Supabase 에러 메시지를 사용자 친화적 한글로 변환합니다
 */
const getErrorMessage = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (msg.includes('email not confirmed')) {
    return '이메일 인증이 필요합니다. 받은 편지함에서 인증 메일을 확인해주세요.';
  }
  if (msg.includes('user not found')) {
    return '등록되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
  }
  return '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
};

/**
 * 로그인 페이지 컴포넌트
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // React Hook Form 설정
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 로그인 제출 핸들러
  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        // 예상 가능한 인증 에러(잘못된 자격증명 등)는 warn 레벨로 출력
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Login] Auth error:', signInError.message);
        }
        setError(getErrorMessage(signInError.message));
        return;
      }

      // 로그인 성공 → 메인 페이지로 이동
      router.push('/');
      router.refresh();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Login Unexpected Error]', err);
      }
      setError('예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 및 서비스 소개 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg mb-2">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI Todo Manager
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            AI가 도와주는 스마트한 할 일 관리
            <br />
            생산성을 높이고 시간을 절약하세요
          </p>
        </div>

        {/* 로그인 카드 */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 로그인하세요
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 로그인 폼 */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* 이메일 입력 */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 비밀번호 입력 */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 비밀번호 재설정 링크 */}
                <div className="flex justify-end">
                  <Link
                    href="/reset-password"
                    className="text-sm text-primary hover:underline"
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>

                {/* 로그인 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {/* 구분선 */}
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  또는
                </span>
              </div>
            </div>

            {/* 회원가입 링크 */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                아직 계정이 없으신가요?{' '}
              </span>
              <Link
                href="/signup"
                className="font-semibold text-primary hover:underline"
              >
                회원가입하기
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* 푸터 */}
        <p className="text-center text-xs text-muted-foreground">
          로그인하면{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            이용약관
          </Link>{' '}
          및{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            개인정보처리방침
          </Link>
          에 동의하는 것으로 간주됩니다
        </p>
      </div>
    </div>
  );
}
