// lib/knowledgeApi.ts
/**
 * 知识引擎 API 客户端
 * 所有请求走同源代理 /api/knowledge/...
 */

import type {
  KnowledgeLibrary,
  KnowledgeSource,
  ConnectionProfile,
  RetrievalPlanRequest,
  RetrievalPlanResponse,
  RetrievalPreviewRequest,
  RetrievalPreviewResponse,
  LibraryDetail,
  RetrievalTraceData,
  DeleteLibraryResponse,
  DeleteSourceResponse,
  DeleteConnectionProfileResponse,
  DeleteDocumentResponse,
} from '@/types/knowledge';

// ===== Libraries =====

export async function listLibraries(): Promise<KnowledgeLibrary[]> {
  const res = await fetch('/api/knowledge/libraries', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listLibraries failed: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];
}

export async function createLibrary(data: { name: string; description?: string }): Promise<KnowledgeLibrary> {
  const res = await fetch('/api/knowledge/libraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`createLibrary failed: ${res.status}${txt ? ` ${txt}` : ''}`);
  }
  return res.json();
}

export async function updateLibrary(libraryId: string, data: { name?: string; description?: string }): Promise<KnowledgeLibrary> {
  const res = await fetch(`/api/knowledge/libraries/${encodeURIComponent(libraryId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`updateLibrary failed: ${res.status}`);
  return res.json();
}

export async function patchLibrary(libraryId: string, data: { status?: string }): Promise<KnowledgeLibrary> {
  const res = await fetch(`/api/knowledge/libraries/${encodeURIComponent(libraryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`patchLibrary failed: ${res.status}`);
  return res.json();
}

export async function getLibraryDetail(libraryId: string): Promise<LibraryDetail> {
  const res = await fetch(`/api/knowledge/libraries/${encodeURIComponent(libraryId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`getLibraryDetail failed: ${res.status}`);
  return res.json();
}

export interface DeleteLibraryError {
  status: number;
  body: Record<string, unknown>;
}

export async function deleteLibrary(libraryId: string, force = false): Promise<DeleteLibraryResponse> {
  const qs = force ? '?force=true' : '';
  const res = await fetch(`/api/knowledge/libraries/${encodeURIComponent(libraryId)}${qs}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || '该知识库仍有关联资源，无法直接删除') as Error & { status: number; body: Record<string, unknown> };
    err.status = 409;
    err.body = body;
    throw err;
  }
  if (!res.ok) throw new Error(`deleteLibrary failed: ${res.status}`);
  return res.json();
}

// ===== Sources =====

export async function listSources(libraryId?: string, connectionProfileId?: string): Promise<KnowledgeSource[]> {
  const params = new URLSearchParams();
  if (libraryId) params.set('library_id', libraryId);
  if (connectionProfileId) params.set('connection_profile_id', connectionProfileId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/knowledge/sources${qs}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listSources failed: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];
}

export async function createSource(data: {
  name: string;
  backend_type: string;
  library_id?: string;
  connection_profile_id?: string;
  description?: string;
}): Promise<KnowledgeSource> {
  const res = await fetch('/api/knowledge/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`createSource failed: ${res.status}${txt ? ` ${txt}` : ''}`);
  }
  return res.json();
}

export async function updateSource(sourceId: string, data: Record<string, unknown>): Promise<KnowledgeSource> {
  const res = await fetch(`/api/knowledge/sources/${encodeURIComponent(sourceId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`updateSource failed: ${res.status}`);
  return res.json();
}

export async function checkSourceHealth(sourceId: string): Promise<{ health_status: string; message?: string }> {
  const res = await fetch(`/api/knowledge/sources/${encodeURIComponent(sourceId)}/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`checkSourceHealth failed: ${res.status}`);
  return res.json();
}

export async function deleteSource(sourceId: string): Promise<DeleteSourceResponse> {
  const res = await fetch(`/api/knowledge/sources/${encodeURIComponent(sourceId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`deleteSource failed: ${res.status}`);
  return res.json();
}

// ===== Connection Profiles =====

export async function listConnectionProfiles(): Promise<ConnectionProfile[]> {
  const res = await fetch('/api/knowledge/sources/connection-profiles', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listConnectionProfiles failed: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : Array.isArray(json.items) ? json.items : [];
}

export async function createConnectionProfile(data: {
  name: string;
  backend_type: string;
  connection_params?: Record<string, unknown>;
  description?: string;
}): Promise<ConnectionProfile> {
  const res = await fetch('/api/knowledge/sources/connection-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`createConnectionProfile failed: ${res.status}${txt ? ` ${txt}` : ''}`);
  }
  return res.json();
}

export async function patchConnectionProfile(
  profileId: string,
  data: { name?: string; description?: string; connection_params?: Record<string, unknown> },
): Promise<ConnectionProfile> {
  const res = await fetch(`/api/knowledge/sources/connection-profiles/${encodeURIComponent(profileId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`patchConnectionProfile failed: ${res.status}`);
  return res.json();
}

export async function deleteConnectionProfile(profileId: string, force = false): Promise<DeleteConnectionProfileResponse> {
  const qs = force ? '?force=true' : '';
  const res = await fetch(`/api/knowledge/sources/connection-profiles/${encodeURIComponent(profileId)}${qs}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || '该连接配置仍被数据源引用，无法直接删除') as Error & { status: number; body: Record<string, unknown> };
    err.status = 409;
    err.body = body;
    throw err;
  }
  if (!res.ok) throw new Error(`deleteConnectionProfile failed: ${res.status}`);
  return res.json();
}

// ===== Retrieval Debug =====

export async function fetchRetrievalPlan(req: RetrievalPlanRequest): Promise<RetrievalPlanResponse> {
  const res = await fetch('/api/knowledge/retrieval/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fetchRetrievalPlan failed: ${res.status}`);
  return res.json();
}

export async function fetchRetrievalPreview(req: RetrievalPreviewRequest): Promise<RetrievalPreviewResponse> {
  const res = await fetch('/api/knowledge/retrieval/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fetchRetrievalPreview failed: ${res.status}`);
  return res.json();
}

// ===== Retrieval Trace =====

export async function fetchRetrievalTrace(traceId: string): Promise<RetrievalTraceData> {
  const res = await fetch(`/api/knowledge/retrieval/traces/${encodeURIComponent(traceId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchRetrievalTrace failed: ${res.status}`);
  return res.json();
}

// ===== Documents =====

export async function deleteDocument(uploadId: string): Promise<DeleteDocumentResponse> {
  const res = await fetch(`/api/knowledge/documents/${encodeURIComponent(uploadId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`deleteDocument failed: ${res.status}`);
  return res.json();
}
