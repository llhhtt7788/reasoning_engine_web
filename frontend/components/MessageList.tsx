// components/MessageList.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ReasoningPanel } from './ReasoningPanel';
import { NextActionPanel } from './NextActionPanel';
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
      
      {messages.map((message, index) => (
        <div key={index}>
          <MessageBubble role={message.role} content={message.content} />
          
          {message.role === 'assistant' && (
            <>
              <ReasoningPanel reasoning={message.reasoning} />
              <NextActionPanel actions={message.nextActions} />
            </>
          )}
        </div>
      ))}
      
      <div ref={bottomRef} />
    </div>
  );
};
