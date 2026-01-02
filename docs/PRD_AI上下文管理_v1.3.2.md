1. PRD_AI上下文管理_v1.3.2.md ✅【核心产品需求】

明确前端需要展现的关键节点序列：

IDGuard → TaskClassifier → PersonaRouter → MemoryRetriever → ContextAssembler
→ LLM → PostAnswerSanitizer → SessionSummary → MemoryWriter


定义以下观测字段，前端可通过 SSE 或回溯接口展示：

turn_id, conversation_id, session_id

memory_selected: 召回条数

context_tokens: token 占比

backend: Redis/PG 命中路径

描述用于前端交互的接口：

/api/context/memory/adjust：记忆提升/屏蔽

/api/v1/chat/context：核心上下文调用

说明路径显示的触发条件、摘要时机、记忆召回的动态策略