# 前端 PRD · V3 Communication Engine 交互界面（w.3.0.0）

> **文档版本**：w.3.0.0
> **面向对象**：前端开发 / PM / 测试
> **依赖后端版本**：V3 Communication Engine v3.0.0（接口：`/api/v3/communicate`）
> **更新时间**：2026-01-18

---

## 0. TL;DR（30 秒理解）

- 前端只需要对接一个核心接口：`POST /api/v3/communicate`。
- 接口返回 `status`，前端按状态渲染 UI：
  - `success`：展示回答内容 + 证据来源。
  - `clarify`：展示澄清问题并引导用户补充。
  - `pending_review`：展示“人工审核中”的状态页/气泡。
  - `error`：展示错误信息 +（可选）重试按钮。
- 若 `stream=true`：用 SSE 流式渲染回答（`event: token|done|error`）。

> ✅ **对齐 OpenAPI 提醒**：后端 `V3CommunicateResponse.status` 的字段描述（OpenAPI schema）目前是 `'success' or 'error'`，但实际代码会返回 `success/clarify/pending_review/error`。前端请按 PRD 的 4 种 status 兜底渲染，并对未知 status 做兼容（当作 error + 上报）。

---

## 1. 目标与范围

### 1.1 项目目标

为 V3 Communication Engine 提供一套 **可落地的前端交互界面 PRD**，明确：

- 对接接口与字段含义
- 不同 `status` 的 UI 展示规范
- 流式响应的渲染策略
- 证据（citations）展示方式
- 澄清（clarify）交互闭环

### 1.2 非目标（Out of scope）

- 人工审核结果的回查接口（当前版本仅展示 pending 状态）
- 后台运营/审核台建设
- 多模态（图片/语音）输入

---

## 2. 用户与使用场景

### 2.1 目标用户

- 普通用户：使用医学问答/健康咨询
- 医护/运营人员：查看证据来源、判断内容可信度（前端仅展示，不做审核操作）

### 2.2 场景列表

| 场景 | 描述 | 关键 UI |
|------|------|--------|
| S1 | 用户发起提问 | 输入框 + 发送按钮 |
| S2 | AI 生成回答（非流式） | Loading → 解锁回答 |
| S3 | AI 生成回答（流式） | 首 token 快速出现 + 持续追加 |
| S4 | 信息不足触发澄清 | Clarify 问题卡片（按钮/输入框） |
| S5 | 高风险触发人工审核 | Pending 卡片/气泡（不可继续输出） |
| S6 | 发生错误 | Error 卡片 + 重试 |

---

## 3. 功能需求（按模块拆解）

### 3.1 对话输入区（Chat Composer）

#### 3.1.1 输入组件

- 支持多行输入
- Enter 发送（可配置 shift+enter 换行）
- 发送中禁用按钮（避免重复提交）

#### 3.1.2 会话标识

前端需维护并在请求中携带：

- `conversation_id`（推荐：进入页面即生成并持久化）
- `session_id`（可与 conversation_id 复用或按登录态生成）
- `user_id`（登录态用户必传；匿名用户可不传）
- `app_id`（对接方应用标识，如果有）

> 说明：这些字段用于后端追踪与上下文/记忆，对 UI 无直接展示要求。

---

### 3.2 消息列表与气泡渲染（Message List）

#### 3.2.1 消息类型

前端按消息类型渲染：

- 用户消息（user bubble）
- AI 消息（assistant bubble）
- 系统状态消息（system bubble）：clarify/pending/error

#### 3.2.2 AI 内容渲染

- 内容字段：`data.response_content`
- 支持 Markdown（加粗/列表/引用/代码块）
- 长文本折叠：默认展开，超过 N 行出现“展开/收起”

**补充（建议实现，便于 PM 验收）**

- **首屏优先**：生成中优先保证首 token 可视（SSE 下 300ms~1s 内出现），否则展示“仍在思考/分析中”占位。
- **复制与分享**：assistant bubble 提供复制按钮（复制 markdown 原文/纯文本两种）。
- **风险提示条**：当 `data.risk_level` 较高（如 `R2` 或后续扩展档位）时，在回答顶部展示醒目的风险提示条（不改变回答内容）。

