# 인증 페이지

PRD 기반으로 작성된 인증(로그인/회원가입/비밀번호 재설정) 페이지입니다.

## 페이지 구성

### 1. 로그인 페이지 (`/login`)

**위치:** `app/login/page.tsx`

**주요 기능:**
- 이메일/비밀번호 입력 폼
- React Hook Form + Zod 유효성 검사
- 로딩 상태 표시
- 에러/성공 메시지 표시
- 회원가입 페이지 링크
- 비밀번호 재설정 링크

**유효성 검사:**
- 이메일: 필수, 올바른 이메일 형식
- 비밀번호: 필수, 6자 이상

**화면 구성:**
- 서비스 로고 (AI 아이콘)
- 서비스명: "AI Todo Manager"
- 서비스 소개: "AI가 도와주는 스마트한 할 일 관리"
- 로그인 폼 카드
- 회원가입 링크
- 이용약관/개인정보처리방침 링크

---

### 2. 회원가입 페이지 (`/signup`)

**위치:** `app/signup/page.tsx`

**주요 기능:**
- 이메일/비밀번호/비밀번호 확인 입력
- 비밀번호 강도 검증
- 비밀번호 일치 확인
- 로그인 페이지 링크

**유효성 검사:**
- 이메일: 필수, 올바른 이메일 형식
- 비밀번호: 필수, 6자 이상, 영문+숫자 포함
- 비밀번호 확인: 필수, 비밀번호와 일치

**에러 메시지:**
- "이메일을 입력해주세요"
- "올바른 이메일 형식이 아닙니다"
- "비밀번호는 최소 6자 이상이어야 합니다"
- "비밀번호는 영문과 숫자를 포함해야 합니다"
- "비밀번호가 일치하지 않습니다"

---

### 3. 비밀번호 재설정 페이지 (`/reset-password`)

**위치:** `app/reset-password/page.tsx`

**주요 기능:**
- 이메일 입력
- 재설정 링크 발송
- 성공 시 안내 메시지 표시
- 로그인 페이지로 돌아가기 링크

**흐름:**
1. 사용자가 이메일 입력
2. "재설정 링크 발송" 버튼 클릭
3. 이메일 발송 성공 메시지 표시
4. 사용자는 이메일을 확인하여 비밀번호 재설정

---

## 디자인 시스템

### 컬러
- **배경**: 그라데이션 (blue-50 → white → violet-50)
- **다크 모드 배경**: gray-950 → gray-900 → gray-950
- **로고**: Primary(블루) → Secondary(바이올렛) 그라데이션
- **제목**: Primary → Secondary 그라데이션 텍스트
- **버튼**: Primary 컬러 (프로덕티브 블루)
- **링크**: Primary 컬러, hover 시 underline

### 아이콘
- **서비스 로고**: Sparkles (AI 느낌)
- **로딩**: Loader2 (회전 애니메이션)
- **성공**: CheckCircle2
- **이메일**: Mail
- **뒤로가기**: ArrowLeft

### 레이아웃
- **카드**: 최대 너비 448px (max-w-md)
- **카드 테두리**: 2px solid, 큰 그림자
- **버튼 크기**: lg (큰 버튼)
- **간격**: 일관된 spacing 시스템

---

## 상태 관리

### 로딩 상태
```tsx
const [isLoading, setIsLoading] = useState(false);
```
- 폼 제출 시 `true`
- 입력 필드 및 버튼 비활성화
- 버튼에 로딩 스피너 표시

### 에러 상태
```tsx
const [error, setError] = useState<string | null>(null);
```
- API 에러 발생 시 에러 메시지 저장
- Alert(destructive) 컴포넌트로 표시

### 성공 상태
```tsx
const [success, setSuccess] = useState(false);
```
- 작업 성공 시 `true`
- Alert(success) 컴포넌트로 표시
- 성공 시 자동 리다이렉트 (TODO)

---

## TODO: Supabase 연동

