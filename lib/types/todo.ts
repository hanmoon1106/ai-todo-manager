/**
 * Todo 관련 타입 정의
 */

/**
 * 우선순위 타입
 */
export type Priority = 'high' | 'medium' | 'low';

/**
 * Todo 상태 타입
 */
export type TodoStatus = 'progress' | 'completed' | 'delayed';

/**
 * Todo 데이터 타입
 */
export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  due_at?: string | null;
  priority: Priority;
  category?: string | null;
  completed: boolean;
  completed_at?: string | null;
  updated_at: string;
}

/**
 * Todo 생성 데이터 타입 (DB 삽입용)
 */
export interface CreateTodoInput {
  title: string;
  description?: string;
  due_at?: string;
  priority?: Priority;
  category?: string;
}

/**
 * Todo 수정 데이터 타입
 */
export interface UpdateTodoInput {
  title?: string;
  description?: string;
  due_at?: string;
  priority?: Priority;
  category?: string;
  completed?: boolean;
}
