# Supabase 클라이언트 설정

Next.js 15 App Router와 `@supabase/ssr`을 사용한 Supabase 클라이언트 초기화 파일입니다.

---

## 📁 파일 구조

```
lib/supabase/
├── client.ts       # 클라이언트 컴포넌트용
├── server.ts       # 서버 컴포넌트용
├── index.ts        # export
└── README.md       # 문서
```

---

## 🔧 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가해야 합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

**Supabase Dashboard에서 확인:**
1. 프로젝트 선택
2. Settings → API
3. Project URL 복사
4. Project API keys → `anon` `public` 키 복사

---

## 📖 사용법

### 1. 클라이언트 컴포넌트에서 사용

`'use client'` 지시어가 있는 컴포넌트에서 사용합니다.

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function MyComponent() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    // 사용자 정보 가져오기
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
  }, []);

  return <div>User: {user?.email}</div>;
}
```

**주요 사용 사례:**
- 실시간 구독 (Realtime)
- 클라이언트 사이드 데이터 페칭
- 브라우저에서 인증 상태 확인

---

### 2. 서버 컴포넌트에서 사용

Server Components에서 사용합니다. **async/await 필수**

```tsx
import { createClient } from '@/lib/supabase/server';

export default async function MyServerComponent() {
  const supabase = await createClient();
  
  // 데이터 페칭
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      {todos?.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

**주요 사용 사례:**
- 초기 데이터 페칭 (SSR)
- 서버 사이드 인증 확인
- SEO가 필요한 데이터 렌더링

---

### 3. Server Actions에서 사용

`'use server'` 함수에서 사용합니다.

```tsx
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const addTodo = async (formData: FormData) => {
  const supabase = await createClient();
  
  const title = formData.get('title') as string;
  
  const { error } = await supabase
    .from('todos')
    .insert({ title });
  
  if (error) throw error;
  
  revalidatePath('/');
};
```

**주요 사용 사례:**
- 폼 제출 처리
- 데이터 변경 (CRUD)
- 서버 사이드 비즈니스 로직

---

### 4. Route Handlers (API Routes)에서 사용

```tsx
// app/api/todos/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('todos')
    .select('*');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}
```

**주요 사용 사례:**
- REST API 엔드포인트
- Webhook 처리
- 외부 서비스 연동

---

## 🔐 인증 예시

### 로그인

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';

const handleLogin = async (email: string, password: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  return data;
};
```

### 회원가입

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';

const handleSignup = async (email: string, password: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  
  return data;
};
```

### 로그아웃

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';

const handleLogout = async () => {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) throw error;
};
```

### 서버에서 사용자 정보 확인

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return <div>Welcome, {user.email}!</div>;
}
```

---

## 📊 데이터 CRUD 예시

### Create (추가)

```tsx
const { data, error } = await supabase
  .from('todos')
  .insert({
    title: 'New Todo',
    completed: false,
  })
  .select()
  .single();
```

### Read (조회)

```tsx
// 전체 조회
const { data, error } = await supabase
  .from('todos')
  .select('*');

// 필터링
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('completed', false)
  .order('created_at', { ascending: false });

// 단건 조회
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('id', todoId)
  .single();
```

### Update (수정)

```tsx
const { data, error } = await supabase
  .from('todos')
  .update({ completed: true })
  .eq('id', todoId)
  .select();
```

### Delete (삭제)

```tsx
const { error } = await supabase
  .from('todos')
  .delete()
  .eq('id', todoId);
```

---

## 🔄 실시간 구독

**클라이언트 컴포넌트에서만 가능**

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export default function RealtimeTodos() {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('todos-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
        },
        (payload) => {
          console.log('변경 감지:', payload);
          // 데이터 업데이트 로직
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return <div>실시간 Todo 목록</div>;
}
```

---

## ⚠️ 주의사항

### 1. Server vs Client 클라이언트 구분

- **Server Component**: `await createClient()` from `'@/lib/supabase/server'`
- **Client Component**: `createClient()` from `'@/lib/supabase/client'`

### 2. 환경 변수

- 반드시 `NEXT_PUBLIC_` 접두사 사용
- `.env.local` 파일은 `.gitignore`에 추가

### 3. 쿠키 설정

서버 클라이언트는 Next.js의 `cookies()`를 사용하여 세션을 관리합니다. 이는 Server Component에서 자동으로 처리됩니다.

### 4. 타입 안전성

Supabase CLI로 타입을 생성하면 더 안전한 코드 작성이 가능합니다:

```bash
npx supabase gen types typescript --project-id your-project-id > lib/supabase/database.types.ts
```

---

## 🔗 참고 자료

- [Supabase Next.js 공식 문서](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Supabase Database 문서](https://supabase.com/docs/guides/database)
- [@supabase/ssr 패키지](https://github.com/supabase/ssr)

---

설정이 완료되었습니다! 이제 프로젝트에서 Supabase를 사용할 수 있습니다. 🎉