---

### 3.3 证据来源展示（Evidence Panel）

#### 3.3.1 数据来源

- 字段：`data.response_evidence: list[object]`

**对齐 OpenAPI（字段名与类型）**

- `response_evidence` 在 OpenAPI 中是 `list[dict[str, Any]]`，也就是 **后端不保证字段固定**。
- 前端应采用“**宽松解析 + 强兜底展示**”策略。

**建议 evidence 兼容字段（用于展示）**

- `title`：标题（字符串）
- `url`：原文链接（字符串）
- `source`：来源类型（如 guideline/paper/internal_doc，可选）
- `document_id / chunk_id / upload_id`：调试字段（仅 debug 模式展示）

#### 3.3.2 展示方式

要求：

- 在 AI 回复气泡下方提供「参考来源」区域（可折叠）
- 默认展示前 3 条，支持“展开查看更多”
- 点击 url：新窗口打开

#### 3.3.3 空证据处理

- 若 `response_evidence` 为空：显示“暂无可展示来源”或隐藏证据区域

#### 3.3.4（新增）Evidence 的“引用高亮/回链”建议（创新点）

为提升可信度与可解释性，建议支持两种轻量交互（不依赖后端改动）：

1) **引用编号**：若回答文本中含有类似 `[1] [2]` 的编号（或后续规范化），前端点击编号可滚动到对应 evidence。
2) **证据卡片预览**：点击 evidence 行弹出侧边栏/弹窗，展示更多字段（title/source/url + 其他原始 JSON 字段折叠）。

---

### 3.4 澄清交互（Clarify Flow）

#### 3.4.1 触发条件

当接口返回：

- `status == "clarify"`
- 且 `data.clarify_question` 非空

#### 3.4.2 澄清问题结构

> 重要：`data.clarify_question` 在 OpenAPI 的类型是 `dict | null`，**并未强约束字段**。
> 下面结构来自 v3 后端实现约定（PRD 以此落地），前端需兼容字段缺失。

```json
{
  "question": "请问您咨询的是哪个科室的问题？",
  "options": ["内科", "外科", "儿科"],
  "required": true
}
```

字段说明：

| 字段 | 类型 | 含义 |
|------|------|------|
| `question` | string | 要展示给用户的澄清问题 |
| `options` | string[] | 可选项；为空则展示输入框 |
| `required` | boolean | 是否必填（required=true 时，必须完成澄清才能继续） |

#### 3.4.3 UI 交互规范

- 展示一个 Clarify 卡片：
  - Title：`question`
  - Body：
    - 若 `options` 非空 → 展示按钮组（Chip/Button）
    - 若 `options` 为空 → 展示输入框 + 确认按钮
- 用户选择/输入后：
  - 将用户选择作为下一次 `query`
  - 并把选择内容追加到 `messages`（OpenAI 格式）
  - 再次调用 `/api/v3/communicate`

#### 3.4.4 Clarify 的 UI 占位建议

- 若 required=true：禁用普通输入框，必须先回答澄清
- 若 required=false：允许用户跳过（可提供“跳过”按钮，跳过时可传入空字符串或“跳过”）

#### 3.4.5（新增）Clarify 的“闭环体验”建议

- **上下文提示**：Clarify 卡片顶部展示一行 explain（如“为了给出更准确的建议，需要补充一个信息”）。
- **一键回退**：提供“重新描述问题”按钮，允许用户跳出 clarify，回到输入框重新提问（将 clarify 卡片标记为已跳过）。
- **多次澄清容错**：若连续出现 clarify（用户回答后再次 clarify），前端应复用相同交互组件，最多展示最近 1 个 clarify 卡片，避免刷屏。

---

### 3.5 人工审核（Pending Review）

#### 3.5.1 触发条件

- `status == "pending_review"`

#### 3.5.2 UI 展示

- 在 AI 气泡位置展示：
  - 文案：`内容正在人工审核中，请稍后查看。`
  - 展示 `trace_id`（仅 debug 模式）
- 禁止展示未经审核的完整回答（当前后端可能返回占位文本，前端建议固定文案）

