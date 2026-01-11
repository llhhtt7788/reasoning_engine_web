
---

# PRD w.1.3.0

## Intent-aware Context 可视化（前端）

---

## 0. 版本信息

| 项    | 内容                          |
| ---- | --------------------------- |
| 前端版本 | **w.1.3.0**                 |
| 对应后端 | v1.7.0                      |
| 状态   | PRD Final                   |
| 性质   | **工程调试 & 决策可视化升级（非 UI 重构）** |
| 目标用户 | 内部工程师 / 算法 / 平台开发           |

---

## 1. 背景与目标

### 1.1 背景（基于当前状态）

目前（w.1.2.x）前端已经可以展示：

* Context Summary
* Backend Status
* Selected Memories
* LangGraph Path（左侧）

**但在 v1.7.0 之后，后端发生了本质变化：**

* 是否使用上下文是**显式决策**
* LangGraph 中存在 **Intent → Policy → Use/Skip Context 的分支**
* `context_debug` 中新增了：

    * `intent`
    * `context_policy`
    * `context_execution = used | skipped`
    * skip_reason

👉 **如果前端不升级，v1.7.0 的核心价值是“看不见的”**

---

### 1.2 w.1.3.0 的核心目标

> **让工程师在前端一眼看懂：**
>
> 1️⃣ 用户意图是什么
> 2️⃣ 系统为什么用了 / 没用上下文
> 3️⃣ 这是“策略决定”，而不是“系统没记住”

---

## 2. 总体设计原则

### 2.1 不改整体布局

* **左侧**：LangGraph 决策路径（增强）
* **中间**：聊天流（不动）
* **右侧**：Context Debug Panel（升级）

---

### 2.2 强约束原则（必须遵守）

* ❌ 前端**不推断、不补算**任何逻辑
* ❌ 不根据字段缺失“猜测状态”
* ✅ **只渲染后端显式给出的字段**
* ✅ 所有 badge / 文案 **有固定映射规则**

---

## 3. 新增核心概念（前端侧）

### 3.1 Intent 可视化（新增一级概念）

Intent 是 v1.7.0 的“第一性决策信息”。

```ts
context_debug.intent = {
  name: "qa_stateless",
  confidence: 0.91
}
```

前端必须把它**显性展示**，而不是藏在 raw JSON。

---

### 3.2 Context Execution 状态（关键）

```ts
context_debug.context_execution = "used" | "skipped"
```

这是 **w.1.3.0 的核心 UI 状态源**。

---

## 4. 右侧 Context Debug Panel（结构升级）

### 4.1 Panel 结构（w.1.3.0）

Context Debug Panel 拆为 **5 个可折叠区块**：

1. **Intent & Policy（新增，默认展开）**
2. Context Summary（升级）
3. Reasoning Trace（沿用 w.1.2）
4. Backend Status（沿用）
5. Selected Memories（条件展示）

---

## 5. Intent & Policy 区块（新增，核心）

### 5.1 展示内容

#### Intent 行

```
Intent: qa_stateless   Confidence: 0.91
```

* Intent 名称：code font
* Confidence：百分比 badge（灰色）

---

#### Policy 行

```json
context_policy: {
  use_context: false,
  recall_enabled: false,
  write_memory: false,
  source: "config"
}
```

UI 规则：

* use_context = false → **红色 “Skip Context” Badge**
* source = config / default_fallback → 灰色标签

---

#### Execution 结论（重点）

当 `context_execution = "skipped"`：

> 🚫 **Context Skipped by Policy**
> This turn was intentionally handled without long-term context.

当 `used`：

> ✅ **Context Applied**

---

### 5.2 必须支持的 skip_reason 文案

```ts
skip_reason:
  | "intent_policy"
  | "policy_config"
  | "fallback"
```

映射文案固定：

| reason        | UI 文案                        |
| ------------- | ---------------------------- |
| intent_policy | Skipped due to intent policy |
| policy_config | Skipped by configuration     |
| fallback      | Skipped by system fallback   |

---

## 6. Context Summary（升级规则）

### 6.1 新状态判断优先级

**第一优先级：**

```
if context_execution === "skipped"
```

→ 显示：

> Context not applied (intent-driven)

**直接忽略 recalled / injected 数字**

---

### 6.2 非 skip 情况（沿用 w.1.2）

* embedding_used
* recalled_count
* injected_memory_ids.length

---

## 7. Selected Memories（条件渲染）

### 7.1 渲染规则（重要）

```
if context_execution === "skipped":
  不渲染整个 Selected Memories 区块
```

改为占位说明：

> No memories were considered because context was skipped by policy.

---

### 7.2 非 skip 时

* 沿用 w.1.2.0 的：

    * rank card
    * score breakdown
    * selection_reason

---

## 8. LangGraph Path（左侧增强）

### 8.1 新节点必须可见

在 DAG 中显示：

* IntentClassifierNode
* ContextPolicyNode
* SkipContextNode（如走到）

---

### 8.2 Skip 分支视觉规则

当走 SkipContextNode：

* 节点颜色：灰
* Edge label：`skip_context`
* Tooltip：`Skipped by intent policy`

---

## 9. 空状态与降级规则

### 9.1 Intent 缺失

```
if !context_debug.intent
```

显示：

> Intent not reported (legacy graph)

---

### 9.2 Policy 缺失

```
if intent exists && !context_policy
```

显示：

> Policy resolution unavailable

---

## 10. 不做的事（明确边界）

❌ 不提供 Intent 编辑
❌ 不提供 Policy 编辑
❌ 不在前端做 Tuning
❌ 不在前端重算上下文

---

## 11. 验收标准（DoD）

* [ ] 能清楚看到 Intent + Confidence
* [ ] 能明确区分 **“没记住” vs “刻意没用上下文”**
* [ ] Skip Context 时不再展示 Selected Memories
* [ ] LangGraph 左侧能看到 Skip 分支
* [ ] 所有状态来自后端字段，无前端推断

---

## 12. 一句话总结（给前端）

> **w.1.3.0 不是 UI 美化，而是把 v1.7.0 的“上下文决策权”真正交到工程师眼前。**

---

