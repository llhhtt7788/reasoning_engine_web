// components/MessageBubble.tsx
import React, { useMemo } from 'react';
import { renderMessageToHtml } from '@/lib/latex';

// (Light-mode only)

type MessageBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';

  const renderedHtml = useMemo(() => {
    if (isUser) return '';
    return renderMessageToHtml(content);
  }, [content, isUser]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        )}
      </div>
    </div>
  );
};
