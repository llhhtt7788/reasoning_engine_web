import json
import gradio as gr
import requests

API_URL = "http://localhost:11211/api/v1/chat/context"


# ================= 工具函数 =================

def _parse_line_to_json(raw_line: str):
    if not raw_line:
        return None
    line = raw_line.strip()
    if not line:
        return None
    if line.startswith("data:"):
        line = line[len("data:"):].strip()
    if line == "[DONE]":
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None


def _content_to_text(content) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        return str(content.get("content") or content.get("text") or "")
    if isinstance(content, list):
        return "".join(_content_to_text(x) for x in content)
    return str(content)


def _normalize_history(chat_history):
    chat_history = chat_history or []
    normalized = []
    for item in chat_history:
        if isinstance(item, dict):
            normalized.append(
                {"role": item["role"], "content": _content_to_text(item["content"])}
            )
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            if item[0]:
                normalized.append({"role": "user", "content": _content_to_text(item[0])})
            if item[1]:
                normalized.append(
                    {"role": "assistant", "content": _content_to_text(item[1])}
                )
    return normalized


# ================= 产品增强 =================

def build_next_actions(answer_text: str):
    return [
        "是否需要把当前结论转化为一个 POC 验证方案？",
        "是否需要进一步量化成本或风险？",
        "是否要整理为一页决策备忘录？",
    ]


# ================= 主对话 =================

def chat_with_api(message, chat_history):
    message = _content_to_text(message).strip()
    history = _normalize_history(chat_history)

    if not message:
        yield chat_history, "", ""
        return

    payload = {
        "user": message,
        "stream": True,
        "messages": history
    }

    chat_history = history + [
        {"role": "user", "content": message},
        {"role": "assistant", "content": ""},
    ]

    reasoning_buffer = ""
    answer_buffer = ""
    has_reasoning = False

    try:
        with requests.post(
            API_URL,
            json=payload,
            stream=True,
            timeout=60,
            headers={"Accept": "text/event-stream"},
        ) as resp:
            resp.raise_for_status()

            for raw_line in resp.iter_lines(decode_unicode=True):
                data = _parse_line_to_json(raw_line)
                if not data:
                    continue

                delta = ((data.get("choices") or [{}])[0]).get("delta", {})
                content = _content_to_text(delta.get("content"))
                reasoning = _content_to_text(
                    delta.get("reasoning") or delta.get("reasoning_content")
                )

                if reasoning:
                    has_reasoning = True
                    reasoning_buffer += reasoning

                if content:
                    answer_buffer += content
                    if has_reasoning and "🧠 本次回答包含推理过程" not in answer_buffer:
                        answer_buffer += "\n\n> 🧠 本次回答包含推理过程，可在下方【思维链】中查看。"

                    chat_history[-1] = {
                        "role": "assistant",
                        "content": answer_buffer,
                    }

                yield chat_history, reasoning_buffer, ""

        # ===== 下一步建议 =====

        next_actions = build_next_actions(answer_buffer)
        next_action_md = "### 下一步建议\n" + "\n".join(
            [f"- {x}" for x in next_actions]
        )

        yield chat_history, reasoning_buffer, next_action_md

    except Exception as e:
        chat_history[-1] = {
            "role": "assistant",
            "content": f"请求失败: {e}"
        }
        yield chat_history, "", ""


# ================= UI =================

with gr.Blocks(title="医学 / 决策推理助手") as demo:

    gr.Markdown("## 对话")

    chatbot = gr.Chatbot(render_markdown=True)

    with gr.Accordion("思维链（如模型支持）", open=False):
        reasoning_display = gr.Markdown("")

    with gr.Accordion("下一步建议", open=False):
        next_action_display = gr.Markdown("")

    with gr.Row():
        msg = gr.Textbox(placeholder="请输入你的问题...", lines=2, scale=4)
        send = gr.Button("发送", variant="primary")
        clear = gr.Button("清空对话")

    send_evt = send.click(
        chat_with_api,
        [msg, chatbot],
        [chatbot, reasoning_display, next_action_display],
    )

    submit_evt = msg.submit(
        chat_with_api,
        [msg, chatbot],
        [chatbot, reasoning_display, next_action_display],
    )

    for evt in (send_evt, submit_evt):
        evt.then(lambda: "", None, msg)

    clear.click(
        lambda: ([], "", ""),
        None,
        [chatbot, reasoning_display, next_action_display],
    )


if __name__ == "__main__":
    demo.launch(server_name="localhost", server_port=7860)
