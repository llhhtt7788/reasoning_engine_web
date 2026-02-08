// store/v3ChatStore.ts
/**
 * V3 Chat Store - Zustand 状态管理
 * 基于 w.3.0.0 PRD 规范
 */

import { create } from 'zustand';
import {
  V3ChatMessage,
  V3UpstreamMessage,
  MessageStatus,
  EvidenceRef,
  V3EvidenceChunk,
  V3TraceData,
  ClarifyQuestion,
  V3ErrorInfo,
  V3StreamStage,
  RiskLevel,
  QualityDecision,
  generateMessageId,
  RagFlowEvent,
  V3SearchPlanEvent,
  V3SearchStepEvent,
  V3RerankStepEvent,
  V3GapCheckEvent,
} from '@/types/v3Chat';
import { v3Communicate } from '@/lib/v3Api';
import { v3StreamChat } from '@/lib/v3SseClient';
import { fetchV3Trace } from '@/lib/v3TraceApi';
import { resolveIdentityDefaults } from '@/lib/identityDefaults';
import { useIdentityStore } from '@/store/identityStore';

interface V3ChatState {
  // 展示用消息列表
  messages: V3ChatMessage[];

  // 上行消息列表（OpenAI 兼容格式，只包含 user/assistant 文本）
  upstreamMessages: V3UpstreamMessage[];

  // 流式生成状态
  isStreaming: boolean;

  // 当前流式消息 ID（用于追加 token）
  streamingMessageId: string | null;

  // AbortController 引用（用于中断流式）
  abortController: AbortController | null;

  // V3 流式阶段与证据预览
  streamStage: V3StreamStage | null;
  streamEvidence: V3EvidenceChunk[];

  // Trace 可视化数据
  activeTraceId: string | null;
  traceDataById: Record<string, V3TraceData>;
  traceLoading: boolean;
  traceError: string | null;

  // 会话标识
  conversationId: string;
  sessionId: string;

  // ===== Actions =====

  // 添加用户消息
  addUserMessage: (content: string, imageInfo?: { image_asset_id: string; display_url: string }) => void;

  // 添加 loading 状态的 assistant 消息（流式开始）
  addLoadingMessage: () => string;

  // 追加 token 内容到当前流式消息
  appendTokenContent: (content: string) => void;

  // 完成流式消息（done 事件）
  finalizeMessage: (data: {
    evidence?: EvidenceRef[];
    trace_id?: string;
    quality_decision?: QualityDecision;
    risk_level?: RiskLevel;
    vision_meta?: Record<string, unknown>;
  }) => void;

  // 添加成功的 assistant 消消息（非流式）
  addAssistantMessage: (content: string, data?: {
    evidence?: EvidenceRef[];
    trace_id?: string;
    quality_decision?: QualityDecision;
    risk_level?: RiskLevel;
    intent_type?: string;
  }) => void;

  // 添加澄清卡片
  addClarifyCard: (clarifyQuestion: ClarifyQuestion, trace_id?: string) => void;

  // 添加待审核卡片
  addPendingReviewCard: (trace_id?: string) => void;

  // 添加错误卡片
  addErrorCard: (error: V3ErrorInfo, trace_id?: string) => void;

  // 更新消息状态为错误（流式中断/错误）
  markMessageAsError: (messageId: string, error: V3ErrorInfo) => void;

  // 标记消息为已停止
  markMessageAsStopped: (messageId: string) => void;

  // 设置流式状态
  setStreaming: (streaming: boolean, controller?: AbortController | null) => void;
  setStreamStage: (stage: V3StreamStage | null) => void;
  setStreamEvidence: (chunks: V3EvidenceChunk[]) => void;
  setActiveTraceId: (traceId: string | null) => void;
  loadTrace: (traceId: string, force?: boolean) => Promise<void>;

  // 中断当前流式
  abortStream: () => void;

  // 清空消息
  clearMessages: () => void;

  // 设置会话 ID
  setConversationId: (id: string) => void;
  setSessionId: (id: string) => void;

  // 获取用于上行的 messages（截断）
  getUpstreamMessages: (maxCount?: number) => V3UpstreamMessage[];

