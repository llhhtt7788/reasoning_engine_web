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
  ClarifyQuestion,
  V3ErrorInfo,
  RiskLevel,
  QualityDecision,
  generateMessageId,
} from '@/types/v3Chat';
import { v3Communicate } from '@/lib/v3Api';
import { v3StreamChat } from '@/lib/v3SseClient';
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

  // 会话标识
  conversationId: string;
  sessionId: string;

  // ===== Actions =====

  // 添加用户消息
  addUserMessage: (content: string) => void;

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

  // 中断当前流式
  abortStream: () => void;

  // 清空消息
  clearMessages: () => void;

  // 设置会话 ID
  setConversationId: (id: string) => void;
  setSessionId: (id: string) => void;

  // 获取用于上行的 messages（截断）
  getUpstreamMessages: (maxCount?: number) => V3UpstreamMessage[];

  /**
   * 统一发送入口（支持非流式 + 流式），可选附带图片资产 URL。
   * - 当检测到图片时，会自动把最后一个 user message 变成多模态 list，并显式 agent_mode='vl_agent'
   */
  sendMessage: (params: {
    queryText: string;
    stream?: boolean;
    imageUrls?: string[];
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
  conversationId: generateId(),
  sessionId: generateId(),

  addUserMessage: (content: string) => {
    const message: V3ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      status: 'normal',
      content,
      created_at: Date.now(),
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

  sendMessage: async ({ queryText, stream = true, imageUrls = [], agent_mode, app_id, user_id }) => {
    const trimmed = queryText.trim();
    const hasImages = imageUrls.length > 0;

    // 允许“只发图不发字”
    const displayText = trimmed.length > 0 ? trimmed : (hasImages ? '[图片]' : '');
    if (!displayText) return;

    // 1) 写入 user message（展示层仍用纯文本）
    get().addUserMessage(displayText);

    const identity = resolveIdentityDefaults({
      userId: user_id ?? useIdentityStore.getState().userId,
      appId: app_id ?? useIdentityStore.getState().appId,
    });

    const conversation_root_id = useIdentityStore.getState().conversationRootId || identity.user_id;

    // v1-compatible payload (preferred)
    const v1Payload = {
      user: trimmed.length > 0 ? trimmed : '看下图片',
      stream,
      conversation_id: get().conversationId,
      conversation_root_id,
      session_id: get().sessionId,
      user_id: identity.user_id,
      app_id: identity.app_id,
      image_url: hasImages ? imageUrls[0] : undefined,
      // keep: allow explicit agent override, but default to vl_agent when we have images
      agent_mode: agent_mode ?? (hasImages ? 'vl_agent' : undefined),
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
      } else if (resp.status === 'clarify' && resp.data?.clarify_question) {
        get().addClarifyCard(resp.data.clarify_question, resp.data.trace_id);
      } else if (resp.status === 'pending_review') {
        get().addPendingReviewCard(resp.data?.trace_id);
      } else {
        get().addErrorCard(resp.error ?? { message: '请求失败', recoverable: true }, resp.data?.trace_id);
      }
      return;
    }

    // 3) 流式：加入 loading assistant，开始收 token
    const messageId = get().addLoadingMessage();

    const controller = v3StreamChat(v1Payload, {
      onToken: (ev) => {
        if (ev.content) get().appendTokenContent(ev.content);
      },
      onDone: (ev) => {
        get().finalizeMessage({
          evidence: ev.response_evidence,
          trace_id: ev.trace_id,
          quality_decision: ev.quality_decision,
          risk_level: ev.risk_level,
        });
      },
      onError: (ev) => {
        get().markMessageAsError(messageId, {
          code: ev.code,
          message: ev.message,
          recoverable: ev.recoverable,
        });
      },
    });

    get().setStreaming(true, controller);
  },
}));
