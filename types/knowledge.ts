export type UploadStatus = 'stored' | 'indexing' | 'indexed' | 'failed';

export interface KnowledgeUpload {
  upload_id: string;
  status: UploadStatus;

  original_filename?: string;
  stored_filename?: string;
  content_type?: string | null;
  size_bytes?: number;
  sha256?: string;
  stored_path?: string;
  created_at?: string;

  error_message?: string | null;

  meta?: {
    user_id?: string;
    conversation_id?: string | null;
    app_id?: string | null;
    tags?: string[];
    [k: string]: unknown;
  };

  // Optional ingestion summary fields (backend may or may not return these)
  document_id?: string;
  page_count?: number;
  chunk_count?: number;
  embedding_model?: string;
  embedding_dims?: number;

  library_id?: string;

  [k: string]: unknown;
}

export interface KnowledgeUploadsListResponse {
  items: KnowledgeUpload[];
  total?: number;
  limit?: number;
  offset?: number;
  [k: string]: unknown;
}

// Back-compat alias used by the existing upload panel.
export type KnowledgeUploadResponse = KnowledgeUpload;

// ===== 知识引擎类型 =====

export type LibraryStatus = 'active' | 'disabled';

export type SourceHealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export type BackendType = 'milvus' | 'elasticsearch' | 'pgvector' | 'qdrant' | 'weaviate' | string;

export interface KnowledgeLibrary {
  library_id: string;
  name: string;
  description?: string;
  status: LibraryStatus;
  source_ids?: string[];
  document_count?: number;
  source_count?: number;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface KnowledgeSource {
  source_id: string;
  name: string;
  backend_type: BackendType;
  health_status: SourceHealthStatus;
  library_id?: string;
  library_name?: string;
  connection_profile_id?: string;
  description?: string;
  last_health_check?: string;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

export interface ConnectionProfile {
  profile_id: string;
  name: string;
  backend_type: BackendType;
  connection_params?: Record<string, unknown>;
  description?: string;
  created_at?: string;
  updated_at?: string;
  [k: string]: unknown;
}

// ===== 知识库详情 =====

export interface LibraryDetail extends KnowledgeLibrary {
  upload_count?: number;
  source_status_summary?: Record<string, number>; // e.g. { healthy: 2, unhealthy: 1 }
  sources?: KnowledgeSource[];
}

// ===== 检索 Trace 回放 =====

export interface RetrievalTraceData {
  trace_id: string;
  query?: string;
  retrieval_plan?: {
    query?: string;
    subqueries?: string[];
    sources?: Array<{ source_id: string; backend_type?: string; name?: string }>;
    [k: string]: unknown;
  };
  retrieval_timeline?: Array<{
    type: string;
    timestamp?: number;
    source_id?: string;
    backend_type?: string;
    query?: string;
    hits?: number;
    selected?: number;
    elapsed_ms?: number;
    reason?: string;
    [k: string]: unknown;
  }>;
  retrieval_stats?: {
    total_sources?: number;
    total_hits?: number;
    total_selected?: number;
    total_elapsed_ms?: number;
    retrieval_status?: string;
    knowledge_status?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

// ===== 删除响应 =====

export interface DeleteLibraryResponse {
  deleted?: boolean;
  force?: boolean;
  message?: string;
  [k: string]: unknown;
}

export interface DeleteDocumentResponse {
  deleted?: boolean;
  milvus_deleted_chunks?: number;
  milvus_cleanup_reason?: string;
  [k: string]: unknown;
}

export interface DeleteSourceResponse {
  deleted?: boolean;
  message?: string;
  [k: string]: unknown;
}

export interface DeleteConnectionProfileResponse {
  deleted?: boolean;
  force?: boolean;
  message?: string;
  [k: string]: unknown;
}

// ===== 检索调试类型 =====

export interface RetrievalPlanRequest {
  query: string;
  library_ids?: string[];
  source_ids?: string[];
  top_k?: number;
  max_subqueries?: number;
}

export interface RetrievalPlanResponse {
  query: string;
  subqueries: string[];
  sources: Array<{ source_id: string; backend_type?: string; name?: string }>;
  [k: string]: unknown;
}

export interface RetrievalPreviewRequest {
  query: string;
  library_ids?: string[];
  source_ids?: string[];
  top_k?: number;
  max_subqueries?: number;
}

export interface RetrievalPreviewResponse {
  results: Array<{
    chunk_id?: string;
    document_id?: string;
    title?: string;
    preview?: string;
    score?: number;
    source_id?: string;
    backend_type?: string;
    [k: string]: unknown;
  }>;
  stats?: {
    total_hits?: number;
    selected?: number;
    elapsed_ms?: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
