# AI 上下文管理模块（前端集成 PRD 文档）

**版本号：v1.3.2**（含路径可视化、上下文回溯、接口调试）
**适用对象**：Web 前端工程师
**创建日期**：2026-01-02

---

## 一、项目目标

本模块为基于 LangGraph 多 Agent 架构的上下文管理与路径可视化系统，前端需支持：

* 聊天 UI 与 SSE 渲染
* LangGraph 决策路径可视化
* 上下文注入 Debug（token 占用、memory 回显）
* 手动记忆干预接口对接

---

## 二、关键接口说明

### 1. 聊天接口 `/api/v1/chat/context`

* **支持模式**：SSE / 非 SSE

* **请求字段（Body）**：

  ```json
  {
    "input": "你好，帮我查一下昨日销售数据",
    "persona": "data_assistant",
    "turn_meta": {
      "task_type": "data_query"
    }
  }
  ```

* **Query 参数（可选）**：

    * `stream=true`：启用 SSE 返回（推荐）
    * `trace=true`：是否记录执行路径信息

* **返回类型（SSE）**：

    * `event: route`：路径初始化
    * `event: agent`：当前代理模型信息
    * `event: langgraph_path`：路径节点变化（可视化）
    * `event: token`：Token 流式响应

### 2. 路径回放接口 `/api/v1/langgraph/path?turn_id=...`

* **用途**：前端根据 `turn_id` 加载完整 DAG 节点与执行边
* **响应结构**：

  ```json
  {
    "nodes": [
      { "nodeId": "MemoryRetriever", "startTime": "...", "endTime": "..." },
      ...
    ],
    "edges": [
      { "from": "PersonaRouter", "to": "MemoryRetriever" }
    ]
  }
  ```

---

## 三、DAG 可视化标准

### LangGraph 执行顺序（推荐绘制路径）

```
IDGuard → TaskClassifier → PersonaRouter → MemoryRetriever → ContextAssembler
        → LLM → PostAnswerSanitizer → SessionSummary → MemoryWriter
```

### 前端节点结构建议

```ts
interface DagNode {
  nodeId: string;
  label: string;
  startTime: string;
  endTime?: string;
}

interface DagEdge {
  from: string;
  to: string;
}
```

### 可视化表现建议

* **绿色**：执行成功
* **黄色**：部分跳过 / 没命中
* **红色**：错误
* 点击节点弹出：运行耗时、上下文摘要 / memory 使用

---

## 四、上下文观测字段（在 SSE 或路径接口中）

| 字段名                    | 含义                  |
| ---------------------- | ------------------- |
| `turn_id`              | 当前语义轮唯一 ID          |
| `memory_selected`      | 命中记忆条数              |
| `context_tokens`       | Token 注入量           |
| `backend.summary`      | Redis / PG / memory |
| `has_session_summary`  | 是否拼接摘要段落            |
| `agent_prompt_preview` | 本轮 LLM prompt 示例    |

---

## 五、干预接口 `/api/context/memory/adjust`

### 用途

用于手动调整记忆权重，提升召回优先级，或标记废弃（deprecate）。

### 示例

```json
{
  "memory_id": "abc-123",
  "action": "boost",
  "new_importance": 5
}
```

* `boost`: importance 设为 1~5
* `deprecate`: 不再参与 memory 召回

---

## 六、调试推荐材料

### 推荐打包结构：

```
docs/
├── PRD_AI上下文管理_v1.3.2.md（本文件）
├── LangGraph_决策路径接口说明.md
├── LangGraph_路径可视化规则.md
└── tests/llm.http（Postman 调试脚本）
```

### HTTP 调试示例：`tests/llm.http`

```http
POST /api/v1/chat/context?stream=true HTTP/1.1
Content-Type: application/json

{
  "input": "请帮我总结会议纪要",
  "persona": "secretary",
  "turn_meta": { "task_type": "summarize" }
}
```

可用于前端测试 SSE 是否接收、上下文是否拼接 memory。

---

## 七、交付目标建议

| 模块         | 功能                                            |
| ---------- | --------------------------------------------- |
| 聊天 UI      | 展示用户输入与模型响应，SSE 监听 token/agent/langgraph_path |
| 路径面板       | 渲染 LangGraph DAG，支持点击查看节点信息                   |
| 上下文调试区     | 展示 memory_selected、tokens、prompt 预览           |
| 记忆干预面板（可选） | 提供调权/屏蔽 UI，接入 `/memory/adjust` 接口             |

---

如需添加 mock 接口、接口类型定义文件（TS），可根据本文档继续扩展。
