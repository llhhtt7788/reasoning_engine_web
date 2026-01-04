// components/MessageList.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // 确保KaTeX样式加载
import { ChatMessage } from '@/types/chat';

type MessageListProps = {
  messages: ChatMessage[];
  showMetaPanels?: boolean;
};

export const MessageList: React.FC<MessageListProps> = ({ messages, showMetaPanels = true }) => {
  // showMetaPanels currently unused (kept for API compatibility)
  void showMetaPanels;

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-lg">开始对话</p>
          <p className="text-sm mt-2">向推理引擎提出您的问题</p>
        </div>
      )}

      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const bubbleAlign = isUser ? 'ml-auto' : 'mr-auto';

        return (
          <div key={index} className="space-y-2">
            {/* 消息内容 */}
            <div
              className={[
                // Bubble should hug content; cap width on long messages
                'w-fit max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap break-words shadow-sm',
                bubbleAlign,
                isUser
                  ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-50 border border-gray-800'
                  : 'bg-white/80 backdrop-blur border border-gray-200 text-gray-900',
              ].join(' ')}
            >
              <div
                className={[
                  'prose prose-sm max-w-none',
                  isUser ? 'prose-invert' : '',
                ].join(' ')}
              >
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    // Ensure $...$ and $$...$$ are parsed as math
                    [remarkMath, { singleDollarTextMath: true }],
                  ]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    // 避免 p 默认 margin 造成气泡内间距怪异
                    p: ({ children }) => <p className="m-0">{children}</p>,
                  }}
                >
                  {message.content || ''}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
};
