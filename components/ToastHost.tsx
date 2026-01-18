'use client';

import React from 'react';
import { useToastStore } from '@/store/toastStore';

function typeStyles(type: 'success' | 'error' | 'info'): { wrap: string; icon: string } {
  switch (type) {
    case 'success':
      return { wrap: 'bg-green-600', icon: '✓' };
    case 'error':
      return { wrap: 'bg-red-600', icon: '✕' };
    case 'info':
    default:
      return { wrap: 'bg-blue-600', icon: 'ℹ' };
  }
}

export const ToastHost: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const styles = typeStyles(t.type);
        return (
          <div
            key={t.id}
            className={[
              'pointer-events-auto',
              'min-w-[240px] max-w-[360px]',
              'rounded-lg shadow-lg ring-1 ring-black/10',
              'text-white',
              styles.wrap,
            ].join(' ')}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3 px-3 py-2.5">
              <div className="mt-[1px] text-sm font-bold" aria-hidden="true">
                {styles.icon}
              </div>
              <div className="flex-1 text-sm leading-snug whitespace-pre-wrap break-words">
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="-mr-1 -mt-1 p-1 rounded hover:bg-white/15 transition-colors"
                aria-label="关闭"
                title="关闭"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {t.actionLabel && t.onAction ? (
              <div className="px-3 pb-2.5 pt-0 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    removeToast(t.id);
                    t.onAction?.();
                  }}
                  className="text-xs font-semibold px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors"
                >
                  {t.actionLabel}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