#### 3.5.3 交互说明

- 当前版本不提供审核结果回查接口
- 前端可提供：
  - “复制追踪号 trace_id”按钮
  - “重新提问”按钮

**对齐后端行为（非常关键）**

- 触发条件：
  - 当前实现：当 `data.quality_decision == "human_review"` 时，接口返回 `status = "pending_review"`。

**建议 UI（更贴合真实业务）**

- 除固定文案外，可展示：
  - `trace_id`（debug 模式）
  - “为什么需要人工审核”的说明（由 PM 提供固定模板；不依赖后端字段）
- 允许用户继续提问，但对 **高风险场景**（例如未来扩展 risk_level=R2）建议弹出一次确认提示。

---

### 3.6 错误处理（Error UI）

#### 3.6.1 触发条件

- `status == "error"`

#### 3.6.2 错误结构

> 对齐 OpenAPI：`error = { code: string, message: string, recoverable: boolean } | null`

```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "ENGINE_ERROR",
    "message": "执行引擎发生错误",
    "recoverable": true
  }
}
```

#### 3.6.3 UI 展示

- Error 卡片：
  - 标题：`发生错误`
  - 内容：展示 `error.message`
  - 若 `recoverable == true`：提供“重试”按钮

#### 3.6.4（新增）错误码与前端策略（P0 必备）

前端应至少兼容以下错误来源：

- `ENGINE_ERROR`：引擎执行失败（可重试）
- `STREAM_ERROR`：SSE 过程出错（可重试；需要结束流与 UI 收尾）
- 网络错误/超时：前端网络层错误（可重试）

建议策略：

- `recoverable=true`：展示“重试”按钮，重试时复用同一轮 query/messages。
- `recoverable=false`：不展示重试按钮，提示用户换一种问法。
- 所有错误都建议给一个“复制 trace_id”（若存在）按钮，便于反馈。

---

## 4. API 对接规范

### 4.1 核心端点

- **POST** `/api/v3/communicate`

### 4.2 请求体（前端建议）

> 对齐 OpenAPI：字段名为 `query/messages/conversation_id/session_id/user_id/app_id/stream`

```json
{
  "query": "用户输入",
  "messages": [
    {"role": "user", "content": "上一轮用户"},
    {"role": "assistant", "content": "上一轮AI"}
  ],
  "conversation_id": "conv-xxx",
  "session_id": "sess-xxx",
  "user_id": "user-xxx",
  "app_id": "app-xxx",
  "stream": false
}
```

### 4.3 响应体（统一结构）

> 对齐 OpenAPI：
> - `status: string`
> - `data: object | null`
> - `error: object | null`

```json
{
  "status": "success|clarify|pending_review|error",
  "data": {
    "response_content": "...",
    "response_evidence": [],
    "intent_type": "qa",
    "risk_level": "R0|R1|R2",
    "quality_decision": "pass|repair|human_review",
    "trace_id": "trace-xxx",
    "clarify_question": null
  },
  "error": null
}
```

### 4.3.1（新增）字段可空性与前端兜底规则（P0 必备）

- `data`：
  - `success/clarify/pending_review` 一般非空，但前端必须兜底 `data==null`，当作 error。
- `data.response_content`：允许为空字符串；为空时展示兜底文案“暂时无法生成回答”。
- `data.response_evidence`：可能为空数组；为空则隐藏证据区。
- `data.trace_id`：可空；为空则隐藏复制入口。
- `data.clarify_question`：仅在 `status=clarify` 时期望非空；缺失则降级为普通重新提问。

---

### 4.4 流式输出（SSE）

当请求 `stream=true` 时：

- Response header：`Content-Type: text/event-stream`
- 事件类型：
  - `event: token`：用于逐步追加内容
  - `event: done`：用于补全 metadata（证据、trace_id、quality_decision）
  - `event: error`：用于提示错误

示例：

```text
event: token
data: {"content": "AKI", "index": 0}

event: done
data: {"response_evidence": [...], "trace_id": "trace-xxx", "quality_decision": "pass"}
```

#### 4.4.1（新增）SSE 解析要求（前端实现细节）

