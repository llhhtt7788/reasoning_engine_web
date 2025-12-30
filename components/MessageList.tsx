// components/MessageList.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // 确保KaTeX样式加载
import { ReasoningPanel } from './ReasoningPanel';
import { ChatMessage } from '@/types/chat';

type MessageListProps = {
  messages: ChatMessage[];
};

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
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
            {/* 思维链入口放在 assistant 气泡上方，并与气泡对齐 */}
            {message.role === 'assistant' && (
              <div className={[bubbleAlign, 'max-w-[85%]'].join(' ')}>
                <ReasoningPanel reasoning={message.reasoning} />
              </div>
            )}

            {/* 用 ReactMarkdown 实际渲染消息内容（否则 Markdown 永远不会生效） */}
            <div
              className={[
                'max-w-[85%] rounded-lg px-4 py-3 whitespace-normal break-words',
                bubbleAlign,
                isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900',
              ].join(' ')}
            >
              {/* react-markdown 新版本已移除 className 透传；样式请包在外层容器 */}
              <div
                className={[
                  'prose prose-sm max-w-none',
                  isUser ? 'prose-invert' : '',
                ].join(' ')}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
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
