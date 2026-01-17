# w.2.5.0 前端 PRD - ChatGPT 风格布局重构

**版本号**: w.2.5.0  
**发布日期**: 2026-01-17  
**类型**: 重大 UI/UX 重构

---

## 一、背景与目标

### 问题
- 当前三栏常驻布局（左：LangGraph 路径 / 中：聊天 / 右：Context + Reasoning）信息密度过高，视觉纷杂
- 调试面板（Context Debug / Reasoning / Path）始终占据空间，但并非每轮对话都需要
- 缺少 Session 历史管理，用户无法快速回顾或切换对话

### 目标
- **简洁布局**：参考 ChatGPT/Gemini，左侧窄栏（Session 列表 + 快捷操作）+ 中间聊天主区 + 右侧智能滑出面板
- **智能交互**：仅在有 Reasoning 内容时，右侧调试面板自动展开；无 Reasoning 时保持隐藏
- **Session 管理**：支持多对话历史、快速切换、持久化（localStorage）
- **便捷上传**：拖拽文件到左侧栏直接上传知识文档

---

## 二、新布局结构

```
┌─────────────┬──────────────────────────────────┬─────────────────┐
│  Session    │        Chat Area                 │  Debug Drawer   │
│  Sidebar    │  ┌────────────────────────────┐  │  (智能滑出)     │
│  (260px)    │  │  Toolbar                   │  │  (420px)        │
│             │  │  - conversation_id         │  │  ┌───────────┐  │
│ ┌─────────┐ │  │  - 打开调试面板 按钮       │  │  │ Context   │  │
│ │新建对话 │ │  └────────────────────────────┘  │  │ Reasoning │  │
│ └─────────┘ │                                   │  │ Path      │  │
│             │  ┌────────────────────────────┐  │  └───────────┘  │
│ [当前会话]  │  │                            │  │                 │
│ Session 1   │  │  MessageList               │  │  [Tab Content]  │
│ Session 2   │  │                            │  │                 │
│ ...         │  │                            │  │  [关闭按钮 X]   │
│             │  └────────────────────────────┘  │                 │
│ ┌─────────┐ │  ┌────────────────────────────┐  │                 │
│ │上传文件 │ │  │  InputBar                  │  │                 │
│ │查看列表 │ │  └────────────────────────────┘  └─────────────────┘
│ └─────────┘ │
└─────────────┴──────────────────────────────────┘
```

### 左侧 SessionSidebar（260px 固定）
- 顶部："新建对话" 按钮
- 中间：Session 列表（可滚动）
  - 当前 Session 置顶并高亮
  - 其余按最后活动时间降序
  - 显示：Session 标题（首条用户消息前 40 字符）、时间戳
  - 操作：点击切换、悬停显示删除按钮（二次确认）
- 底部："上传文件" + "查看上传列表" 按钮
- **拖拽区域**：支持拖拽文件到整个 Sidebar 触发上传（视觉反馈：边框高亮）

### 中间 Chat Area（flex-1）
- 顶部工具栏：
  - conversation_id 显示
  - "打开调试面板" 按钮（仅在 Drawer 关闭时显示）
  - Reset 按钮
- 中间：MessageList（消息列表）
- 底部：InputBar（输入框）

### 右侧 DebugDrawer（420px，智能滑出）
- **触发逻辑**：
  - 有 Reasoning 内容时 → 自动滑出并展示 "Reasoning" Tab
  - 无 Reasoning 时 → 保持隐藏
  - 用户点击"打开调试面板"按钮 → 手动展开
- **Tab 切换**：Context Debug / Reasoning / LangGraph Path
- **关闭**：右上角 X 按钮
- **动画**：300ms `transition-transform` 滑入/滑出

---

##三、核心功能实现

### 3.1 Session 管理（localStorage 持久化）

#### Store 增强 (`store/chatStore.ts`)

**新增类型**：
```typescript
export type SessionMetadata = {
  id: string; // conversation_id
  title: string; // 首条用户消息前 40 字符
  lastActivity: number; // 时间戳
  messageCount: number;
  firstMessage?: string;
};
```

**新增状态与方法**：
```typescript
sessions: SessionMetadata[];
currentSessionId: string | null;
loadSessions: () => void;
createNewSession: (conversationId: string) => void;
switchSession: (sessionId: string) => void;
saveCurrentSession: () => void;
deleteSession: (sessionId: string) => void;
```

**存储键**：
- `medgo.sessions` - Session 元数据列表（JSON 数组）
- `medgo.session.{sessionId}` - 各 Session 的 ChatMessage[]

#### Session 生命周期
1. **初始化**：`ChatContainer` 挂载时调用 `loadSessions()`，若无 `currentSessionId` 则调用 `createNewSession(conversationId)`
2. **新建对话**：生成新 `conversationId`，调用 `createNewSession()`，清空 `messages`
3. **切换 Session**：
   - 调用 `saveCurrentSession()` 保存当前对话
   - 调用 `switchSession(targetId)` 加载目标对话的 messages
   - 更新 `identityStore.conversationId`
