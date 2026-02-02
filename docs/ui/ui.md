# reasoning_engine_web 页面布局重构设计方案

## 项目概述

本设计方案旨在为 **reasoning_engine_web** 项目提供一个全新的页面布局架构，参考现代化 AI 应用的最佳实践（如您提供的 Teamo 截图），实现一个清晰、模块化、易于扩展的前端界面。新布局将采用三栏式结构，左侧为用户个人功能区，中央为主交互区，右侧为 Agent 选择区，从而提升用户体验和功能可发现性。

---

## 一、设计目标

通过分析您提供的参考截图和现有项目结构，本方案的核心目标包括：

**功能分区清晰化**：将用户个人相关功能（历史任务、知识库、设置）与 Agent 选择功能明确分离，避免混淆。

**提升交互效率**：用户可以快速在不同 Agent 模式之间切换，同时保持对历史会话和知识库的便捷访问。

**模块化组件设计**：采用高内聚、低耦合的组件架构，便于后续功能扩展和维护。

**现代化视觉风格**：参考截图中的卡片式布局、图标导航和配色方案，打造简洁、专业的界面。

---

## 二、整体布局架构

新布局采用**三栏式结构**，具体如下：

```
┌──────────────┬────────────────────────────────────────┬──────────────────┐
│              │                                        │                  │
│  左侧导航栏  │           中央主内容区                     │  右侧 Agent 面板 │
│  (Primary    │           (Main Content)               │  (Agent Panel)   │
│   Sidebar)   │                                        │                  │
│              │  ┌──────────────────────────────────┐  │                  │
│  ┌────────┐  │  │                                  │  │  ┌────────────┐  │
│  │ 历史   │  │  │    对话消息列表                     │  │  │ 快速       │  │
│  │ 任务   │  │  │    (MessageList)                 │  │  └────────────┘  │
│  └────────┘  │  │                                  │  │                  │
│              │  └──────────────────────────────────┘  │  ┌────────────┐  │
│  ┌────────┐  │                                        │  │ 思考       │  │
│  │ 知识库 │  │  ┌──────────────────────────────────┐  │  └────────────┘  │
│  └────────┘  │  │    用户输入框 (InputBar)          │  │                  │
│              │  └──────────────────────────────────┘  │  ┌────────────┐  │
│  ┌────────┐  │                                        │  │ 医学        │  │
│  │ 设置   │  │                                        │  └────────────┘  │
│  └────────┘  │                                        │                  │
│              │                                        │      ...         │
└──────────────┴────────────────────────────────────────┴──────────────────┘
```

### 各区域功能说明

| 区域名称 | 宽度建议 | 核心功能 | 交互特点 |
|:--------|:--------|:--------|:--------|
| **左侧导航栏** | 64px - 80px（固定） | 提供全局功能入口：历史任务、知识库、账号设置等 | 图标式导航，点击后可展开二级侧边栏（如 SessionSidebar） |
| **中央主内容区** | 自适应（flex-1） | 核心对话交互区域，包含消息列表和输入框 | 占据最大空间，用户主要工作区 |
| **右侧 Agent 面板** | 280px - 320px（固定或可折叠） | 展示和切换不同类型的 Agent（快速、思考、医学等） | 卡片式列表，点击切换当前 Agent 模式 |

---

## 三、组件架构设计

为了实现上述布局，我们需要对现有组件进行重构，并新增若干关键组件。以下是详细的组件架构和实现建议。

### 3.1 新增组件

#### 3.1.1 `AppLayout.tsx` - 顶层布局容器

这是整个应用的根布局组件，负责组织三个主要区域的渲染。

**文件路径**：`components/AppLayout.tsx`

**核心职责**：
- 渲染左侧导航栏、中央主内容区和右侧 Agent 面板
- 管理全局布局状态（如侧边栏的展开/收起）
- 提供统一的顶部标题栏（可选）

**代码示例**：

```tsx
'use client';

import React from 'react';
import { PrimarySidebar } from './PrimarySidebar';
import { MainChatPanel } from './MainChatPanel';
import { AgentSelectionPanel } from './AgentSelectionPanel';
import { SessionSidebar } from './SessionSidebar';
import { useLayoutStore } from '@/store/layoutStore';

export const AppLayout: React.FC = () => {
  const isSessionSidebarOpen = useLayoutStore((s) => s.isSessionSidebarOpen);

  return (
    <div className="h-screen w-full flex bg-gray-50">
      {/* 左侧主导航栏 */}
      <PrimarySidebar />

      {/* 左侧二级侧边栏（历史会话） - 根据状态显示/隐藏 */}
      {isSessionSidebarOpen && <SessionSidebar />}

      {/* 中央主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        <MainChatPanel />
      </main>

      {/* 右侧 Agent 选择面板 */}
      <AgentSelectionPanel />
    </div>
  );
};
```

