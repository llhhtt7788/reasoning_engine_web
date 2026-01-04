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

        const inferredMode = message.meta?.inferredMode;
        const now = Date.now();
        const showPreHint =
          !isUser
          && inferredMode === 'deep'
          && (
            (message.content ?? '').trim().length === 0
            || (typeof message.meta?.preHintUntilTs === 'number' && now < message.meta.preHintUntilTs)
          );

        const assistantBorder = !isUser
          ? inferredMode === 'deep'
            ? 'border-l-2 border-l-indigo-300'
            : 'border-l-2 border-l-gray-200'
          : '';

        return (
          <div key={index} className="space-y-2">
            {/* 消息内容 */}
            <div
              data-mode={inferredMode}
              className={[
                // Bubble should hug content; cap width on long messages
                'w-fit max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap break-words shadow-sm',
                bubbleAlign,
                isUser
                  ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-50 border border-gray-800'
                  : 'bg-white/80 backdrop-blur border border-gray-200 text-gray-900',
                assistantBorder,
              ].join(' ')}
            >
              {showPreHint && (
                <div className="text-xs text-gray-400 mb-1">正在分析问题…</div>
              )}

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

                    // Tables: wrap for horizontal scroll and add subtle borders
                    table: ({ children }) => (
                      <div className="-mx-1 overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                    th: ({ children }) => (
                      <th className="border border-gray-200 px-2 py-1 text-left font-semibold">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-200 px-2 py-1 align-top">{children}</td>
                    ),
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
