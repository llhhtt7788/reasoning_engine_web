# V3 Communication Engine 前端开发计划

> **版本**: w.3.0.0
> **创建时间**: 2026-01-19
> **状态**: 开发中

---

## 概述

基于 w.3.0.0 PRD，实现 V3 通信引擎前端界面。采用独立入口 `/v3` 开发验证，新建 V3 专属组件目录避免影响现有功能。

- **后端 API**: `localhost:11211/api/v3/communicate`
- **前端入口**: `/v3`（独立页面）
- **组件目录**: `components/v3/`

---

## 开发阶段

### 阶段一：基础类型与 API 层 ✅

| 文件 | 描述 | 状态 |
|------|------|------|
| `types/v3Chat.ts` | V3 类型定义（消息、证据、澄清、API 请求/响应） | ✅ 完成 |
| `lib/v3Api.ts` | 非流式 API 封装 | ✅ 完成 |
| `lib/v3SseClient.ts` | 流式 SSE 客户端 | ✅ 完成 |
| `app/api/v3/communicate/route.ts` | Next.js 代理路由 | ✅ 完成 |

### 阶段二：Store 状态管理 ✅

| 文件 | 描述 | 状态 |
|------|------|------|
| `store/v3ChatStore.ts` | V3 状态管理（消息列表、上行 messages） | ✅ 完成 |

核心功能：
- [x] `addUserMessage` - 添加用户消息
- [x] `addLoadingMessage` - 添加 loading 状态消息
- [x] `appendTokenContent` - 追加流式 token
- [x] `finalizeMessage` - 完成流式消息
- [x] `addClarifyCard` - 添加澄清卡片
- [x] `addPendingReviewCard` - 添加审核占位卡
- [x] `addErrorCard` - 添加错误卡片
- [x] `abortStream` - 中断流式生成
- [x] messages 拼接策略（user/assistant 文本写入上行，system 卡片不写入）

### 阶段三：核心 UI 组件 ✅

| 文件 | 描述 | 状态 |
|------|------|------|
| `components/v3/V3MessageBubble.tsx` | 5 种状态消息气泡 | ✅ 完成 |
| `components/v3/EvidencePanel.tsx` | 证据折叠面板 | ✅ 完成 |
| `components/v3/ClarifyCard.tsx` | 澄清卡片 | ✅ 完成 |
| `components/v3/ErrorCard.tsx` | 错误卡片 | ✅ 完成 |
| `components/v3/PendingReviewCard.tsx` | 审核占位卡 | ✅ 完成 |

### 阶段四：容器与页面整合 ✅

| 文件 | 描述 | 状态 |
|------|------|------|
| `components/v3/V3MessageList.tsx` | 消息列表 + 滚动策略 | ✅ 完成 |
| `components/v3/V3ChatContainer.tsx` | V3 对话容器 | ✅ 完成 |
| `app/v3/page.tsx` | `/v3` 独立入口页面 | ✅ 完成 |

### 阶段五：流式渲染与交互优化 ✅

| 功能 | 描述 | 状态 |
|------|------|------|
| SSE 流式渲染 | 首 token 展示 → 逐字追加 → done 补全 | ✅ 完成 |
| 停止生成 | AbortController 中断 + "已停止生成"标记 | ✅ 完成 |
| 滚动策略 | 自动滚动 + 回到底部按钮 | ✅ 完成 |
| `components/v3/EvidenceModal.tsx` | 证据详情弹窗 | ✅ 完成 |
| trace_id 复制 | 点击复制 + Toast 提示 | ✅ 完成 |

### 阶段六：Debug 模式 ✅

| 功能 | 描述 | 状态 |
|------|------|------|
| Debug 信息展示 | trace_id / risk_level / quality_decision | ✅ 完成 |
| Debug 开关 | 页面顶部 checkbox 控制 | ✅ 完成 |

---

## 文件结构

```
types/
  v3Chat.ts                    # V3 类型定义

lib/
  v3Api.ts                     # 非流式 API
  v3SseClient.ts               # 流式 SSE

store/
  v3ChatStore.ts               # V3 状态管理

components/v3/
  index.ts                     # 导出索引
  V3ChatContainer.tsx          # 主容器
  V3MessageList.tsx            # 消息列表
  V3MessageBubble.tsx          # 消息气泡
  EvidencePanel.tsx            # 证据面板
  EvidenceModal.tsx            # 证据弹窗
  ClarifyCard.tsx              # 澄清卡片
  ErrorCard.tsx                # 错误卡片
  PendingReviewCard.tsx        # 审核占位卡

app/
  v3/page.tsx                  # /v3 入口页面
  api/v3/communicate/route.ts  # 代理路由
```

---

## 验收清单

### P0 功能验收

- [ ] 能成功调用 `/api/v3/communicate` 并展示 `success` 返回内容
- [ ] 能展示证据列表：标题+链接（折叠/展开）
- [ ] 能处理 `clarify`：按照 options/输入框呈现并能提交
- [ ] 能处理 `pending_review`：固定文案提示 + 不展示未审核内容
- [ ] 能处理 `error`：展示错误信息 + 可恢复时提供重试

### P1 功能验收

- [ ] 支持 `stream=true` 的 SSE 流式渲染
- [ ] token 追加时不卡顿、能自动滚动跟随
- [ ] done 事件后补齐 evidence/trace 字段
- [ ] "停止生成"功能正常工作

### 用户旅程验收

1. **普通问答成功（非流式）**：输入 → loading → success → 展开证据
2. **流式问答成功（SSE）**：输入 → 首 token 出现 → token 追加 → done 补全证据
3. **澄清闭环**：输入 → clarify → 选择 option/输入 → 再次请求 → success
4. **错误可恢复**：模拟断网/后端 500 → error → recoverable=true → 重试成功

---

## 配置说明

### 环境变量

```bash
# 后端 API 地址（可选，默认通过 Next.js 代理）
V3_BACKEND_URL=http://localhost:11211/api/v3/communicate

# 前端 API 地址（可选，默认 /api/v3/communicate）
NEXT_PUBLIC_V3_API_URL=/api/v3/communicate
```

### 启动开发

```bash
# 确保后端服务运行在 localhost:11211
# 启动前端开发服务器
npm run dev

# 访问 V3 Demo 页面
open http://localhost:3000/v3
```

---

## 后续迭代（w.3.1.0+）

- [ ] 审核回查接口（pending → approved/rejected）
- [ ] 证据预览（知识 chunk 摘录展示）
- [ ] 更精细的风险提示（R2 时 UI 强提示 modal）
- [ ] "继续生成"与"追问"按钮
- [ ] 引用编号高亮回链
