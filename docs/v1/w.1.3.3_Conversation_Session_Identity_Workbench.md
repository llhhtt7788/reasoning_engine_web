# w.1.3.3 归档：Conversation/Session Identity + Workbench 布局可用性增强

> 本文件用于把近期沟通的开发内容和落地变更归档，便于后续追踪/回查。
> 
> 时间：2026-01

---

## 1. 背景与目标

在 `w.1.3.2_Conversation_Session_Identity.md` 的基础上，本次迭代补齐两类能力：

1) **Identity（conversation/session）前端一致性**
- 前端要稳定地产生/维护 `user_id / conversation_id / conversation_root_id / session_id`，并在每次 `/api/v1/chat/context` 请求携带。
- `conversation_id` 默认等于 `user_id`，可编辑（调试切换上下文桶）。
- `session_id` 为页面生命周期内稳定，刷新即变化。

2) **Workbench 三栏布局可用性**
- 布局调整为：**左（LangGraph 决策路径）/ 中（聊天）/ 右（Reasoning）**。
- 左侧路径栏支持 **拖拽调整宽度**，并 **持久化**（刷新不丢）。
- 拖拽条 hover 提示当前宽度（tooltip）。

---

## 2. 范围（Scope）

### In Scope
- 统一 Identity store（前端权威值）
- `/api/v1/chat/context` 请求体补齐 identity 字段
- Debug/Workbench UI：
  - conversation_id 可编辑、可复制、可重置
  - 三栏布局切换
  - 左侧宽度可拖拽 + localStorage 持久化 + tooltip

### Out of Scope（后续可选）
- persona/task_type 等更多字段的 UI 设置入口
- 拖拽宽度跨设备同步（目前仅 localStorage）
- 移动端折叠策略（目前按桌面工作台优先）

---

## 3. Identity 设计（最终实现版）

### 3.1 字段定义
- `user_id`
  - 优先读取 `NEXT_PUBLIC_USER_ID`
  - 若缺失：前端生成并持久化到 `localStorage(langgraph.user_id)`（保证稳定）

- `conversation_id`
  - 默认等于 `user_id`
  - 可在 UI 中修改
  - 持久化到 `localStorage(langgraph.conversation_id)`

- `conversation_root_id`
  - 固定等于 `user_id`

- `session_id`
  - 页面加载生成一次（页面生命周期稳定）
  - 刷新即变化
  - 不跨刷新复用（不写 localStorage）

### 3.2 请求体要求
每次调用 `/api/v1/chat/context`（stream）请求体携带：
- `conversation_id`
- `conversation_root_id`
- `session_id`

---

## 4. UI/交互（Workbench）

### 4.1 三栏结构
- 左：`DecisionPathSidebar`（LangGraph 决策路径）
- 中：Chat（MessageList + InputBar）
- 右：`ReasoningSidebar`（包含 ContextDebugPanel）

### 4.2 左侧宽度拖拽（Split View）
- 拖拽条宽度：6px
- 左侧宽度范围：`MIN_LEFT_PANEL_PX ~ MAX_LEFT_PANEL_PX`
- 持久化键：`localStorage['medgo.ui.left_panel_px']`
- 交互细节：
  - 拖拽时禁止文本选择（`document.body.classList.add('select-none')`）
  - 鼠标松开时写入 localStorage
  - 双击拖拽条：重置为默认宽度
  - hover/拖拽时显示 tooltip：`{leftPanelPx}px`

---

## 5. 关键实现变更（Files & Notes）

### 5.1 新增
- `store/identityStore.ts`
  - 新增 zustand store：统一维护 `userId / conversationId / conversationRootId / sessionId`
  - `conversationId` 写入 localStorage，`sessionId` 不持久化

### 5.2 修改
- `lib/sseClient.ts`
  - `ChatRequestContext` 扩展：`conversationRootId`
  - request body 增加 `conversation_root_id`
  - 强制 `session_id` 为 string（不再传 null）

- `lib/sessionManager.ts`
  - 保留 `conversation_id` 读写 localStorage
  - `session_id` 相关逻辑改为 no-op（与 PRD：刷新即变保持一致）

- `components/ChatContainer.tsx`
  - 使用 `useIdentityStore` 取 conversation/session
  - 主布局改为三栏：左路径 / 中聊天 / 右 reasoning
  - 左侧宽度拖拽 + 持久化 + tooltip
  - 修复标题字符串被错误转义导致页面显示 `\u63a8\u7406...` 的问题

- `components/ContextDebugPanel.tsx`
  - 增加 conversation_id 编辑/复制（用于快速切换上下文桶）
  - 兼容 v1.7.2 intent/execution 的类型适配（传给 `IntentPolicyBlock`）

