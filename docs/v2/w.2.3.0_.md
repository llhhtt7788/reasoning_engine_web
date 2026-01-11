# w.2.3.0 前端 PRD（Knowledge Upload Debug · 左侧集成增强）

> 日期：2026-01-11
> 
> 本版本目标：把知识上传调试能力放到左侧（LangGraph 决策路径侧栏），并把上传体验与失败可读性打磨到可用状态；不引入安全策略、不做召回/注入推断。

---

## 1. 版本范围（Scope）

### 1.1 ✅ 本版本要做

1) **左侧栏（DecisionPathSidebar）增加 Knowledge Upload 区域**
- 位置：左侧（LangGraph 决策路径）顶部区域
- 组件：`KnowledgeUploadPanel` + `KnowledgeUploadsListPanel`

2) **上传交互简化：只保留一个入口**
- 仅保留按钮：**“选择文件并上传”**
- 行为：点击按钮打开系统文件选择框；选择文件后立即发起上传请求
- 上传过程中按钮置灰并显示 `Uploading…`

3) **上传成功后刷新列表（无需手动点击刷新）**
- 上传成功后触发列表刷新，确保新记录立即可见

4) **失败原因前端友好提示（并保留原始错误便于排查）**
- UTF-8 编码错误：`invalid byte sequence for encoding "UTF8"`（例如 0x00）
- 扫描 PDF：`suspect_scanned_pdf_need_ocr`
- 向量维度提示（已知限制，可忽略）：`expected 4000 dimensions, not 4096`（pg 索引维度上限导致后端降维，后续迁移 Milvus）

5) **接口路径对齐（已统一）**
- Context 相关：全部使用 `/api/context/…`
- Knowledge 上传：`/api/knowledge/documents/upload`
- Knowledge 列表：`/api/knowledge/documents?user_id=...`
- Knowledge 详情：`/api/knowledge/documents/:upload_id`

6) **前端请求日志落地到 logs（用于接口调试）**
- 触发条件：前端请求后端（尤其 POST）时
- 落盘目录：`/logs/`
- 文件命名建议：`{ISO}_{METHOD}_{path_sanitized}.json`
- 记录内容：时间戳、method、url、headers（脱敏）、request body 元信息、response status、response body（可截断）

> 注：该能力优先用于 `POST /api/knowledge/documents/upload` 调试。

### 1.2 ❌ 本版本不做

- 安全策略（鉴权、权限、脱敏策略）
- 知识召回（recall）、chunk 注入、rerank 可视化
- 后端解析/embedding/job 进度条（轮询/streaming）
- 删除/编辑/下载知识文件

---

## 2. UI 设计（左 / 中 / 右 三栏不变）

### 2.1 左侧（LangGraph 决策路径侧栏）

- 顶部：`📤 Knowledge Upload`
  - tags 输入（逗号分隔）
  - 主按钮：`选择文件并上传`
  - 展示：`user_id` / `conversation_id`
  - 下方回显：上传接口 response JSON

- 其下：`📚 Knowledge Uploads`
  - 列表：展示 filename / size / id / created_at / status
  - 失败项：展示友好提示（标题+建议）+ 原始报错短摘要
  - 支持展开详情：sha256 / stored_path / embedding_model / embedding_dims / chunk_count / page_count

---

## 3. 交互/状态机（前端约束）

### 3.1 上传按钮

- 初始：按钮可点击；无文件选择 state
- 点击：触发隐藏的 `<input type="file" />`
- 选择文件：立即上传（FormData）
- 上传中：按钮 disabled + `Uploading…`
- 上传成功：
  - 回显 response
  - 触发列表刷新（事件或 store）
- 上传失败：显示错误信息；不推断后端状态

### 3.2 失败原因映射（DoD）

- 若匹配到已知错误：展示中文标题与建议
- 无法匹配：展示 “失败原因：{shortError}”
- 原始错误保留在 `hint` 字段（当前 UI 以短文本展示；详情页可展开完整 error_message）

---

## 4. 接口定义（联调真源）

### 4.1 Upload

- **POST** `/api/knowledge/documents/upload`
- Content-Type: `multipart/form-data`
- Form fields：
  - `file` (required)
  - `user_id` (required)
  - `conversation_id` (optional)
  - `app_id` (optional)
  - `tags` (optional, comma-separated)

### 4.2 List

- **GET** `/api/knowledge/documents?user_id=...&limit=30&offset=0`

### 4.3 Detail

- **GET** `/api/knowledge/documents/:upload_id`

---

## 5. 工程实现要点（当前代码落点）

- `components/KnowledgeUploadPanel.tsx`
  - 只保留“选择文件并上传”
  - `onChange` 里 `e.target.value=''`，避免无法重复选择同一文件
  - ✅ 上传失败即时提示：对 UTF-8 / OCR / dims mismatch 做前端友好映射，并保留 raw error 可展开

- `components/DecisionPathSidebar.tsx`
  - `KnowledgeUploadPanel` 放左侧
  - 上传完成后触发 `knowledgeUploads:changed` 事件

- `components/KnowledgeUploadsListPanel.tsx`
  - 监听 `knowledgeUploads:changed` 并 `refresh()`
  - 失败原因映射：UTF-8 / OCR / dims mismatch

- `lib/knowledgeUpload.ts`
  - `uploadKnowledgeDocument()` / `listKnowledgeUploads()` / `getKnowledgeUploadDetail()`

- `types/knowledge.ts`
  - `KnowledgeUploadResponse` 使用 alias（避免空接口 lint error）

---

## 6. 验收标准（DoD）

- [ ] 左侧栏存在 Knowledge Upload + Uploads 列表
- [ ] 点击“选择文件并上传”能弹出文件选择框
- [ ] 选择文件后立即上传（无额外“提交”步骤）
- [ ] 上传成功后列表自动刷新，新记录立即可见
- [ ] `invalid byte sequence for encoding "UTF8"` 显示友好提示
- [ ] `suspect_scanned_pdf_need_ocr` 显示友好提示
- [ ] `expected xxxx dimensions, not yyyy` 显示友好提示
- [ ] 不引入任何“知识是否被使用”的前端推断

---

## 7. 风险与排查建议

- 维度提示（expected 4000 / 4096）：当前为 pg 索引维度上限导致后端降维，使用无区别，可忽略；后续预计迁移 Milvus
- UTF-8 报错：文档可能含 0x00 等非法字节，建议重新导出为 UTF-8 或标准 PDF
- 扫描件：当前不支持 OCR（后续版本再支持）
