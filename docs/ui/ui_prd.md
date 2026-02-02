# UI 布局重构开发计划

基于 `docs/ui/ui.md` 的三栏式布局 PRD，目标是在不影响现有对话能力的前提下完成布局重构与 Agent 切换入口的前端实现。

## 范围与目标
- 新增布局壳层：左侧 Primary Sidebar、中央 MainChatPanel、右侧 AgentSelectionPanel。
- 新增/扩展全局状态：布局（侧边栏开合、视图切换）、Agent 列表与当前选中。
- 重构聊天主区域：`ChatContainer` → `MainChatPanel`，去除内部对侧边栏/调试抽屉的耦合。
- 保持现有聊天与输入流程可用，确保 SessionSidebar、DebugDrawer 可继续独立渲染。

## 里程碑
1) 状态脚手架：布局/Agent store 搭建（0.5d）
2) 布局骨架：`AppLayout` 渲染三栏占位（0.5d）
3) 侧栏实现：PrimarySidebar 与 AgentSelectionPanel 交互（0.5d）
4) 聊天面板重构：MainChatPanel 替换 ChatContainer（0.5d）
5) 集成验证：`app/page.tsx` 接入新布局，回归基础聊天（0.5d）

## 任务拆解
- Store 层
  - `store/layoutStore.ts`: activeView, isSessionSidebarOpen，开关方法。
  - `store/agentStore.ts`: availableAgents, currentAgentId，切换与查询方法。
- 布局组件
  - `components/AppLayout.tsx`: 组合 PrimarySidebar、SessionSidebar（按状态显示）、MainChatPanel、AgentSelectionPanel。
  - `components/PrimarySidebar.tsx`: 图标导航，点击触发展开会话侧栏/切换视图。
  - `components/AgentSelectionPanel.tsx`: Agent 列表卡片，切换高亮。
- 聊天区域
  - `components/MainChatPanel.tsx`: 顶部 Agent 信息栏 + MessageList + InputBar；移除对 SessionSidebar/DebugDrawer 的直接依赖。
  - 发送逻辑接入 currentAgentId（先复用现有发送流程，后续按需扩展请求参数）。
- 路由集成
  - `app/page.tsx`: 入口改为渲染 `AppLayout`，保持全局样式与上下文。
- 样式与交互
  - Tailwind 边框/阴影/hover 状态；布局 flex 占比（左 64-80px，右 280-320px，中间自适应）。
  - 确认移动端策略：默认折叠两侧栏，必要时提供底部入口（待决策）。

## 依赖与风险
- 需安装/确认 `@heroicons/react`（用于导航图标）。
- Agent 列表来源：短期使用前端常量，后续若接后端需保留扩展点。
- 聊天与 Agent 是否共享历史：当前计划共享一套消息；如需按 Agent 分隔，需在 chatStore 层增加按 Agent 归档。
- 移动端适配范围未定：如需支持，需增加响应式隐藏/抽屉式交互。

## 验收与测试
- 功能：
  - 左侧导航可展开/收起 SessionSidebar，不影响消息区滚动。
  - 右侧 Agent 切换有高亮，切换不清空现有消息。
  - 中央消息列表与输入框正常发送/流式渲染。
- 视觉：
  - 三栏宽度与 PRD 一致，hover/active 状态可见。
- 回归：
  - Session 切换、DebugDrawer 原有入口可独立工作（如仍需保留）。

## 后续优化（MVP 后）
- 动画与过渡（侧栏滑入/滑出、卡片阴影过渡）。
- 懒加载与代码分割，减少首屏体积。
- 移动端专用导航模式（汉堡菜单或底部 Tab）。

## 执行指令：启动 UI 重构 (Milestone 1 & 2)
**目标**：完成状态管理基础设施搭建，并渲染出三栏布局的静态骨架。

### 步骤 1：安装依赖与环境准备
确保图标库与状态管理依赖就位。
```bash
npm install @heroicons/react zustand clsx tailwind-merge
```

### 步骤 2：构建全局状态 (Store Layer)
1. `src/store/layoutStore.ts`
   - 职责：控制左侧二级侧边栏开合、主视图切换。
   - 代码：