4. **自动保存**：`addMessage` 和 `updateLastAssistant` 后触发 `saveCurrentSession()`
5. **删除 Session**：显示二次确认弹窗，确认后调用 `deleteSession()`，清理 localStorage

### 3.2 智能 Reasoning 触发

#### 监听逻辑（`ChatContainer.tsx`）
- 在 `updateLastAssistant` 调用时，检查 `reasoning` 参数
- 若有内容且 `!isDebugDrawerOpen`，调用 `openDebugDrawer('reasoning')`
- 若 Reasoning 为空且之前是自动打开的，保持用户最后的选择（不自动关闭）

#### Store 方法（`store/chatStore.ts`）
```typescript
openDebugDrawer: (tab = 'reasoning') => void;
closeDebugDrawer: () => void;
setDebugDrawerTab: (tab: 'context' | 'reasoning' | 'path') => void;
isDebugDrawerOpen: boolean;
debugDrawerTab: 'context' | 'reasoning' | 'path';
```

### 3.3 拖拽上传（SessionSidebar）

#### 实现细节
```typescript
// SessionSidebar.tsx
const [isDragOver, setIsDragOver] = useState(false);

const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
  
  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  try {
    const resp = await uploadKnowledgeDocument({ file, user_id, conversation_id });
    // Toast 提示上传成功
  } catch (err) {
    // Toast 提示上传失败
  }
};
```

#### 视觉反馈
- 拖拽悬停时：`border-2 border-blue-500 bg-blue-50`
- 正常状态：`border border-gray-200`

---

## 四、组件拆分与复用

### 新建组件

#### 4.1 `SessionSidebar.tsx`
- Props: `onNewSession`, `onSelectSession`, `onDeleteSession`, `onUploadClick`, `onViewUploadsClick`
- 状态：`isDragOver`（拖拽悬停）
- 渲染：顶部按钮 + Session 列表 + 底部按钮
- 拖拽事件：`onDragOver`, `onDragLeave`, `onDrop`

#### 4.2 `DebugDrawer.tsx`
- Props: `isOpen`, `activeTab`, `onClose`, `onTabChange`, `currentMessage`
- 布局：固定右侧，`transform: translateX(${isOpen ? 0 : 420}px)`
- Tab 内容：
  - `Context`: 复用 `ContextDebugPanel`
  - `Reasoning`: 复用 `ReasoningPanel`（新建）
  - `Path`: 复用 `DecisionPathPanel`（新建）

#### 4.3 `ReasoningPanel.tsx`（从 `ReasoningSidebar` 提取）
- Props: `reasoning`, `turnId`
- 渲染：Reasoning 文本展示（pre 格式）

#### 4.4 `DecisionPathPanel.tsx`（从 `DecisionPathSidebar` 提取）
- Props: `langgraphPath`, `turnId`
- 渲染：Timeline + Tree View（复用现有逻辑）

#### 4.5 `KnowledgeUploadsModal.tsx`
- Props: `isOpen`, `onClose`
- 布局：全屏 Modal（`fixed inset-0 z-50`）
- 内容：复用 `KnowledgeUploadsListPanel` 逻辑

#### 4.6 `DeleteSessionConfirmModal.tsx`
- Props: `isOpen`, `sessionTitle`, `onConfirm`, `onCancel`
- 布局：居中 Modal（`fixed inset-0 z-50 flex items-center justify-center`）
- 按钮：取消（灰色）、删除（红色警告）

### 修改组件

#### 4.7 `ChatContainer.tsx`（重大重构）
- **移除**：三栏布局、拖拽分栏逻辑、`DecisionPathSidebar`、`ReasoningSidebar`
- **新增**：
  - `SessionSidebar`（左侧）
  - 中间聊天区（Toolbar + MessageList + InputBar）
  - `DebugDrawer`（右侧条件渲染）
  - `KnowledgeUploadsModal`（条件渲染）
  - `DeleteSessionConfirmModal`（条件渲染）
- **初始化逻辑**：
  ```typescript
  useEffect(() => {
    loadSessions();
    if (!currentSessionId) {
      createNewSession(conversationId);
    }
  }, []);
  ```
- **智能 Reasoning 触发**：
  ```typescript
  const handleSend = async (message: string) => {
    // ...existing logic...
    await streamChat(message, {
      onReasoning: (reasoning) => {
        updateLastAssistant('', reasoning);
        if (reasoning && !isDebugDrawerOpen) {
          openDebugDrawer('reasoning');
        }
      },
      // ...other handlers...
    });
  };
  ```

---

## 五、数据流与交互

### 5.1 新建对话
```
User 点击 "新建对话" 
  → 生成新 conversationId 
  → createNewSession(conversationId) 
  → setConversationId(conversationId) 
  → clearMessages() 
  → 保存 sessions 到 localStorage
```

### 5.2 切换 Session
```
User 点击 Session Item
  → saveCurrentSession() (保存当前对话)
  → switchSession(targetId)
  → 从 localStorage 加载 messages
  → setConversationId(targetId)
  → 更新 currentSessionId
```

