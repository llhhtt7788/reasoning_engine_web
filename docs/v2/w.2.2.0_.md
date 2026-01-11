下面给出 **v2\.2\.0「知识上传入库（PDF→Text→Chunk→Embedding→DB）」前端 PRD**（面向 Web 管理页/内嵌面板均可），目标是让前端能完整对接上传与状态展示，并为后续 **Agentic RAG** 的“可追溯引用”打底。

---

## 1\. 背景与目标

### 1\.1 背景
后端已具备：
- 上传元信息表 `knowledge_uploads`（含 `status`、`error_message`）
- ingestion 生成表：`knowledge_documents` / `knowledge_chunks` / `knowledge_embeddings`
- API：上传、上传列表、上传详情（接口路径以当前实现为准）

### 1\.2 目标（v2\.2\.0）
- 用户可上传 PDF 作为知识库素材
- 前端可展示每个上传的 **处理状态**：`stored` → `indexing` → `indexed` / `failed`
- 失败原因可见（例如扫描件需要 OCR）
- 成功后能看到 **摘要信息**（页数 / chunk 数 / embedding model 等，若后端已返回；否则用占位策略）

### 1\.3 非目标
- 不做知识库检索 UI（召回/问答留到后续）
- 不做删除/编辑/权限管理（可先隐藏入口）
- 不做 OCR 上传引导流程（仅展示后端提示）

---

## 2\. 术语与状态机

### 2\.1 Upload 状态（来自 `knowledge_uploads.status`）
- `stored`：文件已落盘、入库 metadata 完成，尚未开始解析
- `indexing`：正在解析/切分/embedding/入库
- `indexed`：入库成功，可用于后续检索
- `failed`：处理失败，查看 `error_message`

### 2\.2 关键错误码（前端展示文案映射）
- `suspect_scanned_pdf_need_ocr`：疑似扫描件 PDF，需 OCR（本版本不支持）
- 其他错误：展示通用失败 + 原始 `error_message`（可折叠）

---

## 3\. 用户故事（User Stories）
1. 作为用户，我上传一个 PDF，能立刻看到记录，并知道它在处理。
2. 作为用户，我能在列表里看到处理进度最终成功或失败。
3. 作为用户，失败时我能知道原因（例如扫描件需要 OCR）。
4. 作为后续 Agentic RAG，chunk 必须带页码追溯（前端先展示“可追溯”字段占位，后续版本可扩展到引用高亮）。

---

## 4\. 页面与信息架构

### 4\.1 页面 1：知识库上传与列表（/knowledge）
**模块 A：上传区**
- 文件选择（仅允许 `.pdf`；若后端允许 txt/md 可先不暴露）
- 关联信息：
    - `user_id`（必填；通常从登录态注入，不展示输入框）
    - `app_id`（可选；从上下文注入）
    - `conversation_id`（可选；从会话注入）
    - `tags`（可选：输入框/多选标签）
- 上传按钮
- 上传中状态提示（进度条可选：仅上传进度；ingestion 进度不可精确，仅展示状态轮询）

**模块 B：上传记录列表**
每行展示：
- 文件名 `original_filename`
- 创建时间 `created_at`
- 大小 `size_bytes`（格式化）
- 状态 Badge：stored/indexing/indexed/failed
- 失败提示（failed 时显示 `error_message` 的短摘要）
- 操作：
    - “查看详情”
    - （可选）“重试入库”按钮：若后端有 `POST /.../{upload_id}/ingest`（没有则先隐藏）

状态轮询策略：
- 对 `stored` / `indexing` 的记录轮询刷新
- `indexed` / `failed` 停止轮询

### 4\.2 页面 2：上传详情（/knowledge/:upload_id）
展示分区：
- 基本信息：文件名、sha256、size、tags、创建时间、当前 status
- 处理信息：
    - `error_message`（failed 时）
    - （若后端支持）`page_count`、`chunk_count`、`embedding_model`、`dims`
- 引导信息：
    - failed 且 error 为扫描件：提示“当前不支持 OCR，请上传可复制文字的 PDF 或等待后续版本”

---

## 5\. 交互流程

### 5\.1 上传流程
1) 用户选择 PDF → 点击上传
2) 前端调用上传接口
3) 上传接口成功后立即返回 `upload_id` 且 `status=stored`
4) 前端将记录插入列表顶部，并开始轮询该 `upload_id` 的详情/列表直到状态终态

### 5\.2 状态刷新
- 推荐：列表接口轮询（批量更新更省请求）
- 轮询间隔建议：2s（前 30s）→ 5s（之后），最长 5 分钟后停止并提示“可手动刷新”
- 若接口返回 404 或网络失败：指数退避重试 3 次

---

## 6\. API 对接（以当前后端为准）

> 接口路径以实现为准；以下以会话上下文里出现的版本：
> - `POST /api/knowledge/documents/upload`
> - `GET /api/knowledge/documents?user_id=...&limit=...&offset=...`
> - `GET /api/knowledge/documents/{upload_id}`

### 6\.1 上传
- Method：POST
- Content\-Type：multipart/form-data
- 入参：
    - `file`：PDF
    - `user_id`：string（前端从登录态注入）
    - `conversation_id`：string（可选）
    - `app_id`：string（可选）
    - `tags`：string（可选，逗号分隔）或后端约定 JSON（以实现为准）
- 出参（最少使用字段）：
    - `upload_id`
    - `status`
    - `original_filename`
    - `size_bytes`
    - `sha256`
    - `created_at`（若有）

### 6\.2 列表
- 入参：`user_id` + `limit` + `offset`
- 出参：upload 数组，至少包含：
    - `upload_id`、`original_filename`、`status`、`error_message`、`created_at`

### 6\.3 详情
- 出参建议包含：
    - 上传基础字段（同上）
    - （可选增强）`document_id`、`page_count`、`chunk_count`、`embedding_model`、`embedding_dims`

---

## 7\. 前端状态模型（TypeScript）
- `UploadStatus = "stored" | "indexing" | "indexed" | "failed"`
- `KnowledgeUpload`：
    - `upload_id: string`
    - `original_filename: string`
    - `size_bytes: number`
    - `sha256: string`
    - `status: UploadStatus`
    - `error_message?: string | null`
    - `created_at: string`
    - `tags?: any`（按实际返回调整）
    - `page_count? / chunk_count? / embedding_model? / embedding_dims?`（可选）

---

## 8\. UI 规则（展示与文案）

### 8\.1 状态展示
- stored：灰色 “已保存，待处理”
- indexing：蓝色 “入库中”
- indexed：绿色 “已入库”
- failed：红色 “失败”

### 8\.2 错误展示
- 列表：显示 `error_message` 前 80 字符 + “详情”
- 详情页：完整 `error_message`（可折叠）

扫描件提示文案（示例）：
- 标题：无法解析（疑似扫描件）
- 说明：当前版本不支持 OCR，请上传可复制文字的 PDF；或等待后续版本支持 OCR。

---

## 9\. 权限与安全
- `user_id` 不允许用户手填（从登录态/后端 session 获取��
- 上传文件类型前端校验：仅 `.pdf`；大小限制与后端一致（例如 20MB）
- 不在前端存储任何密钥

---

## 10\. 验收标准（DoD）
- 能上传 PDF 并在列表中看到记录
- 列表/详情能正确展示 `stored/indexing/indexed/failed`
- `failed` 时能展示 `error_message`
- 对疑似扫描件错误能展示明确引导文案
- 轮询刷新不会造成页面卡顿（并发请求可控）

---