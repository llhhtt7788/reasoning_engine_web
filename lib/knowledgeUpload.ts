import type { KnowledgeUpload, KnowledgeUploadResponse, KnowledgeUploadsListResponse } from '@/types/knowledge';
import { resolveIdentityDefaults } from '@/lib/identityDefaults';

export type KnowledgeUploadInput = {
  file: File;
  userId?: string;
  conversationId?: string;
  appId?: string;
  tags?: string[];
  libraryId?: string;
};

export async function uploadKnowledgeDocument(input: KnowledgeUploadInput): Promise<KnowledgeUploadResponse> {
  const { user_id, app_id } = resolveIdentityDefaults({ userId: input.userId, appId: input.appId });

  const form = new FormData();
  form.append('file', input.file);
  form.append('user_id', user_id);
  if (input.conversationId) form.append('conversation_id', input.conversationId);
  form.append('app_id', app_id);
  if (input.tags && input.tags.length > 0) form.append('tags', input.tags.join(','));
  if (input.libraryId) form.append('library_id', input.libraryId);

  const res = await fetch('/api/knowledge/documents/upload', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Upload failed: ${res.status} ${res.statusText}${txt ? `\n${txt}` : ''}`);
  }

  return (await res.json()) as KnowledgeUploadResponse;
}

export type ListKnowledgeUploadsInput = {
  userId?: string;
  limit?: number;
  offset?: number;
  libraryId?: string;
};

function normalizeListResponse(json: unknown): KnowledgeUploadsListResponse {
  // Backend may return either {items:[...]} or a plain array. We normalize.
  if (Array.isArray(json)) {
    return { items: json as KnowledgeUpload[] };
  }
  if (json && typeof json === 'object') {
    const rec = json as Record<string, unknown>;
    const items = Array.isArray(rec.items) ? (rec.items as KnowledgeUpload[]) : Array.isArray(rec.uploads) ? (rec.uploads as KnowledgeUpload[]) : [];
    const total = typeof rec.total === 'number' ? rec.total : undefined;
    const limit = typeof rec.limit === 'number' ? rec.limit : undefined;
    const offset = typeof rec.offset === 'number' ? rec.offset : undefined;
    return { items, total, limit, offset, ...rec } as KnowledgeUploadsListResponse;
  }
  return { items: [] };
}

export async function listKnowledgeUploads(input: ListKnowledgeUploadsInput): Promise<KnowledgeUploadsListResponse> {
  const { user_id } = resolveIdentityDefaults({ userId: input.userId });

  const qs = new URLSearchParams();
  qs.set('user_id', user_id);
  qs.set('limit', String(input.limit ?? 50));
  qs.set('offset', String(input.offset ?? 0));
  if (input.libraryId) qs.set('library_id', input.libraryId);

  const res = await fetch(`/api/knowledge/documents?${qs.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`List failed: ${res.status} ${res.statusText}${txt ? `\n${txt}` : ''}`);
  }

  const json = (await res.json()) as unknown;
  return normalizeListResponse(json);
}

export async function getKnowledgeUploadDetail(uploadId: string): Promise<KnowledgeUpload> {
  const res = await fetch(`/api/knowledge/documents/${encodeURIComponent(uploadId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Detail failed: ${res.status} ${res.statusText}${txt ? `\n${txt}` : ''}`);
  }

  return (await res.json()) as KnowledgeUpload;
}
