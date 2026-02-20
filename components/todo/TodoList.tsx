'use client';

/**
 * 할 일 목록을 표시하는 컴포넌트
 */

import { Todo } from '@/lib/types/todo';
import { TodoCard } from './TodoCard';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Loader2 } from 'lucide-react';

interface TodoListProps {
  todos: Todo[];
  isLoading?: boolean;
  emptyMessage?: string;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (id: string) => void;
}

/**
 * Todo 목록을 렌더링합니다
 * 로딩 상태, 빈 상태를 모두 처리합니다
 */
export const TodoList = ({
  todos,
  isLoading = false,
  emptyMessage = '할 일이 없습니다. 새로운 할 일을 추가해보세요!',
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoListProps) => {
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">할 일 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (todos.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyTitle>할 일이 없습니다</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Todo 목록 렌더링
  return (
    <div className="space-y-3">
      {todos.map((todo) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