---

#### 3.1.2 `PrimarySidebar.tsx` - 左侧主导航栏

这是一个全新的组件，提供全局功能的图标式导航。

**文件路径**：`components/PrimarySidebar.tsx`

**核心职责**：
- 显示"历史任务"、"知识库"、"设置"等功能图标
- 点击图标时触发相应的状态变化（如展开 SessionSidebar）
- 支持图标高亮显示当前激活的功能

**设计要点**：
- 固定宽度（建议 `w-16` 或 `w-20`，即 64px 或 80px）
- 垂直排列图标，每个图标占据相同高度
- 使用 Tailwind CSS 实现悬停和激活状态的视觉反馈

**代码示例**：

```tsx
'use client';

import React from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { 
  ChatBubbleLeftRightIcon, 
  BookOpenIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

export const PrimarySidebar: React.FC = () => {
  const { activeView, setActiveView, toggleSessionSidebar } = useLayoutStore();

  const navItems = [
    { id: 'chat', icon: ChatBubbleLeftRightIcon, label: '历史任务', action: toggleSessionSidebar },
    { id: 'knowledge', icon: BookOpenIcon, label: '知识库', action: () => setActiveView('knowledge') },
    { id: 'settings', icon: Cog6ToothIcon, label: '设置', action: () => setActiveView('settings') },
  ];

  return (
    <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={item.action}
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              transition-colors duration-200
              ${isActive 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            title={item.label}
          >
            <Icon className="w-6 h-6" />
          </button>
        );
      })}
    </aside>
  );
};
```

---

#### 3.1.3 `AgentSelectionPanel.tsx` - 右侧 Agent 选择面板

这是一个全新的组件，用于展示和切换不同类型的 Agent。

**文件路径**：`components/AgentSelectionPanel.tsx`

**核心职责**：
- 以卡片或列表形式展示所有可用的 Agent
- 每个 Agent 包含图标、名称、描述和标签（如"快速"、"深度思考"）
- 点击某个 Agent 时，更新全局状态中的当前 Agent 模式

**设计要点**：
- 固定宽度（建议 `w-80`，即 320px）
- 支持滚动，以便展示更多 Agent
- 当前激活的 Agent 应有明显的视觉区分（如边框高亮）

**代码示例**：

```tsx
'use client';

import React from 'react';
import { useAgentStore } from '@/store/agentStore';

type Agent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
};

const AVAILABLE_AGENTS: Agent[] = [
  { 
    id: 'fast', 
    name: '快速 Agent', 
    description: '适合简单任务，响应迅速', 
    icon: '⚡',
    badge: '推荐'
  },
  { 
    id: 'deep', 
    name: '思考 Agent', 
    description: '深度推理，适合复杂问题', 
    icon: '🧠'
  },
  { 
    id: 'medical', 
    name: 'Med-Go 医学 Agent', 
    description: '专业医学诊断与分析', 
    icon: '🏥',
    badge: '专业'
  },
  { 
    id: 'research', 
    name: '研究 Agent', 
    description: '文献检索与深度研究', 
    icon: '📚'
  },
];

export const AgentSelectionPanel: React.FC = () => {
  const { currentAgentId, setCurrentAgent } = useAgentStore();

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* 标题栏 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">选择 Agent</h2>
        <p className="text-sm text-gray-500 mt-1">切换不同的推理模式</p>
      </div>

      {/* Agent 列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {AVAILABLE_AGENTS.map((agent) => {
          const isActive = currentAgentId === agent.id;
          
          return (
            <button
              key={agent.id}
              onClick={() => setCurrentAgent(agent.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left
                transition-all duration-200
                ${isActive 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{agent.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    {agent.badge && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                        {agent.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
```

---

### 3.2 重构现有组件

#### 3.2.1 `ChatContainer.tsx` → `MainChatPanel.tsx`

将现有的 `ChatContainer.tsx` 重构为 `MainChatPanel.tsx`，专注于核心的聊天交互逻辑。

**主要变化**：
- **移除**：不再直接渲染 `SessionSidebar` 和 `DebugDrawer`，这些组件的渲染由 `AppLayout` 控制
- **保留**：消息处理、流式响应、用户输入等核心逻辑
- **新增**：顶部标题栏，显示当前激活的 Agent 信息

