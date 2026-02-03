import type { UploadVLAssetResponse } from '@/types/vl';

export async function uploadVlAsset(file: File): Promise<UploadVLAssetResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/v1/vl/assets/upload', {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`VL upload failed: ${res.status} ${res.statusText}${txt ? `\n${txt}` : ''}`);
  }

  return (await res.json()) as UploadVLAssetResponse;
}