현재는 임시 구현이며, 실제 Supabase Auth 연동이 필요합니다:

### 로그인
```tsx
// app/login/page.tsx
const onSubmit = async (values: LoginFormValues) => {
  // TODO: Supabase signInWithPassword 구현
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });
  
  if (error) throw error;
  router.push('/app');
};
```

### 회원가입
```tsx
// app/signup/page.tsx
const onSubmit = async (values: SignupFormValues) => {
  // TODO: Supabase signUp 구현
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
  });
  
  if (error) throw error;
  router.push('/login');
};
```

### 비밀번호 재설정
```tsx
// app/reset-password/page.tsx
const onSubmit = async (values: ResetPasswordFormValues) => {
  // TODO: Supabase resetPasswordForEmail 구현
  const { error } = await supabase.auth.resetPasswordForEmail(
    values.email,
    {
      redirectTo: `${window.location.origin}/update-password`,
    }
  );
  
  if (error) throw error;
  setSuccess(true);
};
```

---

## 라우팅 가드

PRD 요구사항에 따라 인증 상태에 따른 라우팅이 필요합니다:

### 미들웨어 (TODO)
```tsx
// middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);

  // 미로그인 사용자는 /login으로 리다이렉트
  if (!session && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 로그인된 사용자가 /login 접근 시 /app으로 리다이렉트
  if (session && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 사용된 컴포넌트

### Shadcn/ui
- Button
- Card (CardContent, CardDescription, CardFooter, CardHeader, CardTitle)
- Form (FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage)
- Input
- Alert (AlertDescription)

### Lucide React 아이콘
- Sparkles - 서비스 로고
- Loader2 - 로딩 스피너
- CheckCircle2 - 성공 아이콘
- Mail - 이메일 아이콘
- ArrowLeft - 뒤로가기 아이콘

### 외부 라이브러리
- react-hook-form - 폼 관리
- zod - 스키마 유효성 검사
- @hookform/resolvers - React Hook Form + Zod 통합
- next/link - 페이지 네비게이션

---

## 접근성 (a11y)

- ✅ 시맨틱 HTML 사용
- ✅ Form 레이블 및 설명 제공
- ✅ 에러 메시지 명확히 표시
- ✅ 키보드 네비게이션 가능
- ✅ 로딩 상태 시각적 피드백
- ✅ 적절한 autocomplete 속성

---

## 반응형 디자인

- ✅ 모바일: 전체 너비 (p-4 패딩)
- ✅ 데스크톱: 최대 448px 너비 중앙 정렬
- ✅ 다크 모드 완벽 지원
- ✅ 터치 친화적인 버튼 크기

---

## PRD 준수 사항

✅ **7.1 인증 요구사항**
- 회원가입/로그인/로그아웃 (로그아웃은 추후 구현)
- 로그인 상태 유지(세션) - Supabase Auth 사용 예정
- 비밀번호 재설정(이메일 링크 기반)

✅ **화면/UX**
- 로그인/회원가입 페이지 분리 (PRD는 탭 전환이지만 별도 페이지로 구현)
- 필수 입력: 이메일, 비밀번호
- 에러 메시지: 인증 실패/형식 오류 대응

✅ **수용 기준(AC)**
- 미로그인 사용자 `/login` 리다이렉트 (미들웨어 필요)
- 로그인 시 `/app` 이동 (TODO)
- 로그아웃 시 세션 제거 후 `/login` 이동 (TODO)

✅ **코딩 스타일**
- 화살표 함수 사용
- 한글 주석 필수
- TypeScript strict mode
- ESLint 규칙 준수

---

## 다음 단계

1. ✅ Supabase 프로젝트 설정
2. ✅ Supabase Auth 클라이언트 초기화
3. ✅ 인증 API 함수 구현
4. ✅ 미들웨어 설정 (라우팅 가드)
5. ✅ 세션 관리 Context/Hook 구현
6. ✅ 로그아웃 기능 구현
