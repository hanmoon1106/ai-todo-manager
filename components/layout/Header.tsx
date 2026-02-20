'use client';

/**
 * 메인 페이지 헤더 컴포넌트
 * 서비스 로고, 사용자 정보, 로그아웃 버튼 표시
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, LogOut, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface HeaderProps {
  userEmail?: string;
}

/**
 * 앱 상단 헤더 - 로고, 사용자 메뉴, 로그아웃
 */
export const Header = ({ userEmail = 'user@example.com' }: HeaderProps) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 이메일에서 이니셜 추출
  const getInitials = (email: string) => email.charAt(0).toUpperCase();

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Logout Error]', error);
        }
        toast.error('로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      // 로그아웃 성공 → 로그인 페이지로 이동
      router.push('/login');
      router.refresh();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Logout Unexpected Error]', err);
      }
      toast.error('예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* 로고 및 서비스명 */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Todo Manager
            </h1>
            <p className="text-xs text-muted-foreground">
              AI가 도와주는 할 일 관리
            </p>
          </div>
        </div>

        {/* 사용자 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              disabled={isLoggingOut}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {isLoggingOut
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : getInitials(userEmail)
                  }
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">내 계정</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              <span>프로필 설정</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* 로그아웃 버튼 - 로그아웃 중 비활성화 */}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <LogOut className="mr-2 h-4 w-4" />
              }
              <span>{isLoggingOut ? '로그아웃 중...' : '로그아웃'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