  // ===== RAG 检索范围 =====
  selectedLibraryIds: string[];
  selectedSourceIds: string[];
  retrievalTopK: number | null;
  retrievalMaxSubqueries: number | null;

  // ===== RAG 流程状态 =====
  ragFlowEvents: RagFlowEvent[];
  searchPlan: V3SearchPlanEvent | null;
  searchSteps: V3SearchStepEvent[];
  rerankStep: V3RerankStepEvent | null;
  gapCheck: V3GapCheckEvent | null;

  // ===== RAG Actions =====
  setSelectedLibraryIds: (ids: string[]) => void;
  setSelectedSourceIds: (ids: string[]) => void;
  setRetrievalTopK: (v: number | null) => void;
  setRetrievalMaxSubqueries: (v: number | null) => void;
  appendRagFlowEvent: (event: RagFlowEvent) => void;
  setSearchPlan: (plan: V3SearchPlanEvent | null) => void;
  appendSearchStep: (step: V3SearchStepEvent) => void;
  setRerankStep: (step: V3RerankStepEvent | null) => void;
  setGapCheck: (check: V3GapCheckEvent | null) => void;
  clearRagState: () => void;

  /**
   * 统一发送入口（支持非流式 + 流式），可选附带图片资产 ID。
   * - 当检测到图片时，会自动设置 agent_mode='vl_agent'
   * - 只传 image_asset_id，不传 image_url（避免内外网地址混用）
   */
  sendMessage: (params: {
    queryText: string;
    stream?: boolean;
    imageAssetId?: string;
    displayUrl?: string;
    agent_mode?: string;
    // identity
    app_id?: string;
    user_id?: string;
  }) => Promise<void>;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const useV3ChatStore = create<V3ChatState>((set, get) => ({
  messages: [],
  upstreamMessages: [],
  isStreaming: false,
  streamingMessageId: null,
  abortController: null,
  streamStage: null,
  streamEvidence: [],
  activeTraceId: null,
  traceDataById: {},
  traceLoading: false,
  traceError: null,
  conversationId: generateId(),
  sessionId: generateId(),

  // RAG state
  selectedLibraryIds: [],
  selectedSourceIds: [],
  retrievalTopK: null,
  retrievalMaxSubqueries: null,
  ragFlowEvents: [],
  searchPlan: null,
  searchSteps: [],
  rerankStep: null,
  gapCheck: null,

  addUserMessage: (content: string, imageInfo?: { image_asset_id: string; display_url: string }) => {
    const message: V3ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      status: 'normal',
      content,
      created_at: Date.now(),
      ...(imageInfo ? { image_asset_id: imageInfo.image_asset_id, display_url: imageInfo.display_url } : {}),
    };

    set((state) => ({
      messages: [...state.messages, message],
      upstreamMessages: [...state.upstreamMessages, { role: 'user', content }],
    }));
  },

  addLoadingMessage: () => {
    const id = generateMessageId();
    const message: V3ChatMessage = {
      id,
      role: 'assistant',
      status: 'loading',
      content: '',
      created_at: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, message],
      streamingMessageId: id,
      isStreaming: true,
    }));

