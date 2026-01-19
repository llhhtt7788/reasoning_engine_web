// types/v3Chat.ts
/**
 * V3 Communication Engine 类型定义
 * 基于 w.3.0.0 PRD 规范
 */

// ===== 基础类型 =====

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus =
  | 'normal'          // 普通 user/assistant 消息
  | 'loading'         // assistant 正在生成
  | 'clarify'         // 系统澄清卡
  | 'pending_review'  // 人工审核占位
  | 'error';          // 错误卡

export type RiskLevel = 'R0' | 'R1' | 'R2';

export type QualityDecision = 'pass' | 'repair' | 'human_review' | 'block';

export type V3ResponseStatus = 'success' | 'clarify' | 'pending_review' | 'error';

// ===== 证据引用 =====

export interface EvidenceRef {
  document_id?: string;
  chunk_id?: string;
  title?: string;
  url?: string;
  source?: string;
  // 允许额外字段（后端 dict[str, Any]）
  [key: string]: unknown;
}

// ===== 澄清问题 =====

export interface ClarifyQuestion {
  question: string;
  options?: string[];
  required?: boolean;
}

// ===== 错误结构 =====

export interface V3ErrorInfo {
  code?: string;
  message: string;
  recoverable?: boolean;
}

// ===== 前端消息结构（展示用） =====

export interface V3ChatMessage {
  id: string;                     // 前端生成 uuid
  role: MessageRole;
  status: MessageStatus;
  content: string;                // 主体文本（Markdown）
  created_at: number;             // ms timestamp

  // 可选：用于 debug/埋点/排查
  trace_id?: string;
  risk_level?: RiskLevel;
  quality_decision?: QualityDecision;
  intent_type?: string;

  // 可选：澄清卡
  clarify_question?: ClarifyQuestion;

  // 可选：证据引用
  evidence?: EvidenceRef[];

  // 可选：错误结构
  error?: V3ErrorInfo;
}

// ===== 上行消息格式（OpenAI 兼容） =====

export interface V3UpstreamMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ===== API 请求体 =====

export interface V3CommunicateRequest {
  query: string;
  messages?: V3UpstreamMessage[];
  conversation_id?: string;
  session_id?: string;
  user_id?: string;
  app_id?: string;
  stream?: boolean;
}

// ===== API 响应体 =====

export interface V3CommunicateData {
  response_content?: string;
  response_evidence?: EvidenceRef[];
  intent_type?: string;
  risk_level?: RiskLevel;
  quality_decision?: QualityDecision;
  trace_id?: string;
  clarify_question?: ClarifyQuestion | null;
}

export interface V3CommunicateResponse {
  status: V3ResponseStatus;
  data: V3CommunicateData | null;
  error: V3ErrorInfo | null;
}

// ===== SSE 事件类型 =====

export interface V3TokenEvent {
  content: string;
  index?: number;
}

export interface V3DoneEvent {
  response_evidence?: EvidenceRef[];
  trace_id?: string;
  quality_decision?: QualityDecision;
  risk_level?: RiskLevel;
}

export interface V3ErrorEvent {
  code?: string;
  message: string;
  recoverable?: boolean;
}

// ===== 工具函数 =====

/**
 * 生成前端消息 ID
 */
export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * 判断是否为已知的 V3 status
 */
export function isKnownV3Status(status: string): status is V3ResponseStatus {
  return ['success', 'clarify', 'pending_review', 'error'].includes(status);
}
