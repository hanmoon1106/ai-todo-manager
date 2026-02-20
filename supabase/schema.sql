-- ============================================
-- AI Todo Manager - Supabase Database Schema
-- ============================================
-- 작성일: 2026-02-17
-- 설명: PRD 기반 사용자 프로필 및 Todo 관리 스키마
-- 멱등성 보장: 몇 번을 실행해도 동일한 결과
-- ============================================


-- ============================================
-- 1. 사용자 프로필 테이블 (public.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users              IS '사용자 프로필 테이블 (auth.users와 1:1 연결)';
COMMENT ON COLUMN public.users.id           IS '사용자 ID (auth.users.id와 동일)';
COMMENT ON COLUMN public.users.email        IS '사용자 이메일';
COMMENT ON COLUMN public.users.created_at   IS '계정 생성 시각 (UTC)';
COMMENT ON COLUMN public.users.updated_at   IS '프로필 수정 시각 (UTC)';


-- ============================================
-- 2. Todo 테이블 (public.todos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.todos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description TEXT        CHECK (char_length(description) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at      TIMESTAMPTZ,
  priority    TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  category    TEXT        CHECK (char_length(category) <= 50),
  completed   BOOLEAN     NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.todos               IS '할 일 관리 테이블';
COMMENT ON COLUMN public.todos.id            IS 'Todo 고유 식별자';
COMMENT ON COLUMN public.todos.user_id       IS '소유 사용자 ID';
COMMENT ON COLUMN public.todos.title         IS '할 일 제목 (1~100자)';
COMMENT ON COLUMN public.todos.description   IS '할 일 설명 (최대 2000자)';
COMMENT ON COLUMN public.todos.created_at    IS '생성 시각 (UTC)';
COMMENT ON COLUMN public.todos.due_at        IS '마감 시각 (UTC)';
COMMENT ON COLUMN public.todos.priority      IS '우선순위 (high / medium / low)';
COMMENT ON COLUMN public.todos.category      IS '카테고리 (예: 업무, 개인, 학습)';
COMMENT ON COLUMN public.todos.completed     IS '완료 여부';
COMMENT ON COLUMN public.todos.completed_at  IS '완료 시각 (UTC)';
COMMENT ON COLUMN public.todos.updated_at    IS '수정 시각 (UTC)';


-- ============================================
-- 3. 인덱스 (Index)
-- IF NOT EXISTS 지원 → 중복 실행 안전
-- ============================================
CREATE INDEX IF NOT EXISTS idx_todos_user_created
  ON public.todos(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_todos_user_due
  ON public.todos(user_id, due_at ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_todos_user_completed_due
  ON public.todos(user_id, completed, due_at);

CREATE INDEX IF NOT EXISTS idx_todos_user_priority
  ON public.todos(user_id, priority);


-- ============================================
-- 4. 트리거 함수 (Trigger Functions)
-- CREATE OR REPLACE 사용 → 중복 실행 안전
-- ============================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- completed_at 자동 설정 함수
CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- completed false → true: completed_at 현재 시각으로 설정
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = NOW();
  END IF;
  -- completed true → false: completed_at 초기화
  IF NEW.completed = false AND OLD.completed = true THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 회원가입 시 public.users 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;  -- 이미 존재하면 무시
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. 트리거 (Triggers)
-- DROP IF EXISTS 후 CREATE → 중복 실행 안전
-- (트리거는 OR REPLACE를 지원하지 않음)
-- ============================================

-- users: updated_at 자동 갱신
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- todos: updated_at 자동 갱신
DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- todos: completed_at 자동 설정/초기화
DROP TRIGGER IF EXISTS set_todos_completed_at ON public.todos;
CREATE TRIGGER set_todos_completed_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_completed_at();

-- auth.users 신규 가입 시 public.users 자동 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- 6. Row Level Security (RLS) 활성화
-- 이미 활성화되어 있어도 에러 없음
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 7. RLS 정책 (Policies)
-- DROP IF EXISTS 후 CREATE → 중복 실행 안전
-- (정책은 OR REPLACE를 지원하지 않음)
-- ============================================

-- ----- users 테이블 정책 -----
DROP POLICY IF EXISTS "Users can view own profile"   ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 본인 프로필만 조회
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 회원가입 시 본인 프로필 생성
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 본인 프로필만 수정
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ----- todos 테이블 정책 -----
DROP POLICY IF EXISTS "Users can view own todos"   ON public.todos;
DROP POLICY IF EXISTS "Users can insert own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON public.todos;

-- 본인 Todo만 조회
CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 Todo만 생성
CREATE POLICY "Users can insert own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 Todo만 수정
CREATE POLICY "Users can update own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 본인 Todo만 삭제
CREATE POLICY "Users can delete own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- 8. 권한 설정
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.todos TO authenticated;


-- ============================================
-- 완료!
-- ============================================
-- 이 파일은 몇 번을 실행해도 에러 없이 동작합니다.
--
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor
-- 2. 이 파일 내용 전체 복사 & 붙여넣기
-- 3. Run 버튼 클릭
-- ============================================
