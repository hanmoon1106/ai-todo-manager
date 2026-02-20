# Todo 컴포넌트

PRD 기반으로 작성된 Todo 관리 컴포넌트 모음입니다.

## 컴포넌트 구성

### 1. TodoCard
개별 할 일을 카드 형태로 표시하는 컴포넌트입니다.

**주요 기능:**
- 완료 상태 체크박스
- 우선순위/카테고리/상태 배지 표시
- 마감일 및 상대 시간 표시
- 편집/삭제 액션 버튼
- 완료된 항목은 줄긋기 및 투명도 처리

**Props:**
```typescript
interface TodoCardProps {
  todo: Todo;                                          // Todo 데이터
  onToggleComplete?: (id: string, completed: boolean) => void;  // 완료 토글 핸들러
  onEdit?: (todo: Todo) => void;                      // 편집 핸들러
  onDelete?: (id: string) => void;                    // 삭제 핸들러
}
```

**사용 예시:**
```tsx
<TodoCard
  todo={todo}
  onToggleComplete={(id, completed) => console.log('Toggle', id, completed)}
  onEdit={(todo) => console.log('Edit', todo)}
  onDelete={(id) => console.log('Delete', id)}
/>
```

---

### 2. TodoList
할 일 목록을 렌더링하는 컴포넌트입니다.

**주요 기능:**
- Todo 배열을 받아 TodoCard 목록으로 렌더링
- 로딩 상태 처리 (스피너 표시)
- 빈 상태 처리 (Empty 컴포넌트)
- 각 TodoCard에 이벤트 핸들러 전달

**Props:**
```typescript
interface TodoListProps {
  todos: Todo[];                                       // Todo 배열
  isLoading?: boolean;                                 // 로딩 상태
  emptyMessage?: string;                               // 빈 상태 메시지
  onToggleComplete?: (id: string, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (id: string) => void;
}
```

**사용 예시:**
```tsx
<TodoList
  todos={todos}
  isLoading={isLoading}
  emptyMessage="할 일이 없습니다."
  onToggleComplete={handleToggle}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

### 3. TodoForm
할 일 추가 또는 편집을 위한 폼 컴포넌트입니다.

**주요 기능:**
- React Hook Form + Zod 유효성 검사
- 제목 (필수, 1~100자)
- 설명 (선택, 최대 2000자)
- 마감일/시간 (datetime-local)
- 우선순위 (high/medium/low)
- 카테고리 (자유 입력)
- 추가/수정 모드 자동 구분

**Props:**
```typescript
interface TodoFormProps {
  todo?: Todo | null;                                  // 편집 모드용 Todo (없으면 추가 모드)
  isSubmitting?: boolean;                              // 제출 중 상태
  onSubmit: (data: CreateTodoInput) => void | Promise<void>;  // 제출 핸들러
  onCancel?: () => void;                               // 취소 핸들러
}
```

**사용 예시 (추가 모드):**
```tsx
<TodoForm
  onSubmit={async (data) => {
    await createTodo(data);
  }}
  onCancel={() => setIsOpen(false)}
/>
```

**사용 예시 (편집 모드):**
```tsx
<TodoForm
  todo={selectedTodo}
  onSubmit={async (data) => {
    await updateTodo(selectedTodo.id, data);
  }}
  onCancel={() => setIsOpen(false)}
/>
```

---

## 타입 정의

### Todo
```typescript
interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  due_at?: string | null;
  priority: 'high' | 'medium' | 'low';
  category?: string | null;
  completed: boolean;
  completed_at?: string | null;
  updated_at: string;
}
```

### CreateTodoInput
```typescript
interface CreateTodoInput {
  title: string;
  description?: string;
  due_at?: string;
  priority?: Priority;
  category?: string;
}
```

---

## 유틸리티 함수

`lib/utils/todo.ts`에 다음 함수들이 정의되어 있습니다:

- `getTodoStatus(todo)` - Todo의 현재 상태 계산 (progress/completed/delayed)
- `formatDate(dateString)` - 날짜를 한글 형식으로 포맷
- `formatDateOnly(dateString)` - 날짜만 포맷 (시간 제외)
- `formatRelativeTime(dateString)` - 상대 시간 포맷 ("3일 전", "2시간 후")
- `getPriorityLabel(priority)` - 우선순위를 한글로 변환
- `getPrioritySortOrder(priority)` - 우선순위 정렬 순서 반환

---

## 스타일링

### 커스텀 CSS 클래스
`app/globals.css`에 정의된 Todo 전용 클래스들:

- `.badge-priority-high` - 높음 배지
- `.badge-priority-medium` - 보통 배지
- `.badge-priority-low` - 낮음 배지
- `.status-progress` - 진행 중 텍스트
- `.status-completed` - 완료 텍스트
- `.status-delayed` - 지연 텍스트

---

## 의존성

필요한 Shadcn/ui 컴포넌트:
- Checkbox
- Badge
- Button
- Card (CardContent, CardDescription, CardHeader, CardTitle)
- Form (FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage)
- Input
- Textarea
- Select (SelectContent, SelectItem, SelectTrigger, SelectValue)
- Empty

외부 라이브러리:
- `lucide-react` - 아이콘
- `date-fns` - 날짜 포맷팅
- `react-hook-form` - 폼 관리
- `zod` - 스키마 유효성 검사
- `@hookform/resolvers` - React Hook Form + Zod 통합

---

## 사용 예시 (통합)

```tsx
'use client';

import { useState } from 'react';
import { TodoList, TodoForm } from '@/components/todo';
import { Todo, CreateTodoInput } from '@/lib/types/todo';

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  const handleToggleComplete = async (id: string, completed: boolean) => {
    // Optimistic update
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, completed } : todo
      )
    );
    
    // API 호출
    // await updateTodoCompleted(id, completed);
  };

  const handleEdit = (todo: Todo) => {
    setSelectedTodo(todo);
  };

  const handleDelete = async (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
    // await deleteTodo(id);
  };

  const handleSubmit = async (data: CreateTodoInput) => {
    // await createTodo(data);
    // 목록 새로고침
  };

  return (
    <div className="container mx-auto py-8">
      <TodoForm onSubmit={handleSubmit} />
      <TodoList
        todos={todos}
        isLoading={isLoading}
        onToggleComplete={handleToggleComplete}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```
