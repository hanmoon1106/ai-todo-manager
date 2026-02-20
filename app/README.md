# 메인 Todo 관리 페이지

PRD 기반으로 작성된 메인 Todo 관리 화면입니다.

## 페이지 구조

```
┌─────────────────────────────────────────────────────────┐
│  Header (헤더)                                           │
│  - 로고, 서비스명, 사용자 메뉴                            │
├─────────────────────────────────────────────────────────┤
│  Toolbar (툴바)                                          │
│  - 검색, 정렬, 필터                                      │
├──────────────┬──────────────────────────────────────────┤
│  Sidebar     │  Main Content                            │
│  (좌측)      │  (우측)                                   │
│              │                                          │
│  - 추가 버튼  │  - Todo 목록                             │
│  - AI 버튼   │  - TodoCard 컴포넌트들                    │
│  - 통계      │                                          │
│  - AI 요약   │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## 📁 파일 구조

```
app/
├── page.tsx                      # 메인 페이지 ⭐
components/
├── layout/
│   ├── Header.tsx               # 헤더 컴포넌트
│   ├── Toolbar.tsx              # 툴바 컴포넌트
│   └── index.ts                 # export
└── todo/
    ├── TodoCard.tsx             # 할 일 카드
    ├── TodoList.tsx             # 할 일 목록
    ├── TodoForm.tsx             # 할 일 폼
    └── index.ts
lib/
└── data/
    └── mockTodos.ts             # Mock 데이터
```

---

## 🎯 주요 기능

### 1. Header (헤더)
**파일:** `components/layout/Header.tsx`

**기능:**
- ✅ 서비스 로고 (Sparkles 아이콘 + 그라데이션)
- ✅ 서비스명 표시
- ✅ 사용자 정보 표시 (Avatar)
- ✅ 드롭다운 메뉴
  - 사용자 이메일 표시
  - 프로필 설정 (비활성화)
  - 로그아웃 버튼

**사용 예시:**
```tsx
<Header 
  userEmail="user@example.com" 
  onLogout={() => console.log('로그아웃')} 
/>
```

---

### 2. Toolbar (툴바)
**파일:** `components/layout/Toolbar.tsx`

**기능:**
- 🔍 **검색**: 제목/설명에서 검색 (실시간 필터링)
- 📊 **정렬**: 6가지 정렬 옵션
  - 우선순위 높은순/낮은순
  - 마감일 빠른순/느린순
  - 최신순/오래된순
- 🎯 **필터**: Popover로 제공
  - 우선순위 (높음/보통/낮음)
  - 상태 (진행 중/완료/지연)
  - 카테고리 (업무/개인/학습)
- 🏷️ **활성 필터 표시**: 현재 적용된 필터를 Badge로 표시
- 🔄 **초기화**: 전체 필터 초기화

**사용 예시:**
```tsx
<Toolbar
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  sortBy={sortBy}
  onSortChange={setSortBy}
  filters={filters}
  onFiltersChange={setFilters}
/>
```

---

### 3. Main Content (메인 영역)
**파일:** `app/page.tsx`

#### 좌측 Sidebar
- **새 할 일 추가 버튼**: 다이얼로그 열기
- **AI로 만들기 버튼**: AI 자연어 입력 (비활성화 - 추후 구현)
- **통계 카드**: 전체/진행 중/완료/완료율 표시
- **AI 요약 버튼**: AI 일일/주간 요약 (비활성화 - 추후 구현)

#### 우측 Todo List
- **TodoList 컴포넌트**: 필터링된 할 일 목록
- **TodoCard 컴포넌트**: 개별 할 일 카드
  - 완료 체크박스
  - 우선순위/카테고리/상태 배지
  - 편집/삭제 버튼
  - 마감일 표시

---

## 🔧 상태 관리

### 주요 상태
```typescript
const [todos, setTodos] = useState<Todo[]>(mockTodos);
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState('created_desc');
const [filters, setFilters] = useState({
  priority: [] as string[],
  status: [] as string[],
  category: '',
});
const [isFormOpen, setIsFormOpen] = useState(false);
const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
```

### 필터링 로직
```typescript
const getFilteredTodos = () => {
  let filtered = [...todos];
  
  // 1. 검색어 필터
  // 2. 우선순위 필터
  // 3. 상태 필터
  // 4. 카테고리 필터
  // 5. 정렬
  
  return filtered;
};
```

---

## 🎨 레이아웃

### 반응형 디자인
```tsx
// 모바일: 세로 스택
// 데스크톱: 좌우 분할
<div className="flex flex-col lg:flex-row gap-6">
  <aside className="lg:w-80">...</aside>
  <div className="flex-1">...</div>