**代码调整示例**：

```tsx
'use client';

import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAgentStore } from '@/store/agentStore';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';

export const MainChatPanel: React.FC = () => {
  const { messages, isStreaming } = useChatStore();
  const { currentAgentId, getAgentInfo } = useAgentStore();
  
  const agentInfo = getAgentInfo(currentAgentId);

  const handleSend = async (text: string) => {
    // 原有的发送逻辑，但需要根据 currentAgentId 调整请求参数
    // ...
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 顶部 Agent 信息栏 */}
      <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agentInfo?.icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{agentInfo?.name}</h2>
            <p className="text-xs text-gray-500">{agentInfo?.description}</p>
          </div>
        </div>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MessageList messages={messages} isStreaming={isStreaming} />
      </div>

      {/* 输入框 */}
      <InputBar onSend={handleSend} disabled={isStreaming} />
    </div>
  );
};
```

---

#### 3.2.2 `SessionSidebar.tsx` - 保持独立性

现有的 `SessionSidebar` 组件无需大幅修改，但其渲染逻辑将由 `AppLayout` 根据全局状态控制。

**调整要点**：
- 确保组件可以独立渲染，不依赖于 `ChatContainer` 的内部状态
- 可以添加一个关闭按钮，允许用户手动收起侧边栏

---

### 3.3 状态管理

为了支持新的布局架构，我们需要新增或扩展全局状态管理。

#### 3.3.1 新增 `layoutStore.ts` - 布局状态管理

**文件路径**：`store/layoutStore.ts`

**管理内容**：
- 当前激活的视图（`activeView`）：`'chat' | 'knowledge' | 'settings'`
- SessionSidebar 的显示状态（`isSessionSidebarOpen`）
- DebugDrawer 的显示状态（可从 `chatStore` 迁移过来）

**代码示例**：

```tsx
import { create } from 'zustand';

type LayoutState = {
  activeView: 'chat' | 'knowledge' | 'settings';
  isSessionSidebarOpen: boolean;
  setActiveView: (view: 'chat' | 'knowledge' | 'settings') => void;
  toggleSessionSidebar: () => void;
  openSessionSidebar: () => void;
  closeSessionSidebar: () => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  activeView: 'chat',
  isSessionSidebarOpen: false,
  setActiveView: (view) => set({ activeView: view }),
  toggleSessionSidebar: () => set((state) => ({ isSessionSidebarOpen: !state.isSessionSidebarOpen })),
  openSessionSidebar: () => set({ isSessionSidebarOpen: true }),
  closeSessionSidebar: () => set({ isSessionSidebarOpen: false }),
}));
```

---

#### 3.3.2 新增 `agentStore.ts` - Agent 状态管理

**文件路径**：`store/agentStore.ts`

**管理内容**：
- 当前激活的 Agent ID（`currentAgentId`）
- 可用的 Agent 列表（`availableAgents`）
- 切换 Agent 的方法（`setCurrentAgent`）

**代码示例**：

```tsx
import { create } from 'zustand';

type Agent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
};

type AgentState = {
  currentAgentId: string;
  availableAgents: Agent[];
  setCurrentAgent: (agentId: string) => void;
  getAgentInfo: (agentId: string) => Agent | undefined;
};

const DEFAULT_AGENTS: Agent[] = [
  { id: 'fast', name: '快速 Agent', description: '适合简单任务，响应迅速', icon: '⚡', badge: '推荐' },
  { id: 'deep', name: '思考 Agent', description: '深度推理，适合复杂问题', icon: '🧠' },
  { id: 'medical', name: 'Med-Go 医学 Agent', description: '专业医学诊断与分析', icon: '🏥', badge: '专业' },
  { id: 'research', name: '研究 Agent', description: '文献检索与深度研究', icon: '📚' },
];

export const useAgentStore = create<AgentState>((set, get) => ({
  currentAgentId: 'fast',
  availableAgents: DEFAULT_AGENTS,
  setCurrentAgent: (agentId) => set({ currentAgentId: agentId }),
  getAgentInfo: (agentId) => get().availableAgents.find((a) => a.id === agentId),
}));
```

---

## 四、实施步骤

为了确保重构过程平稳进行，建议按照以下步骤逐步实施：

### 第一阶段：准备工作

**任务清单**：
1. 创建新的状态管理文件：`store/layoutStore.ts` 和 `store/agentStore.ts`
2. 安装必要的图标库（如 `@heroicons/react`）：`npm install @heroicons/react`
3. 备份现有的 `ChatContainer.tsx`，以便回滚