    return id;
  },

  appendTokenContent: (content: string) => {
    set((state) => {
      const { streamingMessageId, messages } = state;
      if (!streamingMessageId) return state;

      return {
        messages: messages.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, content: msg.content + content }
            : msg
        ),
      };
    });
  },

  finalizeMessage: (data) => {
    set((state) => {
      const { streamingMessageId, messages } = state;
      if (!streamingMessageId) {
        // 兜底：如果已经没有 streamingMessageId，但外部仍调用 finalize（例如 EOF 收尾），确保状态回落
        return {
          ...state,
          isStreaming: false,
          streamingMessageId: null,
          abortController: null,
        };
      }

      const finalizedMessages = messages.map((msg) =>
        msg.id === streamingMessageId
          ? {
              ...msg,
              status: 'normal' as MessageStatus,
              evidence: data.evidence,
              trace_id: data.trace_id,
              quality_decision: data.quality_decision,
              risk_level: data.risk_level,
              ...(data.vision_meta ? { vision_meta: data.vision_meta } : {}),
            }
          : msg
      );

      const finalizedMsg = finalizedMessages.find((m) => m.id === streamingMessageId);
      const newUpstream = finalizedMsg
        ? [...state.upstreamMessages, { role: 'assistant' as const, content: finalizedMsg.content }]
        : state.upstreamMessages;

      return {
        messages: finalizedMessages,
        upstreamMessages: newUpstream,
        isStreaming: false,
        streamingMessageId: null,
        abortController: null,
      };
    });
  },

  addAssistantMessage: (content, data) => {
    const message: V3ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      status: 'normal',
      content,
      created_at: Date.now(),
      evidence: data?.evidence,
      trace_id: data?.trace_id,
      quality_decision: data?.quality_decision,
      risk_level: data?.risk_level,
      intent_type: data?.intent_type,
    };

    set((state) => ({
      messages: [...state.messages, message],
      upstreamMessages: [...state.upstreamMessages, { role: 'assistant', content }],
    }));
  },

  addClarifyCard: (clarifyQuestion, trace_id) => {
    const message: V3ChatMessage = {
      id: generateMessageId(),
      role: 'system',
      status: 'clarify',
      content: clarifyQuestion.question,
      created_at: Date.now(),
      clarify_question: clarifyQuestion,
      trace_id,
    };

    set((state) => ({
      messages: [...state.messages, message],
      isStreaming: false,
      streamingMessageId: null,
    }));
  },

  addPendingReviewCard: (trace_id) => {
    const message: V3ChatMessage = {
      id: generateMessageId(),
      role: 'system',
      status: 'pending_review',
      content: '内容正在人工审核中，请稍后查看。',
      created_at: Date.now(),
      trace_id,
    };

    set((state) => ({
      messages: [...state.messages, message],
      isStreaming: false,
      streamingMessageId: null,
    }));
  },

  addErrorCard: (error, trace_id) => {
    const message: V3ChatMessage = {
      id: generateMessageId(),
      role: 'system',
      status: 'error',
      content: error.message,
      created_at: Date.now(),
      error,
      trace_id,
    };

    set((state) => ({
      messages: [...state.messages, message],
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
    }));
  },

  markMessageAsError: (messageId, error) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: 'error' as MessageStatus, error }
          : msg
      ),
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
    }));
  },

  markMessageAsStopped: (messageId) => {
    set((state) => {
      const messages = state.messages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              status: 'normal' as MessageStatus,
              content: msg.content + '\n\n（已停止生成）',
            }
          : msg
      );

      // 将已停止的消息也加入上行列表
      const stoppedMsg = messages.find((m) => m.id === messageId);
      const newUpstream = stoppedMsg && stoppedMsg.content.trim()
        ? [...state.upstreamMessages, { role: 'assistant' as const, content: stoppedMsg.content }]
        : state.upstreamMessages;

      return {
        messages,
        upstreamMessages: newUpstream,
        isStreaming: false,
        streamingMessageId: null,
        abortController: null,
      };
    });
  },

  setStreaming: (streaming, controller = null) => {
    set({ isStreaming: streaming, abortController: controller });
  },

  setStreamStage: (stage) => set({ streamStage: stage }),

  setStreamEvidence: (chunks) => set({ streamEvidence: chunks }),

  setActiveTraceId: (traceId) => set({ activeTraceId: traceId }),

  loadTrace: async (traceId, force = false) => {
    const tid = String(traceId || '').trim();
    if (!tid) return;

    const cached = get().traceDataById[tid];
    if (cached && !force) {
      set({ activeTraceId: tid, traceError: null });
      return;
    }

    set({ traceLoading: true, traceError: null, activeTraceId: tid });
    const resp = await fetchV3Trace(tid);
    if (resp.status === 'success' && resp.data) {
      set((state) => ({
        traceLoading: false,
        traceError: null,
        traceDataById: {
          ...state.traceDataById,
          [tid]: resp.data!,
        },
      }));
      return;
    }

    set({
      traceLoading: false,
      traceError: resp.error?.message || 'trace 查询失败',
    });
  },

  abortStream: () => {
    const { abortController, streamingMessageId } = get();
    if (abortController) {
      abortController.abort();
    }
    if (streamingMessageId) {
      get().markMessageAsStopped(streamingMessageId);
    }
  },

  clearMessages: () => {
    set({
      messages: [],
      upstreamMessages: [],
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
      streamStage: null,
      streamEvidence: [],
      activeTraceId: null,
      traceDataById: {},
      traceLoading: false,
      traceError: null,
      // RAG state
      ragFlowEvents: [],
      searchPlan: null,
      searchSteps: [],
      rerankStep: null,
      gapCheck: null,
    });
  },

  setConversationId: (id) => set({ conversationId: id }),
  setSessionId: (id) => set({ sessionId: id }),

  getUpstreamMessages: (maxCount = 20) => {
    const { upstreamMessages } = get();
    if (upstreamMessages.length <= maxCount) {
      return upstreamMessages;
    }
    return upstreamMessages.slice(-maxCount);
  },

  // RAG actions
  setSelectedLibraryIds: (ids) => set({ selectedLibraryIds: ids }),
  setSelectedSourceIds: (ids) => set({ selectedSourceIds: ids }),
  setRetrievalTopK: (v) => set({ retrievalTopK: v }),
  setRetrievalMaxSubqueries: (v) => set({ retrievalMaxSubqueries: v }),
  appendRagFlowEvent: (event) => set((s) => ({ ragFlowEvents: [...s.ragFlowEvents, event] })),
  setSearchPlan: (plan) => set({ searchPlan: plan }),
  appendSearchStep: (step) => set((s) => ({ searchSteps: [...s.searchSteps, step] })),
  setRerankStep: (step) => set({ rerankStep: step }),
  setGapCheck: (check) => set({ gapCheck: check }),
  clearRagState: () => set({
    ragFlowEvents: [],
    searchPlan: null,
    searchSteps: [],
    rerankStep: null,
    gapCheck: null,
  }),

  sendMessage: async ({ queryText, stream = true, imageAssetId, displayUrl, agent_mode, app_id, user_id }) => {
    const trimmed = queryText.trim();
    const hasImages = !!imageAssetId;

    // 允许"只发图不发字"
    const displayText = trimmed.length > 0 ? trimmed : (hasImages ? '[图片]' : '');
    if (!displayText) return;

    // 1) 写入 user message（展示层 + display_url 用于渲染图片）
    const imageInfo = hasImages && displayUrl
      ? { image_asset_id: imageAssetId, display_url: displayUrl }
      : undefined;
    get().addUserMessage(displayText, imageInfo);
    get().setStreamEvidence([]);
    get().setStreamStage(stream ? 'searching' : null);
    get().clearRagState();

    const identity = resolveIdentityDefaults({
      userId: user_id ?? useIdentityStore.getState().userId,
      appId: app_id ?? useIdentityStore.getState().appId,
    });

    const conversation_root_id = useIdentityStore.getState().conversationRootId || identity.user_id;

    const { selectedLibraryIds, selectedSourceIds, retrievalTopK, retrievalMaxSubqueries } = get();

    // v1-compatible payload — 只传 image_asset_id，不传 image_url
    const v1Payload = {
      user: trimmed.length > 0 ? trimmed : '看下图片',
      stream,
      conversation_id: get().conversationId,
      conversation_root_id,
      session_id: get().sessionId,
      user_id: identity.user_id,
      app_id: identity.app_id,
      image_asset_id: hasImages ? imageAssetId : undefined,
      vision_task: hasImages ? 'auto' : undefined,
      // keep: allow explicit agent override, but default to vl_agent when we have images
      agent_mode: agent_mode ?? (hasImages ? 'vl_agent' : undefined),
      // RAG scope params
      ...(selectedLibraryIds.length > 0 ? { library_ids: selectedLibraryIds } : {}),
      ...(selectedSourceIds.length > 0 ? { source_ids: selectedSourceIds } : {}),
      ...(retrievalTopK != null ? { retrieval_top_k: retrievalTopK } : {}),
      ...(retrievalMaxSubqueries != null ? { retrieval_max_subqueries: retrievalMaxSubqueries } : {}),
    };

    if (!stream) {
      const resp = await v3Communicate(v1Payload);
      if (resp.status === 'success') {
        get().addAssistantMessage(resp.data?.response_content || '', {
          evidence: resp.data?.response_evidence,
          trace_id: resp.data?.trace_id,
          quality_decision: resp.data?.quality_decision,
          risk_level: resp.data?.risk_level,
          intent_type: resp.data?.intent_type,
        });
        if (resp.data?.trace_id) {
          get().setActiveTraceId(resp.data.trace_id);
          void get().loadTrace(resp.data.trace_id);
        }
      } else if (resp.status === 'clarify' && resp.data?.clarify_question) {
        get().addClarifyCard(resp.data.clarify_question, resp.data.trace_id);
        if (resp.data?.trace_id) {
          get().setActiveTraceId(resp.data.trace_id);
          void get().loadTrace(resp.data.trace_id);
        }
      } else if (resp.status === 'pending_review') {
        get().addPendingReviewCard(resp.data?.trace_id);
        if (resp.data?.trace_id) {
          get().setActiveTraceId(resp.data.trace_id);
          void get().loadTrace(resp.data.trace_id);
        }
      } else {
        get().addErrorCard(resp.error ?? { message: '请求失败', recoverable: true }, resp.data?.trace_id);
      }
      get().setStreamStage(null);
      return;
    }

    // 3) 流式：加入 loading assistant，开始收 token
    const messageId = get().addLoadingMessage();

    const controller = v3StreamChat(v1Payload, {
      onStatus: (ev) => {
        const stage = ev.stage;
        if (stage === 'searching' || stage === 'generating' || stage === 'validating') {
          get().setStreamStage(stage);
        }
        get().appendRagFlowEvent({ type: 'status', timestamp: Date.now(), data: ev });
      },
      onEvidence: (ev) => {
        get().setStreamEvidence(Array.isArray(ev.chunks) ? ev.chunks : []);
        get().appendRagFlowEvent({ type: 'evidence', timestamp: Date.now(), data: ev });
      },
      onToken: (ev) => {
        if (ev.content) get().appendTokenContent(ev.content);
      },
      onDone: (ev) => {
        const evidence = (ev.response_evidence ?? ev.citations) as EvidenceRef[] | undefined;
        get().finalizeMessage({
          evidence,
          trace_id: ev.trace_id,
          quality_decision: ev.quality_decision,
          risk_level: ev.risk_level,
          vision_meta: ev.vision_meta,
        });
        get().setStreamStage(null);
        if (ev.trace_id) {
          get().setActiveTraceId(ev.trace_id);
          void get().loadTrace(ev.trace_id);
        }
      },
      onError: (ev) => {
        get().markMessageAsError(messageId, {
          code: ev.code,
          message: ev.message,
          recoverable: ev.recoverable,
        });
        get().setStreamStage(null);
        get().appendRagFlowEvent({ type: 'error', timestamp: Date.now(), data: ev });
      },
      onSearchPlan: (ev) => {
        get().setSearchPlan(ev);
        get().appendRagFlowEvent({ type: 'search_plan', timestamp: Date.now(), data: ev });
      },
      onSearchStep: (ev) => {
        get().appendSearchStep(ev);
        get().appendRagFlowEvent({ type: 'search_step', timestamp: Date.now(), data: ev });
      },
      onRerankStep: (ev) => {
        get().setRerankStep(ev);
        get().appendRagFlowEvent({ type: 'rerank_step', timestamp: Date.now(), data: ev });
      },
      onGapCheck: (ev) => {
        get().setGapCheck(ev);
        get().appendRagFlowEvent({ type: 'gap_check', timestamp: Date.now(), data: ev });
      },
      onRoute: (ev) => {
        get().appendRagFlowEvent({ type: 'route', timestamp: Date.now(), data: ev });
      },
      onExecute: (ev) => {
        get().appendRagFlowEvent({ type: 'execute', timestamp: Date.now(), data: ev });
      },
    });

    get().setStreaming(true, controller);
  },
}));
