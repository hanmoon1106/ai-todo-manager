'use client';

/**
 * 회원가입 페이지
 * 이메일/비밀번호 기반 회원가입
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Mail, Sparkles } from 'lucide-react';

// 회원가입 폼 유효성 검사 스키마
const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, '이메일을 입력해주세요')
      .email('올바른 이메일 형식이 아닙니다'),
    password: z
      .string()
      .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
      .max(100, '비밀번호는 100자 이내로 입력해주세요')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])/,
        '비밀번호는 영문과 숫자를 포함해야 합니다'
      ),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

/**
 * Supabase 에러 코드를 사용자 친화적 한글 메시지로 변환합니다
 */
const getErrorMessage = (message: string): string => {
  if (message.includes('User already registered')) {
    return '이미 가입된 이메일 주소입니다. 로그인 페이지에서 로그인해 주세요.';
  }
  if (message.includes('Invalid email')) {
    return '올바른 이메일 형식이 아닙니다.';
  }
  if (message.includes('Password should be at least')) {
    return '비밀번호는 최소 6자 이상이어야 합니다.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
  }
  return '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
};

/**
 * 회원가입 페이지 컴포넌트
 */
export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 이메일 인증 대기 상태 (Supabase 이메일 확인 설정 여부에 따라 분기)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // React Hook Form 설정
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // 회원가입 제출 핸들러
  const onSubmit = async (values: SignupFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (signUpError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Signup Error]', signUpError);
        }
        setError(getErrorMessage(signUpError.message));
        return;
      }

      // 이메일 인증 대기 중인 경우 (session이 없고 user만 있는 경우)
      if (data.user && !data.session) {
        setSubmittedEmail(values.email);
        setNeedsEmailConfirm(true);
        return;
      }

      // 이메일 인증 없이 즉시 로그인된 경우 메인 페이지로 이동
      if (data.session) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Signup Unexpected Error]', err);
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
            지금 바로 시작하세요
          </p>
        </div>

        {/* 회원가입 카드 */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
            <CardDescription>
              새 계정을 만들고 AI Todo Manager를 시작하세요
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

            {/* 이메일 인증 대기 메시지 */}
            {needsEmailConfirm ? (
              <div className="space-y-4 text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                  <Mail className="h-8 w-8 text-success" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">
                    인증 메일을 발송했습니다!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {submittedEmail}
                    </span>
                    로 전송된 인증 링크를 클릭하면<br />가입이 완료됩니다.
                  </p>
                  <p className="text-xs text-muted-foreground pt-2">
                    메일이 도착하지 않으면 스팸함을 확인해주세요.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    로그인 페이지로 이동 →
                  </Link>
                </div>
              </div>
            ) : (
            /* 회원가입 폼 */
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
                      <FormDescription>
                        로그인 시 사용할 이메일 주소를 입력하세요
                      </FormDescription>
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
                          autoComplete="new-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        영문과 숫자를 포함하여 6자 이상 입력하세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 비밀번호 확인 */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="new-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 회원가입 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading ? '가입 처리 중...' : '회원가입'}
                </Button>
              </form>
            </Form>
            )}
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

            {/* 로그인 링크 */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                이미 계정이 있으신가요?{' '}
              </span>
              <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
              >
                로그인하기
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* 푸터 */}
        {!needsEmailConfirm && (
          <p className="text-center text-xs text-muted-foreground">
            계정을 생성하면{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              이용약관
            </Link>{' '}
            및{' '}
            <Link href="/privacy" className="underline hover:text-foreground">
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주됩니다
          </p>
        )}
      </div>
    </div>
  );
}
