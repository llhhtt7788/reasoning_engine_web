// components/MessageList.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ChatMessage } from '@/types/chat';
import { estimateTokens } from '@/lib/tokenEstimate';
import { useToastStore } from '@/store/toastStore';

type MessageListProps = {
    messages: ChatMessage[];
    showMetaPanels?: boolean;
};

// 性能优化：单独的消息组件，使用 React.memo 避免不必要的重渲染
const MessageItem = React.memo<{
    message: ChatMessage;
    index: number;
    nowMs: number;
}>(({ message, index, nowMs }) => {
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

    const pushToast = useToastStore((s) => s.pushToast);

    const handleCopyText = async (text: string, successMsg: string) => {
        try {
            if (!text || text.trim().length === 0) return;
            await navigator.clipboard.writeText(text);
            pushToast({ type: 'success', message: successMsg });
        } catch (e) {
            pushToast({
                type: 'error',
                message: `复制失败（可能是浏览器权限或非 HTTPS）：${(e as Error)?.message || ''}`.trim(),
            });
        }
    };

    return (
        <div id={`message-${index}`} className="flex flex-col scroll-mt-6">
            <div
                data-mode={inferredMode}
                className={[
                    'relative px-5 py-3.5 shadow-sm max-w-[90%] md:max-w-[85%]',
                    'rounded-2xl text-[17px] leading-8',
                    bubbleAlign,
                    isUser
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm',
                    assistantBorder,
                    !isUser ? 'group' : '',
                ].join(' ')}
            >
                {!isUser && (message.content ?? '').trim().length > 0 ? (
                    <button
                        type="button"
                        onClick={() => void handleCopyText(message.content ?? '', '已复制')}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-2 py-1 rounded-md border border-gray-200 bg-white/90 hover:bg-white shadow-sm"
                        title="复制整条消息"
                    >
                        复制
                    </button>
                ) : null}

                {showPreHint && (
                    <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium mb-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        正在分析问题…
                    </div>
                )}

                {/* Status indicators for route/execute (backend scheduling) */}
                {!isUser && (message.route || message.execute) && (
                    <div className="flex items-center flex-wrap gap-2 mb-2 text-xs select-none">
                        {message.route && (
                            <span className="px-1.5 py-0.5 rounded-md border border-gray-200 bg-gray-50/80 text-gray-500">
                                路由：{message.route === 'skip' ? '跳过' : message.route}
                            </span>
                        )}
                        {message.execute && (
                            <span className={`px-1.5 py-0.5 rounded-md border ${
                                message.execute === 'llm_thinking'
                                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                    : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}>
                                执行：{
                                    message.execute === 'llm_fast' ? '快速' :
                                    message.execute === 'llm_thinking' ? '思考' :
                                    message.execute
                                }
                            </span>
                        )}
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
                            pre: ({ children }) => {
                                // Try to extract plain text from rendered code block
                                const rawText = (() => {
                                    const toText = (node: any): string => {
                                        if (node == null) return '';
                                        if (typeof node === 'string') return node;
                                        if (Array.isArray(node)) return node.map(toText).join('');
                                        if (typeof node === 'object' && 'props' in node) return toText((node as any).props?.children);
                                        return '';
                                    };
                                    return toText(children).replace(/\n$/, '');
                                })();

                                return (
                                    <div className="relative">
                                        {!isUser && rawText.trim().length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleCopyText(rawText, '代码已复制')}
                                                className="absolute top-2 right-2 text-[11px] px-2 py-1 rounded-md border border-gray-200 bg-white/90 hover:bg-white shadow-sm"
                                                title="复制代码"
                                            >
                                                复制代码
                                            </button>
                                        ) : null}

                                        <pre
                                            className={`p-3 rounded-lg my-3 overflow-x-auto text-xs font-mono border ${
                                                isUser
                                                    ? 'bg-blue-800/50 border-blue-700 text-gray-100'
                                                    : 'bg-gray-50 border-gray-200 text-gray-800'
                                            }`}
                                        >
                                            {children}
                                        </pre>
                                    </div>
                                );
                            },
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

                {!isUser && (message.content ?? '').trim().length > 0 ? (
                    <div className="mt-2 flex justify-end gap-2">
                        <span className="text-[10px] text-gray-400 px-1">
                            content tokens: {estimateTokens(message.content)}
                        </span>
                        {(message.reasoning ?? '').trim().length > 0 ? (
                            <span className="text-[10px] text-gray-400 px-1">
                                reasoning tokens: {estimateTokens(message.reasoning)}
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数：只有内容、角色或时间戳变化时才重新渲染
    return (
        prevProps.message.content === nextProps.message.content &&
        prevProps.message.reasoning === nextProps.message.reasoning && // Also good to verify reasoning for updates
        prevProps.message.route === nextProps.message.route &&
        prevProps.message.execute === nextProps.message.execute &&
        prevProps.message.role === nextProps.message.role &&
        prevProps.index === nextProps.index &&
        prevProps.nowMs === nextProps.nowMs
    );
});

MessageItem.displayName = 'MessageItem';

export const MessageList: React.FC<MessageListProps> = ({ messages, showMetaPanels = true }) => {
    void showMetaPanels;

    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(0);
    const lastUserMessageIndexRef = useRef<number>(-1);
    const isStreamingRef = useRef(false);
    const scrollTimeoutRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef<number>(0);

    const [nowMs, setNowMs] = useState(() => Date.now());

    // 性能优化：节流滚动函数
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        const now = Date.now();
        const timeSinceLastScroll = now - lastScrollTimeRef.current;

        // 节流：至少间隔 50ms 才执行滚动
        if (timeSinceLastScroll < 50 && behavior === 'auto') {
            if (scrollTimeoutRef.current) {
                window.clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = window.setTimeout(() => {
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                    lastScrollTimeRef.current = Date.now();
                }
            }, 50 - timeSinceLastScroll);
            return;
        }

        lastScrollTimeRef.current = now;

        if (containerRef.current) {
            // 使用 scrollTop 替代 scrollIntoView，性能更好
            if (behavior === 'auto') {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            } else {
                containerRef.current.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, []);

    // 滚动逻辑：区分两种场景
    useEffect(() => {
        const currentLength = messages.length;
        const isNewMessage = currentLength > prevMessagesLength.current;

        if (!isNewMessage && currentLength > 0) {
            // 消息数量没变，但内容可能在更新（流式输出）
            const lastMessage = messages[currentLength - 1];

            // 如果最后一条是 assistant 消消息且有内容，说明正在流式输出
            if (lastMessage.role === 'assistant' && lastMessage.content && isStreamingRef.current) {
                // 流式输出时：使用 instant 滚动到底部（无动画，性能更好）
                scrollToBottom('auto');
            }

            prevMessagesLength.current = currentLength;
            return;
        }

        if (!isNewMessage) {
            prevMessagesLength.current = currentLength;
            return;
        }

        // 有新消息添加
        const lastMessage = messages[currentLength - 1];

        // 场景1：新的用户消息 → 置顶
        if (lastMessage && lastMessage.role === 'user') {
            // 找到最新的用户消息索引
            let latestUserIndex = -1;
            for (let i = currentLength - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                    latestUserIndex = i;
                    break;
                }
            }

            if (latestUserIndex !== -1 && latestUserIndex !== lastUserMessageIndexRef.current) {
                lastUserMessageIndexRef.current = latestUserIndex;
                isStreamingRef.current = false;

                // 置顶到用户消息位置（使用 smooth 动画）
                requestAnimationFrame(() => {
                    const messageEl = document.getElementById(`message-${latestUserIndex}`);
                    if (messageEl && containerRef.current) {
                        const container = containerRef.current;
                        const messageTop = messageEl.offsetTop;

                        container.scrollTo({
                            top: Math.max(0, messageTop - 20),
                            behavior: 'smooth'
                        });
                    }
                });
            }
        }
        // 场景2：新的 assistant 消息（空内容）→ 准备流式输出
        else if (lastMessage && lastMessage.role === 'assistant') {
            isStreamingRef.current = true;

            // 立即滚动到底部，准备接收流式内容（使用 smooth 动画）
            requestAnimationFrame(() => {
                scrollToBottom('smooth');
            });
        }

        prevMessagesLength.current = currentLength;
    }, [messages, scrollToBottom]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                window.clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => setNowMs(Date.now()), 250);
        return () => window.clearInterval(id);
    }, []);

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6"
        >
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
                    <p className="text-xl font-medium text-gray-500">开始对话</p>
                    <p className="text-sm mt-2 opacity-80">向推理引擎提出您的问题</p>
                </div>
            )}

            {messages.map((message, index) => (
                <MessageItem
                    key={index}
                    message={message}
                    index={index}
                    nowMs={nowMs}
                />
            ))}

            <div ref={bottomRef} className="h-4" />
        </div>
    );
};
