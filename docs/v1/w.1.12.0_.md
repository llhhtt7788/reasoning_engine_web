
---

# 📝 PRD: Med-Go 思维链可视化 (Thinking Trace)

> **面向对象**：前端开发 / UI 设计 / 测试
> **版本**：v1.12.0 (Release Candidate)
> **优先级**：P0 (核心信任特性)
> **关键词**：**白盒化 / 临床可解释性 / 证据链 / 动态流式**

---

## 1. 核心目标 (The "Why")

**将 AI 从“黑盒”变成医生可信赖的“白盒队友”。**

医生不敢完全信任 AI 的核心原因在于：不知道 AI 是**基于什么**回答的。是基于最新的指南？还是瞎编的？它有没有漏看我刚才发的过敏史？

本需求的目标是构建一个**“思维仪表盘”**，让医生清晰地看到：

1. **意图识别**：AI 知道我在问医疗专业问题（进入专家模式）。
2. **证据引用**：AI 确实查阅了知识库和病历。
3. **取舍逻辑**：在篇幅有限时，AI **优先保留了关键约束（如禁忌症）**，而主动舍弃了无关闲聊。

---

## 2. 可视化架构设计 (Visual Architecture)

前端需建立从 API 数据到 UI 组件的单向数据流映射。

```mermaid
graph TD
    %% 数据源层
    API[API Response / SSE Event] -->|解析 thinking_trace| Store[Thinking Trace Store]

    %% 逻辑映射层
    Store -->|intent| IntentLogic[意图映射逻辑]
    Store -->|allocator.blocks| BudgetLogic[预算计算逻辑]
    Store -->|assembly_steps| TimelineLogic[决策流映射逻辑]

    %% UI 组件层
    IntentLogic --> UI_Badge[1. 意图标签 Badge]
    BudgetLogic --> UI_Progress[2. 预算分配条 Progress Bar]
    TimelineLogic --> UI_Timeline[3. 决策时间轴 Timeline]
    
    %% 实时状态
    Store -->|实时事件流| UI_Status[4. 实时大脑状态 Status]

    %% 样式层
    subgraph "UI Visuals"
        UI_Badge -->|Medical QA| Style1[🏥 专家模式 (蓝/绿)]
        UI_Timeline -->|Block: Knowledge| Icon1[📖 书本图标]
        UI_Timeline -->|Block: Constraints| Icon2[⚠️ 警示图标]
        UI_Timeline -->|Reason: Policy Low| Text1[置灰+删除线]
    end

```

---

## 3. 数据契约 (Data Contract)

### 3.1 数据入口

支持两种模式，前端需做统一适配：

1. **全量模式 (非流式)**: `POST /api/v1/chat/context`
* 响应字段: `response.thinking_trace` (Object)


2. **增量模式 (SSE 流式)**: `POST /api/v1/chat/context?stream=true&sse=true`
* 事件帧: `event: thinking_trace`
* 数据: `data: {"thinking_trace": {...}}`
* *注：SSE 可能会在正文生成前推送，也可能在生成中更新，需支持动态重绘。*



### 3.2 黄金数据样本 (Golden Sample)

请基于此 JSON 结构进行 Mock 开发与类型定义：

```json
{
  "thinking_trace": {
    "intent": "medical_qa",
    "allocator": {
      "allowed_input_tokens": 8000,
      "blocks": {
        "system": { "allocated_tokens": 1000, "drop_reason": null },
        "knowledge": { "allocated_tokens": 2500, "drop_reason": null },
        "recent_history": { "allocated_tokens": 1500, "drop_reason": null },
        "deep_history_constraints": { "allocated_tokens": 200, "drop_reason": null },
        "deep_history_narrative": { "allocated_tokens": 0, "drop_reason": "policy_low" }
      }
    },
    "assembly_steps": [
      {
        "type": "allocator_result",
        "intent": "medical_qa",
        "allowed_input_tokens": 8000,
        "blocks": { ... }
      },
      {
        "type": "drop_block",
        "block": "deep_history_narrative",
        "reason": "policy_low"
      },
      {
        "type": "recent_history_trim",
        "allowed_tokens": 1500,
        "kept_turns": 4
      }
    ]
  }
}

```

---

## 4. 关键 UI 组件详述

### 4.1 意图标签 (Intent Badge)