- 浏览器侧建议使用 `EventSource`（简单、稳定），或 `fetch + ReadableStream`（可支持 Abort）。
- `token` 事件：拼接到当前 assistant bubble 文本。
- `done` 事件：
  - 写入 evidence/trace_id/quality_decision
  - 关闭 loading
- `error` 事件：
  - 立即结束流
  - 将当前 assistant bubble 标记为 error（或在末尾追加“生成失败”）

> 当前后端实现是“把全量 response_content 按 chunk_size=10 切片模拟 token”，前端按 token 追加即可；未来升级为真实 token streaming 时前端无需改。

---

## 5. UI 状态机（前端渲染对齐）

### 5.1 状态表

| status | UI 状态 | 是否允许继续输入 | 备注 |
|--------|---------|------------------|------|
| `success` | 展示完整回答 | ✅ 是 | 展示证据 |
| `clarify` | 展示澄清卡片 | ⚠️ required=true 时不允许 | 需要补充信息 |
| `pending_review` | 展示审核占位 | ✅ 是（建议提示高风险） | 当前无回查 |
| `error` | 展示错误卡片 | ✅ 是 | recoverable=true 时支持重试 |

### 5.2 前端渲染伪代码

```ts
switch (resp.status) {
  case 'success':
    renderAssistant(resp.data.response_content);
    renderEvidence(resp.data.response_evidence);
    break;

  case 'clarify':
    renderClarify(resp.data.clarify_question);
    break;

  case 'pending_review':
    renderPending('内容正在人工审核中，请稍后查看');
    break;

  case 'error':
    renderError(resp.error?.message ?? '未知错误', resp.error?.recoverable);
    break;
}
```

---

## 6. 交互细节与前端验收清单

### 6.1 验收清单（P0）

- [ ] 能成功调用 `/api/v3/communicate` 并展示 `success` 返回内容
- [ ] 能展示证据列表：标题+链接（折叠/展开）
- [ ] 能处理 `clarify`：按照 options/输入框呈现并能提交
- [ ] 能处理 `pending_review`：固定文案提示 + 不展示未审核内容
- [ ] 能处理 `error`：展示错误信息 + 可恢复时提供重试

### 6.2 验收清单（P1）

- [ ] 支持 `stream=true` 的 SSE 流式渲染
- [ ] token 追加时不卡顿、能自动滚动跟随
- [ ] done 事件后补齐 evidence/trace 字段

### 6.3（新增）前端对接“最小闭环”用户旅程（PM/测试验收用）

建议前端至少提供 4 条可回归的用户旅程（每条都能在测试环境复现）：

1) **普通问答成功（非流式）**：输入 → loading → success → 可复制回答 → 展开证据
2) **流式问答成功（SSE）**：输入 → 首 token 出现 → token 追加 → done 补全证据
3) **澄清闭环**：输入 → clarify → 选择 option/输入 → 再次请求 → success
4) **错误可恢复**：模拟断网/后端 500 → error → recoverable=true → 重试成功

---

## 7. 埋点与调试建议（可选）

### 7.1 推荐埋点

| 事件 | 字段 | 说明 |
|------|------|------|
| send_query | query_length, conversation_id | 用户发起提问 |
| recv_status | status, trace_id | 收到响应状态 |
| clarify_shown | question | 展示澄清问题 |
| clarify_answered | selected_option | 用户回答澄清 |
| evidence_clicked | document_id, url | 用户点击证据 |
| error_shown | code, recoverable | 错误展示 |

### 7.2 Debug 模式显示

在 debug 模式下可在气泡底部展示：

- `trace_id`
- `risk_level`
- `quality_decision`

---

## 8. 相关参考

- 后端交接文档：`docs/v3/v3_readme.md`
- API 技术说明：`docs/v3/v3_api.md`
- V3 架构说明：`docs/v3/v3_architecture.md`

---

## 9. 附录：UI 交互落地细节（强烈建议前端按此实现）

> 这部分是为前端开发“直接落地”准备的：包括消息结构、messages 拼接策略、流式渲染细节、滚动/中断、trace 复制、证据弹窗等。

### 9.1 前端消息数据结构（建议）