</div>
```

### Sidebar 너비
- 모바일: 전체 너비
- 데스크톱: 320px 고정

---

## 📝 CRUD 기능

### Create (추가)
```typescript
const handleAddTodo = async (data: CreateTodoInput) => {
  const newTodo: Todo = {
    id: Date.now().toString(),
    user_id: 'user-1',
    title: data.title,
    // ... 나머지 필드
  };
  setTodos([newTodo, ...todos]);
};
```

### Read (조회)
- Mock 데이터로 초기화
- 검색/필터/정렬 적용
- `getFilteredTodos()` 함수로 처리

### Update (수정)
```typescript
const handleUpdateTodo = async (data: CreateTodoInput) => {
  setTodos(
    todos.map((todo) =>
      todo.id === editingTodo.id
        ? { ...todo, ...data, updated_at: new Date().toISOString() }
        : todo
    )
  );
};
```

### Delete (삭제)
```typescript
const handleDeleteTodo = (id: string) => {
  setTodos(todos.filter((todo) => todo.id !== id));
};
```

### Complete Toggle (완료 토글)
```typescript
const handleToggleComplete = (id: string, completed: boolean) => {
  setTodos(
    todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          }
        : todo
    )
  );
};
```

---

## 📊 Mock 데이터

**파일:** `lib/data/mockTodos.ts`

7개의 샘플 Todo 데이터:
- 다양한 우선순위 (high/medium/low)
- 다양한 카테고리 (업무/개인/학습)
- 완료/미완료 상태
- 마감일 있음/없음
- 지연된 항목 포함

```typescript
export const mockTodos: Todo[] = [
  {
    id: '1',
    title: '프로젝트 기획서 작성',
    priority: 'high',
    category: '업무',
    completed: false,
    // ...
  },
  // ... 6개 더
];
```

---

## 🎨 디자인 시스템

### 컬러
- **Primary**: 프로덕티브 블루 (#3B82F6)
- **Secondary**: AI 바이올렛 (#8B5CF6)
- **Success**: 완료 그린 (#10B981)
- **Destructive**: 지연/삭제 레드 (#EF4444)

### 통계 카드
```tsx
<div className="rounded-lg border bg-card p-4">
  <h3>할 일 통계</h3>
  <div>전체: {todos.length}개</div>
  <div>진행 중: {inProgress}개</div>
  <div>완료: {completed}개</div>
  <div>완료율: {completionRate}%</div>
</div>
```

---

## 🔄 다이얼로그

### TodoForm 다이얼로그
```tsx
<Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {editingTodo ? '할 일 수정' : '새 할 일 추가'}
      </DialogTitle>
    </DialogHeader>
    <TodoForm
      todo={editingTodo}
      onSubmit={editingTodo ? handleUpdateTodo : handleAddTodo}
      onCancel={handleCloseForm}
    />
  </DialogContent>
</Dialog>
```

- **추가 모드**: `editingTodo`가 null
- **수정 모드**: `editingTodo`에 Todo 객체 전달

---

## ✅ PRD 준수 사항

### 8.2 메인 Todo 화면 요구사항
- ✅ 상단 바: 앱명, 사용자 메뉴(로그아웃)
- ✅ 필터 패널: 검색창, 필터(우선순위/카테고리/상태), 정렬, 초기화
- ✅ 메인 영역: Todo 추가 버튼, Todo 리스트, AI 요약 버튼
- ✅ Todo 항목 UI: 체크박스, 제목, 보조 정보, 액션 버튼

### Todo 리스트 항목 UI
- ✅ 체크박스(완료)
- ✅ 제목(굵게)
- ✅ 보조 정보: due_date, priority 배지, category 배지
- ✅ 액션: 편집, 삭제

### 인터랙션
- ✅ "+" 클릭 → 생성 다이얼로그
- 🔄 "AI로 만들기" → 자연어 입력 (추후 구현)
- 🔄 "AI 요약" → 결과 카드 표시 (추후 구현)

### 코딩 스타일
- ✅ 화살표 함수 사용
- ✅ 한글 주석 필수
- ✅ TypeScript strict mode
- ✅ ESLint 규칙 준수
- ✅ 반응형 레이아웃 (flex/grid)

---

## 🔄 TODO: 다음 단계

### 1. Supabase 연동
```typescript
// lib/api/todos.ts
export const fetchTodos = async () => {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};
```

### 2. AI 기능 구현
- AI Todo 생성 (자연어 → 구조화)
- AI 요약 및 분석

### 3. 실시간 업데이트
- Supabase Realtime으로 실시간 동기화

### 4. 최적화
- React Query로 캐싱 및 상태 관리
- Optimistic UI 업데이트

---

## 📸 화면 구성

### 헤더
```
┌─────────────────────────────────────────┐
│ [✨] AI Todo Manager      [사용자 아바타]│
│     AI가 도와주는...                     │
└─────────────────────────────────────────┘
```

### 툴바
```
┌─────────────────────────────────────────┐
│ 🔍 [검색창___________] [정렬▼] [필터⚙️] │
│ 활성 필터: [검색: xxx ×] [우선순위: 높음 ×]│
└─────────────────────────────────────────┘
```

### 메인 컨텐츠
```
┌────────────┬──────────────────────────┐
│ [새 할 일]  │ 할 일 목록 (7개)          │
│ [AI로]     │ ┌─────────────────────┐  │
│            │ │ □ 프로젝트 기획서... │  │
│ 통계       │ │   높음 | 업무         │  │
│ 전체: 7개  │ └─────────────────────┘  │
│ 진행: 5개  │ ┌─────────────────────┐  │
│ 완료: 2개  │ │ □ Next.js 문서...   │  │
│            │ └─────────────────────┘  │
│ [AI 요약]  │                          │
└────────────┴──────────────────────────┘
```

---

메인 페이지가 완벽하게 구성되었습니다! Mock 데이터로 화면 구조를 먼저 확인하고, 이후 Supabase 연동으로 실제 데이터 처리를 구현할 수 있습니다. 🎉
