import { resolveIdentityDefaults } from '@/lib/identityDefaults';

export type NonStreamChatInput = {
  user: string;
  /** If omitted, will be resolved from defaults (env -> PRD default). */
  user_id?: string;
  /** If omitted, will be resolved from defaults (env -> PRD default). */
  app_id?: string;

  conversation_id?: string;
  conversation_root_id?: string;
  session_id?: string;

  // Optional passthrough
  system?: string;
  llm_index?: number;
  tenant_id?: string;
  thread_id?: string;

  /** VL image url (full, backend-reachable). If present and agent_name not set, backend will auto-route. */
  image_url?: string | null;

  /** Force non-stream mode for debugging. Defaults to false here. */
  stream?: false;
};

export type NonStreamChatResult = {
  status: number;
  ok: boolean;
  text: string;
  json: unknown | null;
  requestBody: Record<string, unknown>;
};

export default async function chatContextNonStream(input: NonStreamChatInput): Promise<NonStreamChatResult> {
  const identity = resolveIdentityDefaults({
    userId: input.user_id,
    appId: input.app_id,
  });

  const requestBody: Record<string, unknown> = {
    user: input.user,
    stream: false,

    user_id: identity.user_id,
    app_id: identity.app_id,
  };

  if (input.conversation_id) requestBody.conversation_id = input.conversation_id;
  if (input.conversation_root_id) requestBody.conversation_root_id = input.conversation_root_id;
  if (input.session_id) requestBody.session_id = input.session_id;

  if (input.system) requestBody.system = input.system;
  if (input.llm_index !== undefined) requestBody.llm_index = input.llm_index;
  if (input.tenant_id) requestBody.tenant_id = input.tenant_id;
  if (input.thread_id) requestBody.thread_id = input.thread_id;
  if (input.image_url) requestBody.image_url = input.image_url;

  const res = await fetch('/api/v1/chat/context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');
  const json = (() => {
    try {
      return text ? (JSON.parse(text) as unknown) : null;
    } catch {
      return null;
    }
  })();

  return {
    status: res.status,
    ok: res.ok,
    text,
    json,
    requestBody,
  };
}