* **位置**：对话气泡顶部或 Trace 面板头部。
* **逻辑**：
* `intent == "medical_qa"` → **🏥 专家模式** (主色调，高亮)
* `intent == "chitchat"` → **☕ 闲聊模式** (灰色，低调)
* 其他 → 默认显示“通用模式”。



### 4.2 实时大脑状态 (Brain Activity Status) - *仅 SSE 阶段*

在 AI 开始打字前的几秒钟，不要只转圈，要显示它在干什么。

* **逻辑**：监听 `assembly_steps` 的最新事件。
* 收到 intent → 显示 *"识别到医疗意图，正在调取专家库..."*
* 收到 knowledge block → 显示 *"正在检索临床指南..."*
* 收到 deep_history_constraints → 显示 *"正在回顾患者既往病史..."*
* 收到 allocator_result → 显示 *"信息整合完毕，开始生成..."*



### 4.3 预算分配条 (Budget Overview)

用视觉化的“内存条”展示 AI 的注意力分布。

* **形态**：分段进度条。
* **颜色定义**：
* 🟩 **绿色 (Knowledge)**：代表循证依据（权重最高）。
* 🟦 **蓝色 (History)**：代表上下文记忆。
* ⬜ **灰色 (System)**：代表系统指令。


* **交互**：鼠标 Hover 显示具体 token 数（如 *"引用指南：2500 tokens"*）。

### 4.4 决策流水线 (Decision Timeline) - **核心功能**

以时间轴或卡片流形式，展示每一块信息的去留。

#### A. 图标映射规范 (Icon Mapping)

前端必须建立 `BlockKey -> Icon` 的映射配置：
| Block Key | 含义 | 建议图标 |
| :--- | :--- | :--- |
| `knowledge` | 检索到的知识 | 📖 (书本/文档) |
| `recent_history` | 最近对话 | 💬 (气泡) |
| `deep_history_constraints` | **关键约束** (如过敏史) | ⚠️ (警示/锚点) |
| `deep_history_narrative` | 叙述性历史 (闲聊) | ☕ (咖啡/时间流) |
| `user_current` | 当前问题 | 👤 (用户) |

#### B. 状态样式 (Status Styling)

* **已保留 (Kept)**:
* 判定：`allocated_tokens > 0`
* 样式：正常黑色字体，图标高亮。


* **已丢弃 (Dropped)**:
* 判定：`allocated_tokens == 0`
* 样式：置灰文本，图标变灰，**必须显示删除线**。
* **文案映射** (将 `drop_reason` 翻译成人话)：
* `policy_low` → *"无关闲聊已自动略过"* (正向反馈)
* `budget_exhausted` → *"因篇幅限制已折叠"* (中性反馈)
* `token_cap_exceeded` → *"内容过长已截断"*





---

## 5. 开发实施建议 (Implementation Tips)

### 5.1 配置化开发

请勿在代码中硬编码 `if (block === 'knowledge')`。
请创建一个 `BlockConfig.ts`：

```typescript
export const BlockConfig = {
  knowledge: { label: '知识库', icon: BookIcon, color: 'green' },
  deep_history_constraints: { label: '关键病史', icon: AlertIcon, color: 'red' },
  // ...
};

```

### 5.2 性能节流 (Throttling)

SSE 流式返回时，`thinking_trace` 可能会在 100ms 内推送 5 次更新。

* **要求**：请对渲染层做 `throttle(100ms)` 处理，避免界面高频闪烁。

### 5.3 鲁棒性兜底

* 如果后端返回了未知的 `BlockKey` → 显示通用图标 + Key 文本。
* 如果后端返回了未知的 `drop_reason` → 显示 *"系统自动取舍"*。
* 如果 `thinking_trace` 字段为空 → 优雅隐藏整个面板，不报错。

---

## 6. 验收标准 (Acceptance Criteria)

1. **视觉验收**：
* 专家模式下，`Knowledge` 和 `Constraints` 是否有明显的视觉强调（如绿色/红色图标）？
* 被丢弃的闲聊（Narrative）是否正确显示了删除线和“无关略过”文案？


2. **交互验收**：
* SSE 生成过程中，状态文案是否在动态变化（不是死板的 Loading）？


3. **数据验收**：
* 检查 Mock 数据中的 `deep_history_narrative` 是否被正确渲染为“已丢弃”。



