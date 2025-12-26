# Reasoning Engine Web

A web-based chat interface for interacting with AI reasoning models. This application provides a Gradio-based UI that supports streaming responses with reasoning chain visualization.

## Features

- 💬 Interactive chat interface with streaming responses
- 🧠 Reasoning chain visualization (for models that support it)
- 📋 Next action suggestions after each response
- 🔄 Chat history management
- 🌐 Support for Server-Sent Events (SSE) streaming

## Prerequisites

- Python 3.8 or higher
- A reasoning engine API server running at `http://localhost:11211/api/v1/chat/context`

## Installation

1. Clone the repository:
```bash
git clone https://github.com/llhhtt7788/reasoning_engine_web.git
cd reasoning_engine_web
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Ensure your reasoning engine API server is running at `http://localhost:11211/api/v1/chat/context`

2. Start the Gradio web interface:
```bash
python web/gradio_app.py
```

3. Open your browser and navigate to:
```
http://localhost:7860
```

## API Configuration

The application expects the API to:
- Accept POST requests with JSON payload containing:
  - `user`: The user's message
  - `stream`: Boolean indicating streaming mode
  - `messages`: Array of previous chat messages
- Return Server-Sent Events (SSE) with JSON data containing:
  - `choices[0].delta.content`: Response content
  - `choices[0].delta.reasoning` or `choices[0].delta.reasoning_content`: Reasoning chain

## Project Structure

```
reasoning_engine_web/
├── web/
│   └── gradio_app.py    # Main Gradio application
├── requirements.txt      # Python dependencies
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## License

This project is licensed under the MIT License.
