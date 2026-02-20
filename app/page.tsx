'use client';

/**
 * 메인 Todo 관리 페이지
 * Supabase 기반 할 일 목록 조회, 추가, 수정, 삭제 기능 제공
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';
import { Toolbar } from '@/components/layout/Toolbar';
import { TodoList, TodoForm } from '@/components/todo';
import { AiTodoDialog } from '@/components/ai/AiTodoDialog';
import { AiSummarySection } from '@/components/ai/AiSummarySection';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Sparkles } from 'lucide-react';
import { Todo, CreateTodoInput } from '@/lib/types/todo';
import { getTodoStatus } from '@/lib/utils/todo';

/**
 * 메인 페이지 컴포넌트
 */
export default function HomePage() {
  const router = useRouter();

  // 인증 사용자 상태
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  // Todo 목록 상태
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 검색/필터/정렬 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [filters, setFilters] = useState({
    priority: [] as string[],
    status: [] as string[],
    category: '',
  });

  // 폼/다이얼로그 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  // ─────────────────────────────────────────
  // 인증 상태 초기화
  // ─────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? '');
        setUserId(data.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? '');
      setUserId(session?.user?.id ?? '');
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─────────────────────────────────────────
  // Read: Supabase에서 할 일 목록 조회
  // ─────────────────────────────────────────

  const fetchTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // 인증 만료 시 로그인 페이지로 이동
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
          router.push('/login');
          return;
        }
        throw error;
      }

      setTodos((data as Todo[]) ?? []);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[fetchTodos]', err);
      }
      toast.error('할 일 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // userId가 확정된 시점에 목록 최초 로드
  useEffect(() => {
    if (userId) {
      fetchTodos();
    }
  }, [userId, fetchTodos]);

  // ─────────────────────────────────────────
  // Create: 새 할 일 생성
  // ─────────────────────────────────────────

  const handleAddTodo = async (data: CreateTodoInput) => {
    try {
      setIsSubmitting(true);
      const supabase = createClient();

      const { error } = await supabase.from('todos').insert({
        user_id: userId,
        title: data.title,
        description: data.description ?? null,
        // datetime-local 값은 로컬 시간 → new Date()로 UTC 변환 후 저장
        due_at: data.due_at ? new Date(data.due_at).toISOString() : null,
        priority: data.priority ?? 'medium',
        category: data.category ?? null,
        completed: false,
      });

      if (error) throw error;

      toast.success('할 일이 추가되었습니다.');
      setIsFormOpen(false);
      await fetchTodos();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[handleAddTodo]', err);
      }
      toast.error('할 일 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────
  // Update: 할 일 수정
  // ─────────────────────────────────────────

  const handleUpdateTodo = async (data: CreateTodoInput) => {
    if (!editingTodo) return;

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('todos')
        .update({
          title: data.title,
          description: data.description ?? null,
          // datetime-local 값은 로컬 시간 → new Date()로 UTC 변환 후 저장
          due_at: data.due_at ? new Date(data.due_at).toISOString() : null,
          priority: data.priority ?? 'medium',
          category: data.category ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTodo.id)
        .eq('user_id', userId); // 본인 소유 확인

      if (error) throw error;

      toast.success('할 일이 수정되었습니다.');
      setEditingTodo(null);
      setIsFormOpen(false);
      await fetchTodos();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[handleUpdateTodo]', err);
      }
      toast.error('할 일 수정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────
  // Toggle: 완료/미완료 상태 전환
  // ─────────────────────────────────────────

  const handleToggleComplete = async (id: string, completed: boolean) => {
    // 낙관적 업데이트: UI를 즉시 반영
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            }
          : todo
      )
    );

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('todos')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId); // 본인 소유 확인

      if (error) throw error;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[handleToggleComplete]', err);
      }
      // 실패 시 낙관적 업데이트 롤백
      toast.error('상태 변경 중 오류가 발생했습니다.');
      await fetchTodos();
    }
  };

  // ─────────────────────────────────────────
  // Delete: 할 일 삭제
  // ─────────────────────────────────────────

  const handleDeleteTodo = async (id: string) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // 본인 소유 확인

      if (error) throw error;

      toast.success('할 일이 삭제되었습니다.');
      // 낙관적으로 목록에서 즉시 제거
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[handleDeleteTodo]', err);
      }
      toast.error('할 일 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
      await fetchTodos();
    }
  };

  // ─────────────────────────────────────────
  // 편집 시작 / 폼 닫기
  // ─────────────────────────────────────────

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTodo(null);
  };

  // ─────────────────────────────────────────
  // 클라이언트 사이드 검색/필터/정렬
  // ─────────────────────────────────────────

  const getFilteredTodos = () => {
    let filtered = [...todos];

    // 제목 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((todo) =>
        todo.title.toLowerCase().includes(query)
      );
    }

    // 우선순위 필터
    if (filters.priority.length > 0) {
      filtered = filtered.filter((todo) =>
        filters.priority.includes(todo.priority)
      );
    }

    // 상태 필터
    if (filters.status.length > 0) {
      filtered = filtered.filter((todo) => {
        const status = getTodoStatus(todo);
        return filters.status.includes(status);
      });
    }

    // 카테고리 필터
    if (filters.category) {
      filtered = filtered.filter((todo) => todo.category === filters.category);
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title_asc':
          return a.title.localeCompare(b.title, 'ko');
        case 'title_desc':
          return b.title.localeCompare(a.title, 'ko');
        case 'priority_asc': {
          const order = { high: 0, medium: 1, low: 2 };
          return order[a.priority] - order[b.priority];
        }
        case 'priority_desc': {
          const order = { high: 0, medium: 1, low: 2 };
          return order[b.priority] - order[a.priority];
        }
        case 'due_asc':
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
        case 'due_desc':
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  };

  const filteredTodos = getFilteredTodos();

  // ─────────────────────────────────────────
  // 통계 계산
  // ─────────────────────────────────────────

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const inProgressCount = totalCount - completedCount;
  const completionRate = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  // ─────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <Header userEmail={userEmail} />

      {/* 툴바 */}
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* 메인 컨텐츠 */}
      <main className="container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 좌측: 액션 버튼 및 통계 */}
          <aside className="lg:w-80 space-y-4">
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="mr-2 h-5 w-5" />
                새 할 일 추가
              </Button>
              <Button
                variant="outline"
                className="w-full btn-ai"
                size="lg"
                onClick={() => setIsAiDialogOpen(true)}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                AI로 만들기
              </Button>
            </div>

            {/* 통계 카드 */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                할 일 통계
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">전체</span>
                  <span className="font-semibold">{totalCount}개</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">진행 중</span>
                  <span className="font-semibold text-primary">
                    {inProgressCount}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">완료</span>
                  <span className="font-semibold text-success">
                    {completedCount}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">완료율</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
              </div>
            </div>

            {/* AI 요약 및 분석 */}
            <AiSummarySection todos={todos} />
          </aside>

          {/* 우측: Todo 리스트 */}
          <div className="flex-1 min-w-0 max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">할 일 목록</h2>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? '불러오는 중...' : `${filteredTodos.length}개의 할 일`}
                </p>
              </div>
            </div>

            <TodoList
              todos={filteredTodos}
              isLoading={isLoading}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTodo}
              onDelete={handleDeleteTodo}
              emptyMessage={
                searchQuery || filters.priority.length > 0 || filters.status.length > 0
                  ? '검색 결과가 없습니다.'
                  : '할 일이 없습니다. 새로운 할 일을 추가해보세요!'
              }
            />
          </div>
        </div>
      </main>

      {/* AI 할 일 생성 다이얼로그 */}
      <AiTodoDialog
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        onAddTodo={handleAddTodo}
        isSubmitting={isSubmitting}
      />

      {/* 할 일 추가/수정 다이얼로그 */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTodo ? '할 일 수정' : '새 할 일 추가'}
            </DialogTitle>
          </DialogHeader>
          <TodoForm
            todo={editingTodo}
            isSubmitting={isSubmitting}
            onSubmit={editingTodo ? handleUpdateTodo : handleAddTodo}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
