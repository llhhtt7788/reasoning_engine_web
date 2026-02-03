export interface UploadVLAssetResponse {
  asset_id: string;
  asset_url: string;

  // Optional debug/verification fields returned by backend
  size_bytes?: number;
  sha256?: string;
  filename?: string;
  [k: string]: unknown;
}
