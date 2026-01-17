// components/MessageList.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ChatMessage } from '@/types/chat';

type MessageListProps = {
  messages: ChatMessage[];
  showMetaPanels?: boolean;
};

export const MessageList: React.FC<MessageListProps> = ({ messages, showMetaPanels = true }) => {
  void showMetaPanels;

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  const [nowMs, setNowMs] = useState(() => Date.now());

  // 滚动逻辑：每轮对话时将用户提问置顶
  useEffect(() => {
    const currentLength = messages.length;
    const isNewMessage = currentLength > prevMessagesLength.current;
    const lastMessage = messages[currentLength - 1];

    if (isNewMessage && lastMessage && lastMessage.role === 'user') {
      // 用户提问 - 置顶到视口顶部
      setTimeout(() => {
        const messageEl = document.getElementById(`message-${currentLength - 1}`);
        if (messageEl && containerRef.current) {
          // 直接设置 scrollTop 确保精确定位
          const container = containerRef.current;
          const messageTop = messageEl.offsetTop;
          container.scrollTo({
            top: messageTop - 20, // 留 20px 上边距
            behavior: 'smooth'
          });
        }
      }, 100);
    }

    prevMessagesLength.current = currentLength;
  }, [messages]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  return (
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
              <p className="text-xl font-medium text-gray-500">开始对话</p>
              <p className="text-sm mt-2 opacity-80">向推理引擎提出您的问题</p>
            </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const bubbleAlign = isUser ? 'ml-auto' : 'mr-auto';

          const inferredMode = message.meta?.inferredMode;
          const showPreHint =
              !isUser &&
              inferredMode === 'deep' &&
              ((message.content ?? '').trim().length === 0 ||
                  (typeof message.meta?.preHintUntilTs === 'number' && nowMs < message.meta.preHintUntilTs));

          const assistantBorder = !isUser
              ? inferredMode === 'deep'
                  ? 'border-l-4 border-l-indigo-400 pl-1'
                  : 'border-l-0'
              : '';

          return (
              <div key={index} id={`message-${index}`} className="flex flex-col scroll-mt-6">
                <div
                    data-mode={inferredMode}
                    className={[
                      'relative px-5 py-3.5 shadow-sm max-w-[90%] md:max-w-[85%]',
                      'rounded-2xl text-[15px] leading-7',
                      bubbleAlign,
                      isUser
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm',
                      assistantBorder,
                    ].join(' ')}
                >
                  {showPreHint && (
                      <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium mb-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        正在分析问题…
                      </div>
                  )}

                  <div className="markdown-body">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 break-words">{children}</p>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="pl-1">{children}</li>,
                          blockquote: ({ children }) => (
                              <blockquote
                                  className={`border-l-4 pl-3 py-1 my-2 text-sm italic ${
                                      isUser ? 'border-white/30 text-white/80' : 'border-gray-300 text-gray-500'
                                  }`}
                              >
                                {children}
                              </blockquote>
                          ),
                          pre: ({ children }) => (
                              <pre
                                  className={`p-3 rounded-lg my-3 overflow-x-auto text-xs font-mono border ${
                                      isUser
                                          ? 'bg-blue-800/50 border-blue-700 text-gray-100'
                                          : 'bg-gray-50 border-gray-200 text-gray-800'
                                  }`}
                              >
                        {children}
                      </pre>
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            if (inline) {
                              return (
                                  <code
                                      className={`px-1.5 py-0.5 rounded text-sm font-mono mx-0.5 ${
                                          isUser
                                              ? 'bg-blue-700 text-blue-50'
                                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                                      }`}
                                      {...props}
                                  >
                                    {children}
                                  </code>
                              );
                            }
                            return <code className={className} {...props}>{children}</code>;
                          },
                          table: ({ children }) => (
                              <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm bg-white text-gray-900">
                                  {children}
                                </table>
                              </div>
                          ),
                          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
                          tr: ({ children }) => <tr className="hover:bg-gray-50/50 transition-colors">{children}</tr>,
                          th: ({ children }) => (
                              <th className="px-3 py-2 text-left font-semibold text-gray-600">{children}</th>
                          ),
                          td: ({ children }) => (
                              <td className="px-3 py-2 align-top text-gray-700">{children}</td>
                          ),
                          a: ({ href, children }) => (
                              <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`underline underline-offset-2 ${isUser ? 'text-white decoration-white/50' : 'text-blue-600 decoration-blue-300 hover:text-blue-700'}`}
                              >
                                {children}
                              </a>
                          )
                        }}
                    >
                      {message.content || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
          );
        })}

        <div ref={bottomRef} className="h-4" />
      </div>
  );
};
