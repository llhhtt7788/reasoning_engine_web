
---

# PRD · w.1.3.2

## Conversation / Session Identity 对齐（上下文修复版）

**产品名称**：Reasoning Engine Web
**前端版本**：w.1.3.2
**依赖后端版本**：v1.7.x（兼容 v1.6+）
**状态**：Ready for Development
**目标受众**：前端工程师 / 调试用户（内部）

---

## 一、背景与问题说明

### 1.1 已发现的核心问题（已定位）

当前系统中，上下文无法连续的**根本原因不是后端逻辑错误**，而是：

> ❌ **前端在每次对话请求中，没有稳定传递 `conversation_id` / `session_id`**
> 导致后端无法判断请求是否属于同一上下文空间。

结果表现为：

* 每一轮对话被视为“新会话”
* Redis / PG 中 recent_turns / memories 无法关联
* ContextEngine 虽然工作正常，但输入身份是断裂的

---

### 1.2 w.1.3.2 的目标

> **用最小改动，彻底解决“上下文不通”的问题**

本版本聚焦于：

1. 明确前端在上下文身份中的职责
2. 统一 conversation_id / session_id 的使用方式
3. 提供 UI 可观测与可调试能力
4. 不引入复杂的多会话管理（留给后续版本）

---

## 二、核心设计结论（务必遵守）

### 2.1 当前阶段的身份模型（重要）

在 **w.1.3.x / v1.7.x 阶段**，系统采用以下简化模型：

| 概念                   | 当前语义                      |
| -------------------- | ------------------------- |
| user_id              | 用户唯一标识                    |
| conversation_id      | **用户级上下文桶（当前等同 user_id）** |
| conversation_root_id | 同 conversation_id         |
| session_id           | 一次页面生命周期（刷新即变）            |
| turn_id              | 后端生成，前端不参与                |

> 📌 **一句话总结**：
> 当前版本中：**conversation_id ≈ user_id**

这是一个**明确的阶段性设计选择**。

---

## 三、前端必须实现的行为规范

### 3.1 conversation_id（关键）

#### 3.1.1 默认规则（必须）

前端在页面初始化时：

```ts
conversation_id = user_id
conversation_root_id = user_id
```

并且：

* **每一次** `/api/v1/chat/context` 请求
* **必须携带** conversation_id

---

#### 3.1.2 可编辑规则（必须）

前端需要支持 **手动修改 conversation_id**：

* 作为调试能力
* 用于模拟不同上下文空间

修改后：

* 新请求立即使用新的 conversation_id
* 不要求回溯影响历史 turn

---

### 3.2 session_id（关键）

#### 3.2.1 生成规则

* 前端在**页面加载时生成一次 session_id**
* 页面不刷新 → session_id 不变
* 页面刷新 → 生成新的 session_id

#### 3.2.2 行为要求

* 所有对话请求必须携带 session_id
* 前端 **不需要**维护 turn_seq（由后端处理）

---

## 四、接口请求体规范（前端侧）

### 4.1 前端需要填写的字段

```json
{
  "user": "string",
  "stream": true,

  "tenant_id": "string",
  "user_id": "string",
  "app_id": "string",

  "conversation_id": "string",
  "conversation_root_id": "string",
  "session_id": "string",

  "persona": "string",
  "task_type": "string"
}
```

### 4.2 特别说明

| 字段       | 说明           |
| -------- | ------------ |
| system   | ❌ 前端不传，由后端注入 |
| turn_id  | ❌ 前端不传       |
| turn_seq | ❌ 前端不传       |

---

## 五、UI 设计要求（新增）

### 5.1 Conversation Identity 显示（必须）

在页面顶部或右侧 Context Debug Panel 中，新增：

```
Conversation ID:
[ user_123456____________ ]  ✏️
```

#### 要求：

* 默认值 = user_id
* 可编辑（input）
* 可复制
* 修改后立即生效

---

### 5.2 Session 可观测（推荐）

可在 Debug 区域展示：

```
Session ID: 019b7c...
```

只读，用于调试。

---

## 六、行为示例（帮助前端理解）

### 6.1 正常连续对话

* conversation_id = user_123
* session_id = abc

用户多轮提问 → 后端 context 连续

---

### 6.2 手动切换上下文

* 用户修改 conversation_id = user_123_test

下一轮提问：

* 后端视为新上下文
* 旧记忆不再参与

---

## 七、明确不在 w.1.3.2 做的事（边界）

❌ 不做多 conversation 列表
❌ 不做自动 conversation 分裂
❌ 不做会话历史管理 UI
❌ 不做 conversation 生命周期控制

这些属于 **v1.8 / w.1.4+**

---

## 八、风险与阶段性说明（写清楚，避免后患）

### 8.1 已知风险（已接受）

> 使用 user_id 作为 conversation_id，会导致不同主题的记忆混合。

**当前策略**：

* 接受该风险
* 后端通过 intent-aware（v1.7.x）缓解
* 后续版本通过多 conversation 彻底解决

---

## 九、验收标准（DoD）

### 功能正确性

* [ ] 每次请求都携带 conversation_id
* [ ] conversation_id 默认等于 user_id
* [ ] session_id 页面内稳定

### 上下文连贯性

* [ ] 连续对话可命中 recent_turns
* [ ] 刷新页面后 session_id 改变但 conversation_id 不变

### 可调试性

* [ ] conversation_id 可见
* [ ] conversation_id 可编辑
* [ ] 修改后上下文立即变化

---

## 十、给前端的一句话总结（可贴在任务里）

> **w.1.3.2 的核心目标只有一个：
> 保证 conversation_id 和 session_id 稳定、可控地传给后端。
> 当前阶段 conversation_id 默认等于 user_id，但必须可编辑，用于调试和上下文切换。**

---

## 十一、版本总结（产品视角）

> **w.1.3.2 是“上下文真正跑通”的基础版本，
> 它不炫技，但是整个系统稳定性的地基。**

---
