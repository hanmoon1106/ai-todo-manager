# Supabase Database Schema

AI Todo Manager 프로젝트의 Supabase 데이터베이스 스키마입니다.

---

## 📁 파일 구조

```
supabase/
├── schema.sql       # 데이터베이스 스키마 (바로 실행 가능)
└── README.md        # 이 문서
```

---

## 🚀 빠른 시작

### 1. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트명, 데이터베이스 비밀번호 입력
4. 리전 선택 (권장: ap-northeast-2 - Seoul)

### 2. 스키마 실행

1. Supabase Dashboard → **SQL Editor**
2. "New Query" 클릭
3. `schema.sql` 파일 내용 복사 & 붙여넣기
4. **Run** 버튼 클릭
5. 성공 메시지 확인

### 3. 환경 변수 설정

프로젝트 루트의 `.env.local` 파일에 추가:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

**Dashboard에서 확인:**
- Settings → API → Project URL
- Settings → API → Project API keys → `anon` `public`

---

## 📊 데이터베이스 구조

### 1. **users** 테이블

사용자 프로필 테이블 (auth.users와 1:1 연결)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, FK → auth.users.id | 사용자 ID |
| email | TEXT | NOT NULL | 이메일 |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() | 생성 시각 |
| updated_at | TIMESTAMPTZ | NOT NULL, default NOW() | 수정 시각 |

**특징:**
- auth.users와 1:1 관계
- 회원가입 시 자동 생성 (트리거)
- RLS로 본인만 접근 가능

---

### 2. **todos** 테이블

할 일 관리 테이블

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK, default gen_random_uuid() | Todo ID |
| user_id | UUID | NOT NULL, FK → users.id | 소유자 ID |
| title | TEXT | NOT NULL, 1~100자 | 제목 |
| description | TEXT | NULL, 최대 2000자 | 설명 |
| created_at | TIMESTAMPTZ | NOT NULL, default NOW() | 생성 시각 |
| due_at | TIMESTAMPTZ | NULL | 마감 시각 |
| priority | TEXT | NOT NULL, default 'medium' | 우선순위 |
| category | TEXT | NULL, 최대 50자 | 카테고리 |
| completed | BOOLEAN | NOT NULL, default false | 완료 여부 |
| completed_at | TIMESTAMPTZ | NULL | 완료 시각 |
| updated_at | TIMESTAMPTZ | NOT NULL, default NOW() | 수정 시각 |

**제약 조건:**
- `priority`: 'high', 'medium', 'low' 중 하나
- `title`: 1~100자
- `description`: 최대 2000자
- `category`: 최대 50자

---

## 🔐 보안 (Row Level Security)

### RLS 활성화

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
```

### users 테이블 정책

| 작업 | 정책 | 설명 |
|------|------|------|
| SELECT | `auth.uid() = id` | 본인 프로필만 조회 |
| INSERT | `auth.uid() = id` | 회원가입 시 프로필 생성 |
| UPDATE | `auth.uid() = id` | 본인 프로필만 수정 |

### todos 테이블 정책

| 작업 | 정책 | 설명 |
|------|------|------|
| SELECT | `auth.uid() = user_id` | 본인 Todo만 조회 |
| INSERT | `auth.uid() = user_id` | 본인 Todo만 생성 |
| UPDATE | `auth.uid() = user_id` | 본인 Todo만 수정 |
| DELETE | `auth.uid() = user_id` | 본인 Todo만 삭제 |

---

## 🔧 인덱스

성능 최적화를 위한 인덱스:

```sql
-- 사용자별 생성일 내림차순 (최신순)
CREATE INDEX idx_todos_user_created ON todos(user_id, created_at DESC);

-- 사용자별 마감일 오름차순 (빠른 마감 우선)
CREATE INDEX idx_todos_user_due ON todos(user_id, due_at ASC NULLS LAST);

-- 사용자별 완료 상태 + 마감일
CREATE INDEX idx_todos_user_completed_due ON todos(user_id, completed, due_at);

-- 사용자별 우선순위
CREATE INDEX idx_todos_user_priority ON todos(user_id, priority);
```

---

## ⚙️ 트리거 (Triggers)

### 1. updated_at 자동 업데이트

```sql
-- 수정 시 updated_at 자동 갱신
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. completed_at 자동 설정