### 第二阶段：创建新组件

**任务清单**：
1. 创建 `components/PrimarySidebar.tsx`
2. 创建 `components/AgentSelectionPanel.tsx`
3. 创建 `components/AppLayout.tsx`
4. 测试各组件的独立渲染和基本交互

### 第三阶段：重构现有组件

**任务清单**：
1. 将 `ChatContainer.tsx` 重构为 `MainChatPanel.tsx`
2. 调整 `SessionSidebar.tsx`，确保其可以独立渲染
3. 更新 `app/page.tsx`，使用新的 `AppLayout` 组件

### 第四阶段：集成与测试

**任务清单**：
1. 测试左侧导航栏的点击交互（展开/收起 SessionSidebar）
2. 测试右侧 Agent 面板的切换功能
3. 验证中央主内容区的消息流和输入功能
4. 进行跨浏览器和响应式布局测试

### 第五阶段：优化与上线

**任务清单**：
1. 优化动画和过渡效果（如侧边栏的滑入/滑出）
2. 添加加载状态和错误处理
3. 进行性能优化（如懒加载、代码分割）
4. 部署到测试环境，收集用户反馈

---

## 五、视觉设计建议

为了实现与参考截图类似的现代化视觉风格，建议采用以下设计原则：

### 5.1 配色方案

| 元素 | 颜色 | Tailwind 类名 |
|:-----|:-----|:-------------|
| 主背景 | 浅灰色 | `bg-gray-50` |
| 卡片/面板背景 | 白色 | `bg-white` |
| 边框 | 浅灰色 | `border-gray-200` |
| 主要文字 | 深灰色 | `text-gray-900` |
| 次要文字 | 中灰色 | `text-gray-600` |
| 激活状态 | 蓝色 | `bg-blue-500`, `text-blue-600` |
| 悬停状态 | 浅蓝色 | `hover:bg-blue-50` |

### 5.2 图标与排版

**图标**：使用 Heroicons 或类似的图标库，确保图标风格统一。对于 Agent，可以使用 Emoji 或自定义 SVG 图标。

**排版**：采用清晰的层次结构，标题使用 `text-lg` 或 `text-xl`，正文使用 `text-sm` 或 `text-base`，次要信息使用 `text-xs`。

### 5.3 卡片与阴影

**卡片设计**：使用圆角（`rounded-lg`）和轻微阴影（`shadow-sm` 或 `shadow-md`）来区分不同的功能区域。

**交互反馈**：在悬停和点击时提供视觉反馈，如背景色变化、阴影加深等。

---

## 六、技术栈与工具

本设计方案基于以下技术栈，与现有项目保持一致：

| 技术 | 用途 |
|:-----|:-----|
| **Next.js** | React 框架，支持 SSR 和 CSR |
| **TypeScript** | 类型安全的 JavaScript |
| **Tailwind CSS** | 实用优先的 CSS 框架 |
| **Zustand** | 轻量级状态管理库 |
| **Heroicons** | 高质量的 SVG 图标库 |

---

## 七、常见问题与解答

### Q1: 如何处理移动端响应式布局？

**A**: 对于移动端，建议采用以下策略：
- 左侧导航栏和右侧 Agent 面板默认隐藏，通过汉堡菜单或底部导航栏访问
- 中央主内容区占据全屏
- 使用 Tailwind 的响应式工具类（如 `md:flex`, `lg:w-80`）来控制不同屏幕尺寸下的布局

### Q2: 如何确保 Agent 切换时不丢失当前对话？

**A**: 在 `agentStore` 中切换 Agent 时，不应清空 `chatStore` 中的消息历史。只需更新 `currentAgentId`，并在后续的 API 请求中携带新的 Agent 参数即可。如果需要为不同 Agent 维护独立的对话历史，可以在 `chatStore` 中为每个 Agent 维护一个独立的消息数组。

### Q3: 如何扩展新的 Agent？

**A**: 只需在 `agentStore.ts` 的 `DEFAULT_AGENTS` 数组中添加新的 Agent 对象即可。确保每个 Agent 有唯一的 `id`，并提供必要的元数据（名称、描述、图标等）。

---

## 八、总结

本设计方案为 **reasoning_engine_web** 项目提供了一个清晰、可执行的前端重构路径。通过采用三栏式布局、模块化组件设计和全局状态管理，新界面将显著提升用户体验和功能可扩展性。建议您的前端工程师按照上述步骤逐步实施，并在每个阶段进行充分的测试和验证。

如有任何技术细节需要进一步讨论，欢迎随时沟通。祝项目顺利推进！

---