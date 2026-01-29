import React from 'react';

export type BlockKey =
  | 'knowledge'
  | 'recent_history'
  | 'deep_history_constraints'
  | 'deep_history_narrative'
  | 'user_current'
  | 'system'
  | string;

export function iconForBlockKey(blockKey: string): React.ReactNode {
  switch (blockKey) {
    case 'knowledge':
      return <span aria-hidden>📖</span>;
    case 'recent_history':
      return <span aria-hidden>💬</span>;
    case 'deep_history_constraints':
      return <span aria-hidden>⚠️</span>;
    case 'deep_history_narrative':
      return <span aria-hidden>☕</span>;
    case 'user_current':
      return <span aria-hidden>👤</span>;
    case 'system':
      return <span aria-hidden>⚙️</span>;
    default:
      return <span aria-hidden>🧩</span>;
  }
}