```sql
-- completed가 true로 변경되면 completed_at 자동 설정
-- completed가 false로 변경되면 completed_at 초기화
CREATE TRIGGER set_todos_completed_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();
```

### 3. 회원가입 시 users 자동 생성

```sql
-- auth.users에 신규 사용자 생성 시 public.users도 자동 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## 📝 사용 예시

### 회원가입 후 자동 프로필 생성

```typescript
// 회원가입 시 auth.users에 추가되면
// 트리거가 자동으로 public.users에 프로필 생성
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// public.users에 자동으로 레코드 생성됨
```

### Todo 생성

```typescript
const { data, error } = await supabase
  .from('todos')
  .insert({
    user_id: user.id, // 현재 로그인한 사용자 ID
    title: '프로젝트 기획서 작성',
    description: 'Q1 신규 프로젝트 기획서 초안',
    priority: 'high',
    category: '업무',
    due_at: '2026-02-20T18:00:00Z',
  })
  .select()
  .single();
```

### Todo 조회 (필터링)

```typescript
// 진행 중인 Todo만 조회 (완료되지 않음)
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('completed', false)
  .order('due_at', { ascending: true, nullsFirst: false });

// 우선순위가 높은 Todo만 조회
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('priority', 'high')
  .order('created_at', { ascending: false });

// 카테고리별 조회
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('category', '업무');
```

### Todo 완료 처리

```typescript
// completed를 true로 변경하면
// 트리거가 자동으로 completed_at을 현재 시각으로 설정
const { data, error } = await supabase
  .from('todos')
  .update({ completed: true })
  .eq('id', todoId)
  .select();
```

### Todo 삭제

```typescript
const { error } = await supabase
  .from('todos')
  .delete()
  .eq('id', todoId);
```

---

## 🔍 RLS 테스트

### Dashboard에서 확인

1. Supabase Dashboard → **Table Editor**
2. `users` 또는 `todos` 테이블 선택
3. 상단에 "RLS enabled" 표시 확인
4. "View policies" 클릭하여 정책 확인

### 코드에서 테스트

```typescript
// 로그인하지 않고 조회 시도 (실패해야 함)
const { data, error } = await supabase
  .from('todos')
  .select('*');

console.log(error); // RLS 정책으로 인한 에러

// 로그인 후 조회 (성공)
await supabase.auth.signInWithPassword({ email, password });

const { data, error } = await supabase
  .from('todos')
  .select('*');

console.log(data); // 본인 Todo만 조회됨
```

---

## 🛠️ 유지보수

### 스키마 수정

스키마를 수정해야 할 경우:

1. `schema.sql` 파일 수정
2. Supabase Dashboard → SQL Editor
3. 수정된 쿼리만 실행 (전체 재실행 X)

### 마이그레이션 권장

프로덕션 환경에서는 Supabase CLI를 사용한 마이그레이션 권장:

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# 마이그레이션 생성
supabase migration new initial_schema

# 마이그레이션 적용
supabase db push
```

---

## ✅ 체크리스트

스키마 실행 후 확인사항:

- [ ] `users` 테이블 생성 확인
- [ ] `todos` 테이블 생성 확인
- [ ] 인덱스 생성 확인
- [ ] RLS 활성화 확인
- [ ] RLS 정책 생성 확인
- [ ] 트리거 생성 확인
- [ ] 회원가입 테스트 (users 자동 생성 확인)
- [ ] Todo CRUD 테스트
- [ ] RLS 정책 테스트 (다른 사용자 데이터 접근 불가 확인)

---

## 🐛 문제 해결

### "relation does not exist" 에러

**원인:** 테이블이 생성되지 않음

**해결:**
1. SQL Editor에서 전체 스키마 재실행
2. 에러 메시지 확인

### RLS 정책이 작동하지 않음

**확인사항:**
1. RLS가 활성화되어 있는지 확인
2. 정책 이름이 중복되지 않는지 확인
3. `auth.uid()` 함수가 null을 반환하는지 확인 (로그인 필요)

### 트리거가 실행되지 않음

**확인사항:**
1. 트리거 함수가 먼저 생성되었는지 확인
2. 트리거가 올바른 이벤트(BEFORE/AFTER)에 연결되었는지 확인

---

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI 문서](https://supabase.com/docs/guides/cli)

---

스키마 설정이 완료되었습니다! 이제 Next.js 앱에서 Supabase를 사용할 수 있습니다. 🎉