前端建议维护一个 `ChatMessage[]`，并明确每条消息的“渲染类型”。

```ts
type MessageRole = 'user' | 'assistant' | 'system';

type MessageStatus =
  | 'normal'          // 普通 user/assistant 消息
  | 'loading'         // assistant 正在生成（流式或非流式都可用）
  | 'clarify'         // 系统澄清卡
  | 'pending_review'  // 人工审核占位
  | 'error';          // 错误卡

export interface EvidenceRef {
  document_id?: string;
  chunk_id?: string;
  title?: string;
  url?: string;
  source?: string;
}

export interface ChatMessage {
  id: string;                 // 前端生成 uuid
  role: MessageRole;
  status: MessageStatus;
  content: string;            // 主体文本（Markdown）
  created_at: number;         // ms

  // ——可选：用于 debug/埋点/排查——
  trace_id?: string;
  risk_level?: 'R0' | 'R1' | 'R2';
  quality_decision?: 'pass' | 'repair' | 'human_review' | 'block';

  // ——可选：澄清卡——
  clarify_question?: {
    question: string;
    options?: string[];
    required?: boolean;
  };

  // ——可选：证据引用——
  evidence?: EvidenceRef[];

  // ——可选：错误结构——
  error?: { code?: string; message: string; recoverable?: boolean };
}
```

设计原则：
- **messages（上行给后端）** 与 **ChatMessage（前端展示）** 分离。
- 后端返回的 `response_evidence/trace_id/risk/quality` 等，挂在 assistant 消息上。

---

### 9.2 messages 拼接策略（最关键：多轮对话一致性）

后端接口的 `messages` 是 OpenAI 兼容格式：

```json
[
  {"role": "user", "content": "..."},
  {"role": "assistant", "content": "..."}
]
```

#### 9.2.1 推荐规则

- **只把 user / assistant 的“文本内容”写入 messages**。
- system 卡片（clarify/pending/error）建议 **不要写入 messages**，避免污染上下文。
- 流式生成中：
  - UI 先插入一条 `assistant.loading` 消息
  - token 到来后只更新这一条消息的 `content`
  - done 后再把最终 content 作为 assistant 消消息写入 messages

#### 9.2.2 Clarify 场景的 messages 处理

当收到 `status=clarify`：

- UI 展示 clarify 卡片。
- 用户回答澄清（选项/输入）后：
  1) 把用户选择作为一条 **user 消息** 追加到展示列表
  2) 同时把该 user 消息写入 `messages`（role=user）
  3) 重新调用接口。

> 注意：不要把 clarify_question 的文本作为 assistant 写入 messages，否则后端会把“系统问题”当成上一轮回答。

#### 9.2.3 pending_review 场景的 messages 处理

当收到 `status=pending_review`：

- UI 为当前轮追加一条 assistant 的 pending 消息（固定文案）。
- **不建议**将 pending 文案写入 messages。
- 若用户继续提问：仍可继续发起，但建议 UI 给予风险提示（P1 优化）。

---

### 9.3 流式渲染与中断（SSE / ReadableStream）

当前后端 `stream=true` 返回 `text/event-stream`，事件：
- `token`：content 分片
- `done`：返回 evidence/trace_id/quality_decision
- `error`：错误

#### 9.3.1 前端状态机（流式）

1) 用户发送 → 追加 user 消息
2) 立即插入 assistant 消息（status=loading，content=""）
3) 接收 token：持续 `append(content)`
4) 接收 done：
   - status=normal
   - 写入 evidence / trace_id / quality_decision
   - 解锁输入框

#### 9.3.2 中断（Abort）规范

支持用户点击“停止生成”：

- 通过 `AbortController` 中断 fetch
- 中断后把当前 assistant 消息标记为：
  - status=normal
  - 在内容尾部追加：`\n\n（已停止生成）`

> 如果中断发生在很早阶段（尚无 token），可将该 assistant 消息替换为 error 卡片或直接移除。

---

### 9.4 滚动策略（Streaming + 用户手动滚动）

目标：
- 流式生成时默认自动滚动到底部
- 但用户手动上滑查看历史时，不强制抢焦点

