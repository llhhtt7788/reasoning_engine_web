// store/toastStore.ts
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  ttlMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastState = {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

function newToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const MAX_TOASTS = 3;
const DEFAULT_TTL_MS: Record<ToastType, number> = {
  success: 2200,
  info: 2600,
  error: 3500,
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  pushToast: (toast) => {
    const id = newToastId();
    const ttlMs = toast.ttlMs ?? DEFAULT_TTL_MS[toast.type];

    set((state) => {
      const next = [...state.toasts, { ...toast, id, ttlMs }];
      // keep last MAX_TOASTS
      const sliced = next.slice(Math.max(0, next.length - MAX_TOASTS));
      return { toasts: sliced };
    });

    // auto-dismiss
    window.setTimeout(() => {
      // avoid removing a newer toast with same id (shouldn't happen, but safe)
      const still = get().toasts.some((t) => t.id === id);
      if (still) get().removeToast(id);
    }, ttlMs);

    return id;
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => set({ toasts: [] }),
}));
