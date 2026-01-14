# w.2.3.1 前端 PRD（默认身份补齐 & RAG 可用性修复）

> 版本：w.2.3.1
>
> 日期：2026-01-14
>
> 依赖：后端 `reasoning_engine`（`/api/knowledge/*`、`/api/v1/chat/context`）

本 PRD 面向前端交付：用于推进“知识上传调试 + 可召回问答”联调闭环，重点解决 **`app_id/user_id` 缺失导致的 RAG 命中为 0**。

---

## 0. TL;DR

前端将 `DEFAULT_APP_ID="pk"`、`DEFAULT_USER_ID="10001"` 作为**兜底身份**，在以下请求发起前统一补齐缺失字段：

- Knowledge 上传：`POST /api/knowledge/documents/upload`（`multipart/form-data`）
- Knowledge 列表：`GET /api/knowledge/documents?user_id=...`
- Chat（SSE/非 SSE 都适用）：`POST /api/v1/chat/context`

**核心目标**：在后端 `KNOWLEDGE_SCOPE=app` 的配置下，保证“上传写入的 `app_id`”与“chat 检索时使用的 `app_id`”一致，从而恢复知识召回链路。

---

## 1. 背景与问题说明（Why）

### 1.1 现象

当前联调中出现：

- 上传成功、入库成功（`knowledge_uploads.status=indexed`）
- 但调用 `/api/v1/chat/context` 时无知识召回（`candidates=0` / `used=false`）

### 1.2 根因

后端知识检索在 `scope=app` 时会做强过滤：

- `knowledge_uploads.app_id = request.app_id`

而前端若：

- 上传时不传 `app_id` → `knowledge_uploads.app_id` 为空（`NULL`）
- chat 时不传 `app_id` → 后端默认值为 `default_app`（见后端实现：`api/routes/chat_context.py::_build_identity()`）

最终导致：

- `NULL != default_app` → `scope=app` 下候选永远为 0。

> 备注：该问题不依赖向量索引是否存在；即便顺序扫描也会因为过滤条件不命中而返回 0。

---

## 2. 版本范围（Scope）

### 2.1 ✅ 本版本要做

1) **默认身份补齐（核心）**

- 缺省时补齐：`app_id=pk`、`user_id=10001`
- 覆盖 Knowledge 上传/列表与 Chat 请求

2) **UI 展示“实际用于请求”的身份字段（可观测性）**

- 在左侧 Knowledge Upload 区域明确展示：
  - `user_id`
  - `app_id`
  - `conversation_id`（若有）

3) **继承 w.2.3.0 的上传体验与错误提示**

- 保持“选择文件并上传”一键上传
- 保持失败原因友好提示 + raw error 展示

### 2.2 ❌ 本版本不做

- 鉴权/权限/多租户策略
- 知识召回可视化（recall/rerank/注入）UI 细化
- OCR 支持
- 删除/编辑/下载知识文件

---

## 3. 默认身份策略（前端 contract）

### 3.1 默认值

- `DEFAULT_APP_ID = "pk"`
- `DEFAULT_USER_ID = "10001"`

### 3.2 注入优先级（从高到低）

1. UI/配置显式输入（若未来支持）
2. 调用侧显式传入
3. 默认值（本 PRD）

### 3.3 可选增强（建议，但不强制）

支持通过环境变量覆盖默认值（便于多人联调）：

- `NEXT_PUBLIC_APP_ID` 覆盖 `DEFAULT_APP_ID`
- `NEXT_PUBLIC_USER_ID` 覆盖 `DEFAULT_USER_ID`

---

## 4. 接口定义（联调真源 + 字段名要求）

> 重要：**字段名必须使用 snake_case：`user_id` / `app_id`**。
>
> 后端 `ChatInput` 的字段为 `user_id`、`app_id`，不是 `userId/appId`。

### 4.1 Upload

- **POST** `/api/knowledge/documents/upload`
- Content-Type: `multipart/form-data`
- Form fields：
  - `file` (required)
  - `user_id` (required) —— 缺省则注入 `10001`
  - `conversation_id` (optional)
  - `app_id` (optional) —— 缺省则注入 `pk`
  - `tags` (optional, comma-separated)