---

## 6. 验收清单（DoD）

### Identity
- [ ] 每次 `/api/v1/chat/context` 请求都携带 `conversation_id / conversation_root_id / session_id`
- [ ] `conversation_id` 默认等于 `user_id`
- [ ] 修改 `conversation_id` 后，下次请求立即生效
- [ ] 刷新页面后 `session_id` 变化、`conversation_id` 保留

### Workbench
- [ ] 布局为左（LangGraph）/中（聊天）/右（Reasoning）
- [ ] 左侧宽度可拖拽
- [ ] 刷新后左侧宽度保持
- [ ] hover 拖拽条显示当前宽度 tooltip

### Build
- [ ] `npm run build` 通过（TypeScript + Next build）

---

## 7. 备注 / 后续优化

- 可选：拖拽时显示更明显的辅助线/半透明 overlay
- 可选：提供一个“布局重置”按钮（同时重置左侧宽度、conversation_id 等）
- 可选：在 Debug Panel 中展示“本次请求使用的 identity”（与后端回包对照）

---

## 8. 前端调试：记录 POST 到 `logs/`（Request Logging）

### 8.1 需求
为了在前端联调时快速核对「实际发给后端的 POST JSON 是否正确」，在 Next.js 的服务端代理路由中把每次请求的请求体（脱敏后）写入项目根目录的 `logs/`。

### 8.2 实现位置
- `app/api/proxy/route.ts`
  - 浏览器发起的 SSE POST（前端 `lib/sseClient.ts` 默认走 `/api/proxy`）会在这里被接收并转发到真实后端。
  - 在该路由中读取 `req.text()`，并在开启开关时落盘。

### 8.3 开关与配置（环境变量）
- `ENABLE_REQUEST_LOGS=1` 或 `true`：开启写日志（默认关闭）
- `REQUEST_LOG_DIR=logs`：日志目录（默认 `logs`，支持绝对路径）
- `REQUEST_LOG_MAX_BYTES=262144`：单条日志最大字节数（默认 256KB，超出将标记为 TRUNCATED）

### 8.4 脱敏与安全
- 自动脱敏常见敏感字段 key：`authorization/token/access_token/api_key/password/secret/cookie` 等。
- `.gitignore` 已忽略 `logs/*`（保留 `logs/.gitkeep`），避免误提交。
- 注意：该功能会 **buffer 整个请求体**（用于调试），只建议在本地/测试环境开启。

### 8.5 日志文件格式
每次请求会生成一个 JSON 文件，包含：
- `ts`：ISO 时间
- `route`：固定标记（例如 `api_proxy`）
- `method`
- `headers`（已脱敏）
- `body`（已脱敏；若不是 JSON 则保存原始文本）

---

## 9. w.2.0.0 归档：Knowledge Upload MVP（Upload → stored → 可回显/可审计）

> 时间：2026-01
> 
> 本段用于归档 w.2.0.0 前端对齐实现（与后端 Upload MVP 对齐），并记录关键落地文件，便于后续回查。

### 9.1 范围

**In Scope**
- 左侧工作台（`DecisionPathSidebar`）顶部新增 `📤 Knowledge Upload`
- 固定对齐后端：`POST /api/knowledge/documents/upload`（multipart/form-data）
- 上传成功后展示完整 response JSON（前端不推断、不补字段）
- 联调调试：把 POST 请求写入 `logs/`（可开关）
  - `/api/proxy`（chat SSE 代理）
  - `/api/knowledge/documents/upload`（upload 代理）

**Out of Scope**
- Recall/Chunks/Rerank 调度可视化
- 上传进度/轮询/Job
- 删除/编辑/权限

### 9.2 关键实现（Files）

- `components/KnowledgeUploadPanel.tsx`
  - 左侧上传 UI：file + tags（逗号分隔）+ 上传按钮 + response 回显
- `lib/knowledgeUpload.ts`
  - 前端上传方法：`fetch('/api/knowledge/documents/upload')`，使用 `FormData`
- `types/knowledge.ts`
  - `KnowledgeUploadResponse` 类型定义
- `app/api/knowledge/documents/upload/route.ts`
  - Next.js 代理：把 multipart 转发到后端同路径，并在开启开关时落盘日志（只写摘要，不保存二进制）
- `lib/requestLogging.ts`
  - 抽出的共享 request logging 工具（供 `/api/proxy` 与 upload 代理复用）

### 9.3 环境变量（Request Logging）

- `ENABLE_REQUEST_LOGS=1 | true`：开启写日志（默认关闭）
- `REQUEST_LOG_DIR=logs`：日志目录
- `REQUEST_LOG_MAX_BYTES=262144`：最大日志大小（默认 256KB）
