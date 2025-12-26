# Med-Go Web 前端

A professional reasoning-driven web interface built with Next.js and React for interacting with AI reasoning models.

## 项目背景

Med-Go Web 是一个**推理驱动的专业对话工作台（Reasoning-Driven Console）**，专为需要长时间使用、对可解释性和稳定性要求高的专业用户（医生/决策者/工程师）设计。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: Native Fetch + SSE
- **Markdown**: react-markdown

## 功能特性

- 💬 **流式对话**: 支持 SSE 流式响应，逐 token 显示回复
- 🧠 **思维链展示**: 可折叠的推理过程展示（默认折叠，不干扰主回答）
- 💡 **下一步建议**: 智能生成后续问题建议
- 📝 **Markdown 渲染**: 支持富文本格式的消息展示
- 🔄 **状态管理**: 使用 Zustand 进行轻量级状态管理
- 📱 **响应式设计**: 适配各种屏幕尺寸

## 前置要求

- Node.js 18 或更高版本
- 推理引擎 API 服务运行在 `http://localhost:11211/api/v1/chat/context`

## 安装

1. 克隆仓库：
```bash
git clone https://github.com/llhhtt7788/reasoning_engine_web.git
cd reasoning_engine_web/frontend
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量（可选）：
```bash
cp .env.example .env.local
# 编辑 .env.local 修改 API URL（如果需要）
```

## 使用

### 开发模式

```bash
npm run dev
```

然后访问 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## 项目结构

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 主页面
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── ChatContainer.tsx  # 聊天容器（主组件）
│   ├── MessageList.tsx    # 消息列表
│   ├── MessageBubble.tsx  # 消息气泡
│   ├── InputBar.tsx       # 输入栏
│   ├── ReasoningPanel.tsx # 思维链面板
│   └── NextActionPanel.tsx # 下一步建议面板
├── store/                 # Zustand 状态管理
│   └── chatStore.ts       # 聊天状态
├── types/                 # TypeScript 类型定义
│   └── chat.ts            # 聊天消息类型
├── lib/                   # 工具函数
│   └── sseClient.ts       # SSE 客户端
└── package.json           # 项目配置
```

## API 接口协议

应用期望 API 服务符合以下协议：

### 请求

```
POST /api/v1/chat/context
Content-Type: application/json
```

```json
{
  "user": "用户消息",
  "stream": true,
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

### 响应（SSE 流式）

```
data: {"choices":[{"delta":{"content":"回复内容"}}]}
data: {"choices":[{"delta":{"reasoning":"推理过程"}}]}
data: [DONE]
```

## 数据结构

### ChatMessage

```typescript
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;        // 推理过程（可选）
  nextActions?: string[];    // 下一步建议（可选）
};
```

## 设计原则

1. **推理链不干扰主回答**: 思维链默认折叠，需要用户主动展开
2. **流式体验优先**: 使用 SSE 确保流畅的实时响应
3. **状态集中管理**: 所有聊天状态通过 Zustand 管理，避免组件内部状态混乱
4. **组件职责单一**: 每个组件专注于一个功能，便于维护和扩展
5. **预留扩展能力**: 为多会话、多模型、用户体系等功能预留接口

## 后续规划

- [ ] 多会话管理（session_id）
- [ ] 用户认证体系
- [ ] 多模型路由显示
- [ ] 消息列表虚拟化
- [ ] 合规审计功能
- [ ] Next Action 点击自动提问

## License

MIT License
