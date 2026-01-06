

---

# PRD · w.1.3.1

## Intent-aware Context 可视化（Phase 1）

**版本号**：w.1.3.1
**状态**：Ready for Development
**依赖后端**：v1.7.2（Intent-aware Context Architecture）
**前置版本**：w.1.3.0 / w.1.2.x
**影响范围**：右侧 Context Debug Panel + 左侧 LangGraph Path
**定位**：

> 将 v1.7.2 的「Intent / Policy / Execution」真实决策结果**稳定、清晰、低侵入地呈现在前端**。

---

## 0. 版本定位（非常重要）

w.1.3.1 是一个 **“解释控制流”的前端版本**，而不是：

* ❌ 新交互设计版本
* ❌ 新页面版本
* ❌ 新业务功能版本

它的目标只有一个：

> **让工程师和 PM 能“一眼看懂：这一轮为什么用了 / 没用上下文”**

---

## 1. 背景与问题

在 v1.7.2 之前，前端只能**事后猜测**：

* recalled_count = 0 → 是没召回？还是被跳过？
* 没有 memories → 是没记忆？还是策略不让用？
* LangGraph 左侧空 → 是 bug？还是正确路径？

v1.7.2 后端已经明确给出：

* intent
* context_strategy
* context_execution（唯一真源）

👉 w.1.3.1 的任务是 **忠实呈现这些“控制流事实”**。

---

## 2. 设计原则（w.1.3.1 强约束）

1. **只展示后端显式字段**

    * ❌ 不前端推断
    * ❌ 不补逻辑
2. **Execution 优先于结果**

    * `context_execution.mode` > recalled_count
3. **UI 可降级**

    * v1.7.2 字段缺失 → 回退 w.1.2.x 行为
4. **不破坏现有结构**

    * 左 / 中 / 右整体布局不变
    * 只增强右侧 Debug Panel

---

## 3. 数据契约（前端必须遵守）

### 3.1 来自后端的关键字段（只读）

```ts
context_debug: {
  intent?: {
    type: string
    confidence?: number
    source?: string
    model?: string
  }

  context_strategy?: {
    use_context: boolean
    recall_enabled?: boolean
    rerank_enabled?: boolean
    write_memory?: string
    keep_recent_turns?: number
  }

  context_execution?: {
    mode: "used" | "skipped"
    skip_reason?: string
    keep_recent_turns?: number
  }

  memory_selected?: MemoryItem[]
}
```

⚠️ 前端 **不得** 通过 recalled_count / memories.length 判断是否 skipped。

---

## 4. UI 结构调整（右侧 Panel）

### 4.1 Context Debug Panel 分区（w.1.3.1）

右侧面板固定为 **5 个可折叠区块**：

1. **Intent & Policy（新增，默认展开）**
2. Context Summary（增强）
3. Reasoning Trace（若存在）
4. Backend Status（沿用）
5. Selected Memories（条件显示）

---

## 5. Intent & Policy 区块（核心新增）

### 5.1 展示内容

**Intent 行**

```
Intent: qa_stateless   [confidence: 62%]
```

* intent.type：主标题
* confidence：灰色 badge（可选）
* source/model：hover tooltip（可选）

---

**Policy 行**

以 Badge 形式展示：

| 字段                   | 样式          |
| -------------------- | ----------- |
| use_context=false    | 🔴 红色 Badge |
| use_context=true     | 🟢 绿色 Badge |
| recall_enabled=false | 灰色          |
| rerank_enabled=false | 灰色          |
| write_memory=off     | 灰色          |

---

**Execution 结论（最重要）**

```text
Context Skipped by Policy
```

或

```text
Context Applied
```

* 以 **Status Banner** 显示
* skipped 时必须展示 skip_reason（若有）

---

## 6. Context Summary 行为变化

### 6.1 判断规则（严格）

| 条件                       | Summary 显示                            |
| ------------------------ | ------------------------------------- |
| execution.mode = skipped | “Context not applied (intent-driven)” |
| execution.mode = used    | 正常展示 recall / inject 信息               |
| execution 缺失             | 回退旧逻辑                                 |

---

## 7. Selected Memories（条件渲染）

### 7.1 新规则

| execution.mode | 行为                     |
| -------------- | ---------------------- |
| used           | 正常显示 Selected Memories |
| skipped        | **整个区块隐藏**             |

隐藏时显示占位说明：

> “Context was skipped by policy. No memories were selected.”

---

## 8. LangGraph Path（左侧）增强

### 8.1 新节点可视化要求

必须可见节点：

* IntentClassifierNode
* ContextPolicyNode
* SkipContextNode（条件）

### 8.2 SkipContextNode 视觉规则

* 节点：灰色
* Edge label：`skip_context`
* 不再连接 ContextEngineNode

---

## 9. 降级与兼容策略

### 9.1 后端 < v1.7.2

* Intent & Policy 区块隐藏
* Context Summary 使用旧逻辑
* Selected Memories 正常显示

### 9.2 字段部分缺失

* 缺 intent → 显示 “Intent: unknown”
* 缺 execution → 不显示 Execution Banner

---

## 10. 技术实现建议

### 涉及文件

* `types/chat.ts`
* `components/ContextDebugPanel.tsx`
* `components/LangGraphPathPanel.tsx`
* `store/chatStore.ts`

### 实现建议

* 所有状态判断使用 `useMemo`
* 不在 render 中写 if-else 逻辑
* execution.mode 作为最高优先级

---

## 11. 验收标准（DoD）

* [ ] Intent / Policy / Execution 可清晰展示
* [ ] qa_stateless 时 Selected Memories 不出现
* [ ] 左侧 LangGraph 出现 SkipContextNode
* [ ] v1.6.x 后端下 UI 不崩
* [ ] TypeScript 无新增 warning

---

## 12. 一句话总结（给前端）

> **w.1.3.1 的目标不是“多展示信息”，而是“把 Context 的控制流讲清楚”。**