> 对齐后端实现：`api/routes/knowledge_documents.py::upload_document()`。

### 4.2 List

- **GET** `/api/knowledge/documents?user_id=...&limit=30&offset=0`
- Query 参数：
  - `user_id` —— 缺省则注入 `10001`

> 对齐后端实现：`api/routes/knowledge_documents.py::list_uploads()`。

### 4.3 Detail

- **GET** `/api/knowledge/documents/:upload_id`

### 4.4 Chat Context（关键链路）

- **POST** `/api/v1/chat/context`
- JSON body（建议最小字段）：
  - `user` (required)
  - `session_id` (recommended)
  - `stream` (default true)
  - `user_id`（缺省注入 `10001`）
  - `app_id`（缺省注入 `pk`）

> 对齐后端实现：`api/routes/chat_context.py::ChatInput` 与 `::_build_identity()`。

---

## 5. 后端对齐说明（前端必须知晓的行为）

### 5.1 `scope=app` 的强过滤

后端 retrieval 在 `scope=app` 时强制：

- `knowledge_uploads.app_id = request.app_id`

实现位置：`services/knowledge/retrieval.py`。

因此：

- 新上传数据必须写入 `app_id`
- chat 请求必须带 `app_id`

### 5.2 embedding 可用性

若后端未配置 embedding（`EMBEDDING_API_URL`），知识召回会直接 `embedding_unavailable`。

该问题不属于本 PRD 的前端改动范围，但验收时需确保后端 embedding 可用。

---

## 6. 验收标准（DoD）

### 6.1 Upload / List

- [ ] 上传请求即使调用侧不传 `user_id/app_id`，前端也会写入默认值（Network 可见）
- [ ] 上传成功后列表自动刷新
- [ ] 列表请求 querystring 中 `user_id=10001`
- [ ] 左侧 Knowledge 区域展示 `user_id/app_id/conversation_id`，且与实际请求一致

### 6.2 Chat + RAG 闭环（建议“真 E2E”验收）

- [ ] chat 请求即使调用侧只传 `session_id`，前端最终 body 也包含 `user_id=10001`、`app_id=pk`
- [ ] 在后端 `KNOWLEDGE_SCOPE=app` 环境下：
  - [ ] 新上传文档（`app_id=pk`）入库 `indexed` 后
  - [ ] 发起 chat 能召回（后端返回 `context_debug.knowledge.used=true` 且 `snippets` 非空）
  - [ ] 使用 `turn_id` 调用 `/api/knowledge/citations/turn_db`，能查到 `rag_enabled=true` 且 `chunk_count > 0`

---

## 7. 风险与排查建议

1) **历史上传数据 `app_id=NULL`**

- 在 `KNOWLEDGE_SCOPE=app` 下无法命中。
- 解决方式：
  - 方案 A：联调阶段临时设后端 `KNOWLEDGE_SCOPE=global`
  - 方案 B：对历史数据做一次性迁移，把 `knowledge_uploads.app_id` 更新为 `pk`

2) **字段命名不一致导致“假修复”**

- 如果前端注入 `userId/appId`（camelCase），后端不会读取。
- 必须发送 `user_id/app_id`（snake_case）。

3) **embedding 不可用**

- 若后端未配置 `EMBEDDING_API_URL`，召回会失败并给出 `embedding_unavailable`。

4) **向量索引缺失（性能风险）**

- 本版本不要求索引；只要求功能链路正确。

---

## 8. 附录：后端实现点速查

- Upload：`api/routes/knowledge_documents.py::upload_document()`
- List/Detail：`api/routes/knowledge_documents.py::list_uploads()` / `::get_upload()`
- Chat：`api/routes/chat_context.py::chat_context()`
- identity 默认值：`api/routes/chat_context.py::_build_identity()`
- RAG scope 过滤：`services/knowledge/retrieval.py::retrieve_by_embedding()`
- `turns.rag_chunk_ids`（JSONB array）：`api/routes/chat_context.py::_persist_memory_actions()`
- citations 回源：`api/routes/knowledge_citations.py::/turn_db`
