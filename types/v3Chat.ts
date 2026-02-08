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
export type V3StreamStage = 'searching' | 'generating' | 'validating';

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

export interface V3EvidenceChunk {
  id?: string;
  chunk_id?: string;
  document_id?: string;
  title?: string;
  preview?: string;
  score?: number | null;
  url?: string;
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

  // 可选：图片资产（用户消息）
  image_asset_id?: string;
  display_url?: string;

  // 可选：视觉回答元数据（assistant 消息）
  vision_meta?: Record<string, unknown>;
}

// ===== 消息内容类型 =====

export type V3MessageContentPart =
  | { type: 'text'; text?: string }
  | { type: 'image_url'; image_url: { url: string } };

export type V3MessageContent = string | V3MessageContentPart[];

// ===== 上行消息格式（OpenAI 兼容） =====

export interface V3UpstreamMessage {
  role: 'user' | 'assistant';
  content: V3MessageContent;
}

// ===== API 请求体 =====

export interface V3CommunicateRequest {
  // v3 legacy fields (kept for backward compatibility)
  query?: string;
  messages?: V3UpstreamMessage[];

  // v1-compatible fields (preferred in this repo)
  /** v1 uses `user` as the top-level prompt text */
  user?: string;
  /** PRD default: conversation_root_id = user_id */
  conversation_root_id?: string;
  /** v1 VL: 上传后的图片资产 ID（与 image_url 互斥，优先使用此字段） */
  image_asset_id?: string;
  /** VL 任务类型，默认 "auto" */
  vision_task?: string;

  // common identity/session fields
  conversation_id?: string;
  session_id?: string;
  user_id?: string;
  app_id?: string;
  stream?: boolean;

  /** Agent 路由覆写（例如："vl_agent"） */
  agent_mode?: string;

  // Agentic RAG 检索范围参数
  library_ids?: string[];
  source_ids?: string[];
  retrieval_top_k?: number;
  retrieval_max_subqueries?: number;
}

// ===== API 响应体 =====

export interface V3CommunicateData {
  response_content?: string;
  response_evidence?: EvidenceRef[];
  intent_type?: string;
  complexity?: string;
  risk_level?: RiskLevel;
  route_decision?: string;
  planner_mode?: string;
  quality_decision?: QualityDecision;
  quality_check?: Record<string, unknown>;
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

export interface V3StatusEvent {
  stage?: V3StreamStage | string;
}

export interface V3EvidenceEvent {
  chunks?: V3EvidenceChunk[];
}

export interface V3DoneEvent {
  response_evidence?: EvidenceRef[];
  citations?: EvidenceRef[];
  trace_id?: string;
  quality_decision?: QualityDecision;
  risk_level?: RiskLevel;
  route_decision?: string;
  intent_type?: string;
  quality_check?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  retrieval_plan?: Record<string, unknown>;
  retrieval_timeline?: Record<string, unknown>[];
  retrieval_stats?: Record<string, unknown>;
  vision_meta?: Record<string, unknown>;
}

export interface V3ErrorEvent {
  code?: string;
  message: string;
  recoverable?: boolean;
}

// ===== Agentic RAG SSE 事件 =====

export interface V3SearchPlanEvent {
  query: string;
  subqueries: string[];
  source_count: number;
  sources: Array<{ source_id: string; backend_type?: string; name?: string }>;
}

export interface V3SearchStepEvent {
  source_id: string;
  backend_type: string;
  query: string;
  hits: number;
  selected: number;
  reason?: string;
  elapsed_ms: number;
}

export interface V3RerankStepEvent {
  input_candidates: number;
  deduped_candidates: number;
  selected: number;
}

export interface V3GapCheckEvent {
  need_more: boolean;
}

export interface V3RouteEvent {
  route_decision: string;
  intent_type?: string;
  complexity?: string;
  risk_level?: string;
  [key: string]: unknown;
}

export interface V3ExecuteEvent {
  agent_name: string;
  step: string;
  [key: string]: unknown;
}

// ===== RAG 统一时间轴事件 =====

export type RagFlowEventType =
  | 'status'
  | 'evidence'
  | 'search_plan'
  | 'search_step'
  | 'rerank_step'
  | 'gap_check'
  | 'route'
  | 'execute'
  | 'error';

export interface RagFlowEvent {
  type: RagFlowEventType;
  timestamp: number;
  data: unknown;
}

export interface V3TraceData {
  trace_id: string;
  created_at?: string;
  status?: string;
  source?: string;
  stream?: boolean;

  conversation_id?: string;
  session_id?: string;
  user_id?: string;
  app_id?: string;
  query?: string;

  intent_type?: string;
  complexity?: string;
  risk_level?: string;
  route_decision?: string;
  planner_mode?: string;
  agent_name?: string;

  quality_decision?: string;
  quality_check?: Record<string, unknown> | null;
  retrieval_status?: string;
  knowledge_status?: string;
  retrieval_reason?: string;

  plan_output?: Record<string, unknown> | null;
  plan_steps?: Array<Record<string, unknown>> | null;
  plan_subtasks?: string[] | null;
  authorized_tools?: string[] | null;

  clarify_question?: Record<string, unknown> | null;
  tool_results?: Array<Record<string, unknown>> | null;
  evidence_citations?: EvidenceRef[] | null;
  response_evidence?: EvidenceRef[] | null;
  response_content?: string | null;

  node_history?: Array<Record<string, unknown>>;
  error?: Record<string, unknown> | null;
}

export interface V3TraceResponse {
  status: 'success' | 'error';
  data: V3TraceData | null;
  error: V3ErrorInfo | null;
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
