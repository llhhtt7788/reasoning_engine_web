详尽说明：

✅ /api/v1/chat/context

支持参数（query + body），支持 SSE / 非 SSE 请求

SSE 帧类型说明（route, agent, token, langgraph_path）

示例 URL + 请求体 + trace_id / turn_id 定义

✅ /api/v1/langgraph/path?turn_id=...

用于重放 LangGraph DAG 路径（调试 & 前端回显）

返回结构：nodes/edges + 执行顺序 + 标记链路

可被前端 Path 面板加载用于 “语义路径回显” 功能