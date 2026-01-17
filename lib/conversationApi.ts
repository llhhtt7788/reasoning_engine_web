// lib/conversationApi.ts
/**
 * Conversation API Client
 * 对接后端的会话列表相关接口
 */

export type ConversationItem = {
  conversation_id: string;
  conversation_root_id?: string;
  title?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: string;
  app_id?: string;
};

export type ConversationListResponse = {
  items: ConversationItem[];
  limit: number;
  offset: number;
};

export type SessionItem = {
  session_id: string;
  conversation_id: string;
  started_at?: string | null;
  ended_at?: string | null;
  topic_tag?: string | null;
  metadata?: Record<string, unknown>;
};

export type SessionListResponse = {
  items: SessionItem[];
  limit: number;
  offset: number;
};

/**
 * 获取用户的会话列表
 */
export async function fetchConversationList(params: {
  userId: string;
  appId?: string;
  limit?: number;
  offset?: number;
}): Promise<ConversationListResponse> {
  const { userId, appId, limit = 20, offset = 0 } = params;

  const queryParams = new URLSearchParams({
    user_id: userId,
    limit: String(limit),
    offset: String(offset),
  });

  if (appId) {
    queryParams.set('app_id', appId);
  }

  const response = await fetch(`/api/v1/conversations?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 获取某个会话线程下的分段列表
 */
export async function fetchConversationSessions(params: {
  conversationId: string;
  limit?: number;
  offset?: number;
}): Promise<SessionListResponse> {
  const { conversationId, limit = 50, offset = 0 } = params;

  const queryParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/sessions?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }

  return response.json();
}
