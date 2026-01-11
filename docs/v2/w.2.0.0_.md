# w.2.0.0 前端 PRD（后端对齐 · 可上线版）

> 时间：2026-01
> 
> 本 PRD 用于前端实现 Knowledge Engine 的 **Upload MVP**：做到“上传可用 + 元数据可追踪”，不假设 Recall / Chunk / Inject 能力。

---

## 1. 版本定位

**一句话**：w.2.0.0 是知识系统前端起点版本，只交付「上传 → stored → 可回显/可审计」，其余能力全部灰态占位。

### In Scope

- ✅ 左侧工作台新增 `📤 Knowledge Upload`（文件上传入口）
- ✅ 固定对齐后端接口：`POST /api/knowledge/documents/upload`（multipart/form-data）
- ✅ 上传成功后展示后端完整返回（upload_id、sha256、stored_path 等）
- ✅ 前端联调调试：把 **POST 请求数据**写入 `logs/`（可开关），用于核对真实发送内容
  - `/api/proxy`（聊天 SSE 代理）
  - `/api/knowledge/documents/upload`（知识上传代理）

### Out of Scope（明确不做）

- ❌ Knowledge Recall/检索、Chunk 列表、Rerank/Score 调度
- ❌ Upload 进度/轮询/Job 状态
- ❌ 删除/编辑/权限
- ❌ 任何“前端推断是否使用知识”的逻辑

---

## 2. 页面与布局

### 2.1 Workbench 三栏布局（延续）

- 左：LangGraph 决策路径（`DecisionPathSidebar`）
  - 顶部增加 `📤 Knowledge Upload`
- 中：Chat（MessageList + InputBar）
- 右：Reasoning + Context Debug（`ReasoningSidebar` / `ContextDebugPanel`）

### 2.2 左侧分栏宽度

- 已实现：拖拽调整宽度 + localStorage 持久化 + hover tooltip 显示当前宽度（px）

---

## 3. Knowledge Upload（MVP 核心）

### 3.1 UI 交互

位置：左侧 `DecisionPathSidebar` 顶部

内容：
- 文件选择（file input）
- tags 输入（逗号分隔，可选）
- Upload 按钮
- 成功后回显 Response JSON（原样展示，不做推断）

### 3.2 接口（必须对齐后端）

`POST /api/knowledge/documents/upload`

- `Content-Type: multipart/form-data`

Form fields：
- `file` ✅
- `user_id` ✅
- `conversation_id` ⭕（可选）
- `app_id` ⭕（可选）
- `tags` ⭕（逗号分隔）

Response（示例）：

```json
{
  "upload_id": "u_20260110_061343_xxxxxxxx",
  "status": "stored",
  "original_filename": "handbook.pdf",
  "stored_filename": "u_xxx__handbook.pdf",
  "content_type": "application/pdf",
  "size_bytes": 123456,
  "sha256": "...",
  "stored_path": "upload/documents/u_xxx__handbook.pdf",
  "meta": {
    "user_id": "u1",
    "conversation_id": "c1",
    "app_id": "app",
    "tags": ["guideline", "diabetes"]
  }
}
```

### 3.3 状态约束

- 本版本只认 `status = stored`（后端返回什么就展示什么）
- 不轮询、不推断、不展示“使用知识情况”

---

## 4. 前端调试：请求日志落盘（logs/）

### 4.1 目标

在联调时，工程师可直接在 `logs/` 中查看“前端实际 POST 出去的数据”，用于排查：
- identity 字段是否带齐
- tags/user_id 是否正确
- chat/context 请求体是否符合预期

### 4.2 支持的路由（都支持）

- `/api/proxy`（SSE chat 代理）
- `/api/knowledge/documents/upload`（upload 代理）

### 4.3 开关与配置（环境变量）

- `ENABLE_REQUEST_LOGS=1 | true`：开启写日志（默认关闭）
- `REQUEST_LOG_DIR=logs`：日志目录
- `REQUEST_LOG_MAX_BYTES=262144`：最大日志大小（默认 256KB，超出标记 TRUNCATED）

### 4.4 日志文件格式

每次请求生成一个 JSON 文件：
- `ts`：ISO 时间
- `route`：路由标识
- `method`
- `headers`：小写 key（authorization 最小脱敏）
- `body`：
  - JSON 请求：记录脱敏后的 JSON
  - multipart 上传：不保存二进制内容，仅保存摘要（bytes、content_type）

---

## 5. 验收（DoD）

- [ ] 左侧可上传文件；成功后展示后端返回 JSON
- [ ] 调用路径固定：`/api/knowledge/documents/upload`
- [ ] 开启 `ENABLE_REQUEST_LOGS` 后：
  - [ ] `/api/proxy` 产生 logs 文件
  - [ ] `/api/knowledge/documents/upload` 产生 logs 文件（multipart 摘要）
- [ ] `npm run build` 通过

