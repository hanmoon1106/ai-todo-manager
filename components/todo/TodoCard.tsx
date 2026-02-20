'use client';

/**
 * 개별 할 일을 표시하는 카드 컴포넌트
 */

import { Todo } from '@/lib/types/todo';
import {
  formatDate,
  formatRelativeTime,
  getPriorityLabel,
  getTodoStatus,
} from '@/lib/utils/todo';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface TodoCardProps {
  todo: Todo;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (id: string) => void;
}

/**
 * 개별 Todo 항목을 카드 형태로 표시합니다
 */
export const TodoCard = ({
  todo,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoCardProps) => {
  const status = getTodoStatus(todo);

  // 완료 체크박스 토글 핸들러
  const handleToggleComplete = () => {
    onToggleComplete?.(todo.id, !todo.completed);
  };

  // 편집 버튼 클릭 핸들러
  const handleEdit = () => {
    onEdit?.(todo);
  };

  // 삭제 버튼 클릭 핸들러
  const handleDelete = () => {
    if (confirm('이 할 일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      onDelete?.(todo.id);
    }
  };

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        todo.completed && 'opacity-60'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* 완료 체크박스 */}
          <Checkbox
            checked={todo.completed}
            onCheckedChange={handleToggleComplete}
            className="mt-1"
            aria-label={`${todo.title} 완료 토글`}
          />

          <div className="flex-1 space-y-2">
            {/* 제목 */}
            <CardTitle
              className={cn(
                'text-lg leading-tight',
                todo.completed && 'line-through text-muted-foreground'
              )}
            >
              {todo.title}
            </CardTitle>

            {/* 배지들 (우선순위, 카테고리, 상태) */}
            <div className="flex flex-wrap gap-2">
              {/* 우선순위 배지 */}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  todo.priority === 'high' && 'badge-priority-high',
                  todo.priority === 'medium' && 'badge-priority-medium',
                  todo.priority === 'low' && 'badge-priority-low'
                )}
              >
                {getPriorityLabel(todo.priority)}
              </Badge>

              {/* 카테고리 배지 */}
              {todo.category && (
                <Badge variant="secondary" className="text-xs">
                  {todo.category}
                </Badge>
              )}

              {/* 상태 배지 */}
              {status === 'delayed' && !todo.completed && (
                <Badge variant="destructive" className="text-xs">
                  지연
                </Badge>
              )}
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              className="h-8 w-8"
              aria-label="수정"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label="삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* 설명 또는 마감일이 있는 경우 CardContent 표시 */}
      {(todo.description || todo.due_at) && (
        <CardContent className="pt-0">
          {/* 설명 */}
          {todo.description && (
            <CardDescription className="mb-3 whitespace-pre-wrap">
              {todo.description}
            </CardDescription>
          )}

          {/* 마감일 정보 */}
          {todo.due_at && (
            <div
              className={cn(
                'flex items-center gap-4 text-sm',
                status === 'delayed' && !todo.completed
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(todo.due_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(todo.due_at)}</span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
