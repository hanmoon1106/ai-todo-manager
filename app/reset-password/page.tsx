'use client';

/**
 * 비밀번호 재설정 페이지
 * 이메일을 입력하면 재설정 링크 발송
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
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
import { ArrowLeft, CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react';

// 비밀번호 재설정 폼 스키마
const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * 비밀번호 재설정 페이지 컴포넌트
 */
export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // React Hook Form 설정
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // 비밀번호 재설정 요청 핸들러
  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Supabase Auth 비밀번호 재설정 요청
      console.log('비밀번호 재설정 요청:', values);

      // 임시: 2초 대기 후 성공
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
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
        </div>

        {/* 비밀번호 재설정 카드 */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              비밀번호 재설정
            </CardTitle>
            <CardDescription>
              {success
                ? '이메일을 확인해주세요'
                : '가입하신 이메일 주소를 입력하세요'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 성공 메시지 */}
            {success ? (
              <div className="space-y-4">
                <Alert className="border-success bg-success/10">
                  <Mail className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    <strong>이메일이 발송되었습니다!</strong>
                  </AlertDescription>
                </Alert>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    {form.getValues('email')} 주소로 비밀번호 재설정 링크를
                    발송했습니다.
                  </p>
                  <p>
                    이메일을 확인하시고 링크를 클릭하여 비밀번호를
                    재설정하세요.
                  </p>
                  <p className="text-xs">
                    이메일이 도착하지 않았다면 스팸 메일함을 확인해주세요.
                  </p>
                </div>
              </div>
            ) : (
              /* 비밀번호 재설정 폼 */
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
                          가입 시 사용한 이메일 주소로 재설정 링크가 발송됩니다
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 재설정 링크 발송 버튼 */}
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isLoading ? '발송 중...' : '재설정 링크 발송'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {/* 로그인 페이지로 돌아가기 */}
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              로그인 페이지로 돌아가기
            </Link>
          </CardFooter>
        </Card>

        {/* 추가 안내 */}
        {!success && (
          <p className="text-center text-xs text-muted-foreground">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-primary underline hover:no-underline"
            >
              회원가입하기
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
