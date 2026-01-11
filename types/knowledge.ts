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
