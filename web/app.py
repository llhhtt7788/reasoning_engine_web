import json
import time
from flask import Flask, render_template, request, Response, stream_with_context
import requests

app = Flask(__name__)

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


# ================= 路由 =================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = _content_to_text(data.get('message', '')).strip()
    history = _normalize_history(data.get('history', []))

    if not message:
        return Response(
            json.dumps({"error": "Message is empty"}),
            mimetype='application/json',
            status=400
        )

    def generate():
        payload = {
            "user": message,
            "stream": True,
            "messages": history
        }

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

                    # Send update to client
                    update = {
                        "type": "update",
                        "content": answer_buffer,
                        "reasoning": reasoning_buffer,
                        "has_reasoning": has_reasoning
                    }
                    yield f"data: {json.dumps(update)}\n\n"

            # Send next actions
            next_actions = build_next_actions(answer_buffer)
            final_update = {
                "type": "complete",
                "content": answer_buffer,
                "reasoning": reasoning_buffer,
                "next_actions": next_actions
            }
            yield f"data: {json.dumps(final_update)}\n\n"

        except Exception as e:
            error_update = {
                "type": "error",
                "error": f"请求失败: {str(e)}"
            }
            yield f"data: {json.dumps(error_update)}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream'
    )


if __name__ == '__main__':
    app.run(host='localhost', port=7860, debug=True)
