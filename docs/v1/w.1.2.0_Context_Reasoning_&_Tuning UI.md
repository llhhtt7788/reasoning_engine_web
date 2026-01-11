很好，这一步**非常关键**。
下面我会直接给你一份**可交付前端的完整 PRD**，明确标注为：

> **前端版本：w.1.2.0 · Context Reasoning & Tuning UI**

它是 **严格对齐后端 v1.6.0 的**，不臆造能力、不要求后端返工、不引入新页面（可选增强点我会标注）。

你可以 **原样交付前端启动开发**。

---

# PRD · Frontend

## w.1.2.0 · Context Reasoning & Tuning UI

---

## 0. 版本信息

* **前端版本号**：w.1.2.0
* **状态**：PRD / 待开发
* **依赖后端版本**：v1.6.0
* **依赖前端版本**：w.1.1.1（Context 可解释性基础 UI）
* **定位**：**工程调试与调优工具 UI（非用户功能）**

---

## 1. 版本定位（一句话）

> **w.1.2.0 的目标是：让工程师“看懂 Context 为什么这么选，并能安全地假设如果参数改变会发生什么”。**

这是一个 **工程工具版本**，而不是用户体验版本。

---

## 2. 设计原则（强约束）

### 2.1 本版本只做「解释与分析」

✅ 只读
✅ 不影响对话
✅ 不触发 embedding / rerank
✅ 不改写任何数据库

❌ 不新增主对话 UI
❌ 不做自动调参
❌ 不做在线学习

---

### 2.2 所有 UI 数据 = 后端事实数据

前端 **不得自行推断 / 补逻辑**：

* 不重新计算分数
* 不猜 recall/rerank 结果
* 不补选中原因

> 前端只是 **Context Engine 决策过程的“可视化终端”**。

---

## 3. 页面结构（不新增页面）

### 3.1 页面布局（延续现有）

```
┌───────────────┬───────────────────────────┬────────────────────────────┐
│ LangGraph     │ Chat / Messages            │ Context Debug Panel        │
│ Path          │                            │ (增强)                     │
│ (左)          │ (中)                       │ (右)                       │
└───────────────┴───────────────────────────┴────────────────────────────┘
```

📌 **w.1.2.0 只增强右侧 Context Debug Panel**

---

## 4. Context Debug Panel（w.1.2.0）

右侧面板拆为 **4 个可折叠区块**（默认展开前 2 个）：

1. Context Summary（增强）
2. Context Reasoning Trace（新增 ⭐）
3. Backend Status（保持）
4. Selected Memories（增强）

---

## 5. 模块一：Context Summary（增强）

### 5.1 展示目标

让工程师 **第一眼判断 Context 是否“工作正常”**。

---

### 5.2 展示内容

#### 5.2.1 状态徽章（Badge）

| 项         | 来源                           | 展示       |
| --------- | ---------------------------- | -------- |
| Embedding | context_debug.embedding_used | ON / OFF |
| Rerank    | context_debug.rerank_used    | ON / OFF |
| Recalled  | context_debug.recalled_count | 数字       |
| Injected  | injected_memory_ids.length   | 数字       |

---

### 5.2.2 状态提示（自动规则）

前端根据 **明确规则** 显示提示（不自由发挥）：

* 🟡 `embedding_used=true && recalled_count=0`
  → “无可用记忆（Embedding 命中但无召回结果）”

* 🟠 `recalled_count>0 && injected=0`
  → “记忆被全部过滤（可能是阈值或权重问题）”

* 🟢 `injected>0`
  → “上下文注入生效”

---

## 6. 模块二：Context Reasoning Trace（新增）

### 6.1 数据来源（后端 v1.6.0）

```ts
context_debug.context_reasoning.steps[]
```

---

### 6.2 展示目标

**把 Context 的“黑盒筛选”变成工程可读的决策流水线**。

---

### 6.3 UI 形式（推荐）

**纵向 Step Timeline**

```
[Embedding]
input: 1 query
↓
[Recall]
128 → 12   (top_k=12)
↓
[Rerank]
12 → 6     (threshold=0.75)
↓
[Scoring]
formula: 0.5R + 0.2V + 0.2I + 0.1T
↓
[Assembly]
6 → 3 injected
```

---

### 6.4 每个 Step 展示字段

  | 字段            | 来源                 |
  | ------------- | ------------------ |
  | stage         | step.stage         |
  | input_count   | step.input_count   |
  | output_count  | step.output_count  |
  | rule / params | step.rule / params |

📌 **不展示任何文本内容**

---

## 7. 模块三：Backend Status（保持 + 轻增强）

### 7.1 数据来源

```ts
context_debug.context_backends
```

---

### 7.2 展示方式

表格：

| Module    | Backend  | Status   | Fallback | Reason  |
| --------- | -------- | -------- | -------- | ------- |
| memories  | pgvector | DEGRADED | true     | timeout |
| embedding | http     | HEALTHY  | false    | —       |

---

### 7.3 颜色规范

| Status      | 颜色  |
| ----------- |-----|
| HEALTHY     | 绿色  |
| DEGRADED    | 黄色  |
| UNAVAILABLE | 红色  |
| unknown     | 灰色  |

---

## 8. 模块四：Selected Memories（增强）

### 8.1 数据来源（优先级）

1. `context_debug.memory_selected[]`
2. fallback：`context_debug.memories`（仅兼容）

---

### 8.2 UI 形式

**可折叠卡片列表**

#### 折叠态（默认）

```
[Rank #1]  final_score: 0.82   source: turn
```

#### 展开态

* memory content（文本）
* Score Breakdown（条形图或表格）：

    * rerank
    * vector
    * importance
    * recency
* Selection Reason：

    * passed_recall
    * passed_rerank
    * dropped_reason（若存在）

---

## 9. Context Replay（入口占位，不强制）

### 9.1 行为定义

* 若后端 replay API 可用：

    * 显示 “Replay Context Decision” 按钮
* 点击后：

    * 展示一个 Modal / Drawer
    * 展示当轮 decision 的：

        * memory_scores
        * rank
        * selected 状态

📌 **不要求新页面**

---

## 10. Dry-run Tuning（v1.6.0 UI 占位）

### 10.1 入口

Context Debug Panel 内：

```
[ Try Weight Simulation ]
```

---

### 10.2 行为

* 打开一个侧边抽屉
* 输入：

    * rerank / vector / importance / recency 权重
* 点击 Run：

    * 调用 `/services/context/tune`
* 展示：

    * Old selected
    * New selected
    * Diff（进入 / 移出）

📌 v1.6.0 仅要求 **基础 diff 列表，不要求图形化**

---

## 11. 前端实现约束（必须遵守）

1. 不缓存 context_debug
2. 不跨 turn 复用 reasoning
3. 不在前端计算 final_score
4. 所有状态 = 后端显式字段

---

## 12. 验收标准（DoD）

* [ ] Context Reasoning Trace 可完整展示
* [ ] Selected Memories 可看到 score breakdown
* [ ] Backend 状态与真实执行一致
* [ ] 无 context_reasoning 时 UI 优雅降级
* [ ] 不影响聊天性能

---

## 13. 一句话总结（可直接写在 PRD 封面）

> **w.1.2.0 是 Context Debug Panel 从“日志展示”升级为“工程调试与调优工具”的关键版本。**

