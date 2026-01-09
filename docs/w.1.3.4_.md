## 前端需要更新的 PRD（v1\.9\.1：Selection proxy 分析接口）

### 1\) 背景 / 目标
- 运营/调参需要快速观测某个 `conversation` 下各条 `memory` 在最近 N 天内被 selection proxy 选中的次数，从而辅助理解 worker 为什么把某些记忆标为 `stale`\。
- 前端新增一个“分析/观测”页面或面板，调用后端聚合接口展示计数排行与筛选能力。

---

### 2\) 接口变更（新增）
- 方法：`GET`
- 路径：`/api/context/memory/selection_counts`
- Query 参数：
    - `conversation_id`\: string（必填）
    - `lookback_days`\: number（可选，默认 14）
    - `limit`\: number（可选，默认按后端实现；文档示例 500）

---

### 3\) 返回结构（前端使用契约）
- 成功（有数据）：
    - `status`: `ok`
    - `items`: `[{ memory_id: string, count: number }, ...]`（按 `count` 降序）
- 不可用/无数据（当前实现语义合并）：
    - `status`: `unavailable`
    - `items`: `[]`
    - 说明：可能是 Postgres 不可用（fallback）或聚合为空（后续版本可细分）

---

### 4\) 前端功能需求
1. **筛选控件**
    - `conversation_id` 输入框（必填，支持粘贴）
    - `lookback_days` 数字输入（默认 14）
    - `limit` 数字输入（可选，带默认值）
    - 查询按钮（触发请求）

2. **展示**
    - 列表/表格：`memory_id` + `count`
    - 支持按 `count` 默认降序展示（后端已排序也可前端兜底）
    - 空态：
        - `status=unavailable` 显示“暂无统计或后端不可用”
        - `items=[]` 显示空列表占位

3. **交互**
    - `memory_id` 支持一键复制
    - 可选：点击 `memory_id` 跳转到 memory 详情（如果已有详情页/弹窗能力）

4. **错误处理**
    - 网络错误/500：toast 或错误栏提示
    - 400（缺少 `conversation_id` 等）：表单校验提示

---

### 5\) 埋点 / 日志（可选但建议）
- 记录查询参数：`conversation_id`、`lookback_days`、`limit`
- 记录返回状态：`ok`/`unavailable` 与 `items.length`

---

### 6\) 验收标准（前端）
- 给定有效 `conversation_id` 且后端可用：能正确展示 Top N 列表，计数为 number，排序正确。
- 后端不可用或无数据：页面明确提示 `unavailable`，不崩溃。
- 参数默认值生效：不填 `lookback_days` 时使用 14。