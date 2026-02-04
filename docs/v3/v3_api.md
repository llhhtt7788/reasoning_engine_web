# V3 Communication Engine API 文档

> **版本**：v3.1.0
> **更新时间**：2026-02-04
> **状态**：发布就绪

---

## 1. 概述

V3 Communication Engine 提供医学问答与推理的核心 API，支持：

- **结构化响应**：带证据引用的回答
- **SSE 流式输出**：实时返回生成内容
- **质量门控**：确保医学回答的可信度
- **与 V1/V2 集成**：复用上下文和知识检索能力
- **多模态 / 视觉能力（VL）**：当请求包含图片输入时，可自动/显式路由到 `vl_agent`

---

## 2. API 端点

### 2.1 POST /api/v3/communicate

主要的沟通接口，处理用户查询并返回结构化响应。

#### 请求格式

```http
POST /api/v3/communicate
Content-Type: application/json
```

```json
{
  "query": "AKI 患者的液体管理策略是什么？",
  "messages": [
    {"role": "user", "content": "之前问过肾功能相关问题"}
  ],
  "conversation_id": "conv-123",
  "session_id": "sess-456",
  "user_id": "user-789",
  "app_id": "app-001",
  "stream": false
}
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | ✅ | 用户查询文本 |
| `messages` | array | ❌ | 对话历史（OpenAI 格式）。**支持多模态**：`content` 可为 string 或 list（见下方示例）。 |
| `conversation_id` | string | ❌ | 对话标识符 |
| `session_id` | string | ❌ | 会话标识符 |
| `user_id` | string | ❌ | 用户标识符 |
| `app_id` | string | ❌ | 应用标识符（用于知识库范围） |
| `stream` | boolean | ❌ | 是否启用 SSE 流式输出（默认 false） |
| `agent_mode` | string | ❌ | **Agent 路由覆写（推荐用于多模态）**。例如：`"vl_agent"`。若不传，系统可能根据输入内容自动路由。 |

---

#### 2.1.1 多模态（图片）输入与自动路由

为了避免客户端继续沿用 V1 的 `image_url` 顶层字段模式，V3 统一使用 **OpenAI multimodal messages** 形态。

**自动路由触发条件（Auto-routing）**

- 当 `messages` 中任意一条消息的 `content` 是 `list`，且包含如下图片段：
    - `{"type": "image_url", "image_url": {"url": "..."}}`
- 且请求中 **未显式指定** `agent_mode`

系统将自动“升舱”路由到：

- `agent_mode = "vl_agent"`

> 建议：对图片解析类需求（读片/看化验单/看截图/看报告等），客户端可直接显式传 `agent_mode="vl_agent"`，这是最稳的路径（见 4.4）。

---

#### 响应格式（非流式）

```json
{
  "status": "success",
  "data": {
    "response_content": "AKI 患者的液体管理策略应...",
    "response_evidence": [
      {
        "document_id": "d1",
        "chunk_id": "c1",
        "title": "AKI 指南",
        "url": "https://..."
      }
    ],
    "intent_type": "qa",
    "risk_level": "R1",
    "quality_decision": "pass",
    "trace_id": "trace-xxx",
    "clarify_question": null
  },
  "error": null
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | `success` / `clarify` / `pending_review` / `error` |
| `data.response_content` | string | AI 生成的回答内容 |
| `data.response_evidence` | array | 证据引用列表 |
| `data.intent_type` | string | 意图类型（qa / 辅助诊疗 / 质控 / 写作） |
| `data.risk_level` | string | 风险等级（R0 / R1 / R2） |
| `data.quality_decision` | string | 质量决策（pass / repair / human_review） |
| `data.trace_id` | string | 追踪标识符 |
| `data.clarify_question` | object | 澄清问题（当 status=clarify 时） |
| `error` | object | 错误详情（当 status=error 时） |

#### 响应格式（SSE 流式）

当 `stream=true` 时，返回 SSE 事件流：

```text
event: token
data: {"content": "AKI", "index": 0}

event: token
data: {"content": " 患者", "index": 1}

event: token
data: {"content": "的液体", "index": 2}

...

event: done
data: {"response_evidence": [...], "trace_id": "trace-xxx", "quality_decision": "pass"}
```

#### 错误响应

```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "ENGINE_ERROR",
    "message": "执行引擎发生错误",
    "recoverable": true
  }
}
```

#### 错误码说明

| 错误码 | 说明 | 可恢复 |
|--------|------|--------|
| `ENGINE_ERROR` | 引擎内部错误 | 是 |
| `QUALITY_GATE_FAILED` | 质量门控失败 | 是 |
| `VALIDATION_ERROR` | 请求参数验证失败 | 否 |

---

## 3. 状态说明

### 3.1 status 取值

| 状态 | 说明 | 下一步动作 |
|------|------|----------|
| `success` | 成功生成回答 | 显示 response_content |
| `clarify` | 需要用户澄清 | 显示 clarify_question，等待用户输入 |
| `pending_review` | 需要人工审核 | 等待人工介入 |
| `error` | 发生错误 | 根据 error.recoverable 决定是否重试 |

### 3.2 风险等级

| 等级 | 说明 | 处理方式 |
|------|------|----------|
| `R0` | 低风险（闲聊/常识） | 直接回答 |
| `R1` | 中风险（一般医学问答） | 需要证据支持 |
| `R2` | 高风险（诊疗/用药建议） | 强化质控，可能需人工 |

---

## 4. 示例

### 4.1 简单问答

```bash
curl -X POST http://localhost:8000/api/v3/communicate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "什么是糖尿病？",
    "stream": false
  }'
```

### 4.2 带上下文的问答

```bash
curl -X POST http://localhost:8000/api/v3/communicate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "那它有哪些症状？",
    "messages": [
      {"role": "user", "content": "什么是糖尿病？"},
      {"role": "assistant", "content": "糖尿病是一种慢性代谢性疾病..."}
    ],
    "conversation_id": "conv-001",
    "stream": false
  }'
```

### 4.3 流式输出

```bash
curl -X POST http://localhost:8000/api/v3/communicate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AKI 的治疗原则",
    "stream": true
  }'
```

### 4.4（推荐）图片解析：显式指定 vl_agent（最稳路径）

> 适用：看图片/看截图/看报告/看检验单/看影像等“强推理图片解析”场景。

```bash
curl -X POST http://localhost:8000/api/v3/communicate \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "看下图片",
    "agent_mode": "vl_agent",
    "stream": false,
    "conversation_id": "conv-001",
    "session_id": "sess-001",
    "user_id": "user-001",
    "app_id": "pk",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "看下图片"},
          {
            "type": "image_url",
            "image_url": {
              "url": "http://YOUR_HOST/api/v1/vl/assets/xxx"
            }
          }
        ]
      }
    ]
  }'
```

### 4.5（自动路由）图片解析：只要 messages 带 image_url

> 若你不传 `agent_mode`，只要 `messages[*].content` 中包含 `type=image_url`，系统会自动路由到 `vl_agent`。

```bash
curl -X POST http://localhost:8000/api/v3/communicate \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "看下图片",
    "stream": false,
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "看下图片"},
          {"type": "image_url", "image_url": {"url": "http://YOUR_HOST/api/v1/vl/assets/xxx"}}
        ]
      }
    ]
  }'
```

---

## 5. 与 V1/V2 API 的关系

| API | 版本 | 说明 |
|-----|------|------|
| `/api/v1/chat/context` | V1 | 上下文对话（保留） |
| `/api/v1/conversations` | V1 | 会话管理（保留） |
| `/api/knowledge/*` | V2 | 知识库管理（保留） |
| `/api/v3/communicate` | V3 | 完整推理引擎（新增） |

V3 API 内部会调用 V1（上下文）和 V2（知识检索）的能力，但对外提供统一的接口。

---

## 6. OpenAPI 规范

完整的 OpenAPI 规范可通过以下端点获取：

```
GET /openapi.json
```

或访问 Swagger UI：

```
GET /docs
```