### 5.3 删除 Session
```
User 点击删除按钮
  → 显示 DeleteSessionConfirmModal
  → User 确认
  → deleteSession(sessionId)
  → 从 localStorage 删除 session 数据
  → 从 sessions 列表移除
  → 若删除的是当前 Session，切换到最近的 Session
```

### 5.4 拖拽上传
```
User 拖拽文件到 SessionSidebar
  → onDragOver: setIsDragOver(true)
  → onDrop: 提取 files[0]
  → uploadKnowledgeDocument()
  → 成功: Toast 提示 + 更新上传列表
  → 失败: Toast 提示错误信息
```

### 5.5 智能 Reasoning 展开
```
Backend SSE 返回 reasoning 事件
  → onReasoning(reasoning)
  → updateLastAssistant('', reasoning)
  → 检测: reasoning.trim().length > 0 && !isDebugDrawerOpen
  → openDebugDrawer('reasoning')
  → DebugDrawer 滑入动画 (300ms)
```

---

## 六、技术细节

### 6.1 localStorage 结构

```typescript
// medgo.sessions
[
  {
    "id": "conv_123",
    "title": "如何治疗糖尿病？",
    "lastActivity": 1737158400000,
    "messageCount": 8,
    "firstMessage": "如何治疗糖尿病？"
  },
  // ...more sessions
]

// medgo.session.conv_123
[
  {
    "role": "user",
    "content": "如何治疗糖尿病？",
    "conversation_id": "conv_123",
    // ...other fields
  },
  {
    "role": "assistant",
    "content": "糖尿病的治疗...",
    "reasoning": "首先需要明确类型...",
    "turn_id": "turn_456",
    // ...other fields
  },
  // ...more messages
]
```

### 6.2 Drawer 动画实现

```tsx
// DebugDrawer.tsx
<div
  className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl 
              transition-transform duration-300 ease-in-out z-40
              ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
>
  {/* Drawer content */}
</div>
```

### 6.3 Session 排序逻辑

```typescript
const sortedSessions = useMemo(() => {
  const current = sessions.find(s => s.id === currentSessionId);
  const others = sessions
    .filter(s => s.id !== currentSessionId)
    .sort((a, b) => b.lastActivity - a.lastActivity);
  
  return current ? [current, ...others] : others;
}, [sessions, currentSessionId]);
```

---

## 七、验收标准（DoD）

### 功能
- [ ] 左侧 SessionSidebar 显示历史对话列表，当前 Session 置顶高亮
- [ ] 点击 Session 可切换，消息内容正确加载
- [ ] 新建对话按钮生成新 Session，清空聊天区
- [ ] 删除 Session 需要二次确认，确认后从列表和 localStorage 移除
- [ ] 拖拽文件到 SessionSidebar 触发上传，显示成功/失败提示
- [ ] 有 Reasoning 内容时，右侧 DebugDrawer 自动滑出
- [ ] DebugDrawer 三个 Tab（Context/Reasoning/Path）切换正常
- [ ] 点击 Drawer 关闭按钮，面板滑出隐藏
- [ ] 刷新页面后 Session 列表和当前对话内容不丢失
- [ ] 空 Session 列表显示"暂无历史对话"占位文本

### 工程
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 警告
- [ ] Drawer 动画流畅（300ms）
- [ ] 拖拽上传时视觉反馈明显（边框/背景变色）
- [ ] Session 切换无闪烁或卡顿
- [ ] localStorage 操作包裹 try-catch，避免存储异常崩溃

### UI/UX
- [ ] 左侧栏固定 260px，不可拖拽（简化交互）
- [ ] Session 列表项悬停高亮，点击无延迟
- [ ] Drawer 滑出时不遮挡聊天区内容（布局正确）
- [ ] 删除确认弹窗居中显示，红色警告按钮醒目
- [ ] 拖拽文件时整个 Sidebar 高亮（不仅是按钮区域）

---

## 八、明确不做（防止 scope 膨胀）

❌ Session 标题手动编辑（v2.6.0 考虑）  
❌ Session 搜索/筛选功能  
❌ 批量拖拽上传（当前仅支持单文件）  
❌ Drawer Tab 懒加载优化（先实现功能，性能优化后续迭代）  
❌ Session 云端同步（当前仅 localStorage）  
❌ 拖拽上传进度条（上传是瞬时的，暂不需要）

---

## 九、版本总结

> **w.2.5.0 = ChatGPT 风格简洁布局 + Session 历史管理 + 智能 Reasoning 展开 + 拖拽上传**

核心价值：
- **信息密度降低 60%**（常驻面板改为按需滑出）
- **交互路径缩短**（Session 快速切换、拖拽上传）
- **智能化提升**（自动检测 Reasoning 并展开面板）

下一步（w.2.6.0 规划）：
- Session 标题手动编辑
- Session 分组/标签
- Session 搜索
- 批量上传优化