#### 9.4.1 推荐实现（伪代码）

```ts
let autoScrollEnabled = true;

function onScroll(container: HTMLElement) {
  // 离底部 > 120px 认为用户在看历史
  const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
  autoScrollEnabled = distanceToBottom < 120;
}

function onTokenAppend(container: HTMLElement) {
  if (autoScrollEnabled) {
    container.scrollTop = container.scrollHeight;
  } else {
    showFloatingButton('回到底部');
  }
}
```

并在“回到底部”按钮点击后：
- `autoScrollEnabled = true`
- `scrollTop = scrollHeight`

---

### 9.5 trace_id 展示与复制

后端响应 `data.trace_id` 存在，用于排障。

#### 9.5.1 展示策略

- 默认不展示（避免干扰用户）
- debug 模式展示在 assistant 气泡底部，例如：
  - `Trace: trace-abc123`（可点击复制）

#### 9.5.2 复制交互

- 点击 trace_id → 复制到剪贴板
- 成功 toast：`已复制 trace_id`
- 失败 toast：`复制失败，请手动选择`

---

### 9.6 证据点击弹窗（Evidence Modal）

#### 9.6.1 目标

- 用户点击“参考来源”可快速了解答案依据
- 不强制跳转外链（可弹窗预览 + 跳转全文）

#### 9.6.2 UI 规范

- 默认展示：
  - `title`（主标题）
  - `source`（如果有）
  - `url`（按钮：打开原文）
  - `document_id/chunk_id`（debug 才展示）

弹窗结构：

- Header：`参考来源`
- Body：列表（可搜索/可折叠，P1）
- Footer：`打开原文`（新窗口） + `关闭`

#### 9.6.3 行为

- 点击 evidence 行：打开弹窗
- 弹窗内点击“打开原文”：`window.open(url)`

---

### 9.7 Loading / Skeleton 规范

- 非流式：
  - 发送后展示 assistant loading 骨架
  - 返回后替换为 content
- 流式：
  - 首 token 到来前展示 loading
  - 首 token 到来后自动切到“逐字出现”样式

> 建议为 loading 状态提供超时提示（例如 15s 无返回时提示“网络较慢”）。

---

### 9.8 边界条件与兼容性要求

#### 9.8.1 空内容

- `response_content` 为空：
  - 展示兜底文案：`暂时无法生成回答，请换一种问法。`

#### 9.8.2 evidence 缺字段

- evidence.item.title/url 缺失：
  - title 缺失：展示 `未命名来源（document_id）`
  - url 缺失：隐藏“打开原文”按钮

#### 9.8.3 messages 超长

- 建议减少上行 messages 数量（例如最近 20 条）
- 超出部分由前端截断，避免请求体过大

---

## 10. 版本后续迭代建议（w.3.1.0+）

- 审核回查接口（pending → approved/rejected）
- 证据预览（知识 chunk 摘录展示）
- 更精细的风险提示（R2 时 UI 强提示）
- “继续生成”与“追问”按钮

---

> 如需补充：UI 原型图、组件规范（Figma）、审核回查 API，请在 w.3.1.0 版本迭代。

## 11. 需要后端/产品确认的开放问题（建议提交前务必对齐）

> 这一节用于避免前端开发到一半才发现协议/交互缺口。

1) **OpenAPI schema 与实际 status 不一致**：
   - OpenAPI 对 `status` 的描述目前偏简（`success|error`），但后端实际会返回 `clarify/pending_review`。
   - 建议后端在后续版本更新 schema 描述；当前前端按 PRD 兼容即可。

2) **risk_level 的枚举与含义**：
   - PRD 示例：`R0|R1|R2`。
   - 需要 PM 确认各档位对应的 UI 提示强度与文案模板（尤其是 R2）。

3) **clarify_question 的字段固定性**：
   - 当前为 `dict`（松类型）。
   - 建议产品/后端确认：是否只会出现 `question/options/required`，以及是否存在多题/多阶段澄清。

4) **pending_review 的后续动作**：
   - 当前 out-of-scope（无审核结果回查接口）。
   - 需要产品确认：前端是否需要“刷新/轮询/消息推送”的占位设计。