```typescript
import { create } from 'zustand';

type LayoutState = {
  activeView: 'chat' | 'knowledge' | 'settings';
  isSessionSidebarOpen: boolean;
  setActiveView: (view: 'chat' | 'knowledge' | 'settings') => void;
  toggleSessionSidebar: () => void;
  setSessionSidebarOpen: (isOpen: boolean) => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  activeView: 'chat',
  isSessionSidebarOpen: true,
  setActiveView: (view) => set({ activeView: view }),
  toggleSessionSidebar: () => set((state) => ({ isSessionSidebarOpen: !state.isSessionSidebarOpen })),
  setSessionSidebarOpen: (isOpen) => set({ isSessionSidebarOpen: isOpen }),
}));
```

2. `src/store/agentStore.ts`
   - 职责：管理 Agent 列表和当前选中。
   - 代码：
```typescript
import { create } from 'zustand';

export type Agent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
};

type AgentState = {
  currentAgentId: string;
  availableAgents: Agent[];
  setCurrentAgent: (id: string) => void;
  getAgentInfo: (id: string) => Agent | undefined;
};

const DEFAULT_AGENTS: Agent[] = [
  { id: 'fast', name: '快速', description: '响应迅速，适合简单任务', icon: '⚡', badge: '推荐' },
  { id: 'reasoning', name: '思考', description: '强推理模式', icon: '🧠' },
  { id: 'medical', name: 'Med-Go 医学', description: '专业医学知识库与诊断', icon: '🏥', badge: '专业' },
];

export const useAgentStore = create<AgentState>((set, get) => ({
  currentAgentId: 'fast',
  availableAgents: DEFAULT_AGENTS,
  setCurrentAgent: (id) => set({ currentAgentId: id }),
  getAgentInfo: (id) => get().availableAgents.find((a) => a.id === id),
}));
```

### 步骤 3：搭建布局骨架 (Layout Skeleton)
1. 新建 `src/components/layout/AppLayout.tsx`
   - 用占位符跑通三栏结构，便于验证 Tailwind 布局。
```tsx
'use client';
import React from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { SessionSidebar } from '@/components/SessionSidebar';
import { Bars3Icon, ChatBubbleLeftRightIcon, BookOpenIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isSessionSidebarOpen, toggleSessionSidebar } = useLayoutStore();

  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden">
      <aside className="w-16 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 z-20">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mb-2">
          <Bars3Icon className="w-6 h-6" />
        </div>
        <button onClick={toggleSessionSidebar} className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="历史会话">
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
        <button className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="知识库">
          <BookOpenIcon className="w-6 h-6" />
        </button>
        <div className="flex-1" />
        <button className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="设置">
          <Cog6ToothIcon className="w-6 h-6" />
        </button>
      </aside>

      <div className={`transition-all duration-300 ease-in-out border-r border-gray-200 bg-white flex-shrink-0 overflow-hidden ${isSessionSidebarOpen ? 'w-72' : 'w-0'}`}>
        <div className="w-72 h-full">
          <SessionSidebar />
        </div>
      </div>

      <main className="flex-1 min-w-0 bg-white relative flex flex-col">{children}</main>

      <aside className="w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 hidden xl:flex flex-col">
        <div className="p-4 border-b border-gray-200 font-medium text-gray-700">Agent 选择</div>
        <div className="p-4 text-gray-500 text-sm">(AgentSelectionPanel 占位区域)</div>
      </aside>
    </div>
  );
};
```

2. 修改 `app/page.tsx`
   - 入口指向新 Layout，先用旧 ChatContainer 占位验证中间区域。
```tsx
import { AppLayout } from '@/components/layout/AppLayout';
import ChatContainer from '@/components/ChatContainer';

export default function Home() {
  return (
    <AppLayout>
      <div className="h-full w-full">
        <ChatContainer />
      </div>
    </AppLayout>
  );
}
```

完成上述三步后，确保页面可运行、左侧图标可折叠会话侧栏；随后进入 MainChatPanel 重构与 AgentSelectionPanel 实装。
