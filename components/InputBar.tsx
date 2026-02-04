// components/InputBar.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type InputBarProps = {
  onSendAction: (message: string) => void;

  /** Lifted state from parent so upload/chat failures don't auto-clear the image. */
  imageFile: File | null;
  setImageFileAction: (file: File | null) => void;

  disabled?: boolean;
};

export const InputBar: React.FC<InputBarProps> = ({
  onSendAction,
  imageFile,
  setImageFileAction,
  disabled,
}) => {
  const [input, setInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canSend = (input.trim().length > 0 || !!imageFile) && !disabled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    // Parent decides whether/when to clear imageFile.
    onSendAction(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white/70 backdrop-blur p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          // allow re-selecting the same file
          e.target.value = '';
          if (!f) return;
          setImageFileAction(f);
        }}
      />

      {imageFile && (
        <div className="mb-2 text-[11px] text-gray-600">
          VL 推理模式已就绪（将通过 V3 /communicate 路由至 vl_agent）
        </div>
      )}

      {imageFile && previewUrl ? (
        <div className="mb-2 flex items-start gap-3 rounded-xl border border-gray-200 bg-white/80 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={imageFile.name}
            className="h-16 w-16 rounded-lg object-cover border border-gray-100"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-900 truncate">{imageFile.name}</div>
            <div className="text-[11px] text-gray-500">{Math.round(imageFile.size / 1024)} KB</div>
            <button
              type="button"
              className="mt-1 text-[11px] text-gray-700 underline hover:text-gray-950"
              onClick={() => {
                setImageFileAction(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={disabled}
            >
              清除图片
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-xl border border-gray-300 bg-white/80 hover:bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          title="选择图片"
        >
          📷
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入你的问题..."
          disabled={disabled}
          rows={2}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/40 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white/80 transition-all duration-200 ease-in-out hover:bg-white"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="px-6 py-2 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-50 rounded-xl hover:from-black hover:via-gray-900 hover:to-gray-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium border border-gray-800 shadow-sm"
        >
          发送
        </button>
      </div>
      {disabled && <p className="text-xs text-gray-500 mt-2">正在处理...</p>}
    </form>
  );
};
