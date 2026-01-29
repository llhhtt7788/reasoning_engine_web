// types/thinkingTrace.ts

export type ThinkingTraceBlock = {
  allocated_tokens?: number;
  drop_reason?: string | null;
  [k: string]: unknown;
};

export type ThinkingTraceAllocator = {
  allowed_input_tokens?: number;
  blocks?: Record<string, ThinkingTraceBlock>;
  [k: string]: unknown;
};

export type ThinkingTraceAssemblyStep =
  | {
      type: 'allocator_result';
      intent?: string;
      allowed_input_tokens?: number;
      blocks?: Record<string, ThinkingTraceBlock>;
      [k: string]: unknown;
    }
  | {
      type: 'drop_block';
      block?: string;
      reason?: string;
      [k: string]: unknown;
    }
  | {
      type: 'recent_history_trim';
      allowed_tokens?: number;
      kept_turns?: number;
      [k: string]: unknown;
    }
  | {
      type?: string;
      [k: string]: unknown;
    };

export type ThinkingTrace = {
  intent?: string;
  allocator?: ThinkingTraceAllocator;
  assembly_steps?: ThinkingTraceAssemblyStep[];
  [k: string]: unknown;
};
