'use client';

import React, { useEffect, useState } from 'react';
import { fetchDocumentPreview, getDocumentFileUrl } from '@/lib/knowledgeApi';
import type { DocumentPreviewResponse } from '@/types/knowledge';

interface Props {
  uploadId: string;
  userId: string;
  libraryId: string;
  filename?: string;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<Props> = ({
  uploadId,
  userId,
  libraryId,
  filename,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DocumentPreviewResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDocumentPreview(uploadId, userId, libraryId)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '预览加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [uploadId, userId, libraryId]);

  const fileUrl = getDocumentFileUrl(uploadId, userId, libraryId, true);
  const downloadUrl = getDocumentFileUrl(uploadId, userId, libraryId, false);

  const handleOpenNewTab = () => {
    const url = preview?.download_url || fileUrl;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col mx-4" style={{ width: '80vw', maxWidth: 960, height: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {filename || uploadId}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              className="text-xs text-blue-600 hover:text-blue-700"
              download
            >
              下载
            </a>
            <button
              onClick={handleOpenNewTab}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              新窗口打开
            </button>
            <button
              onClick={onClose}
              className="ml-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              加载预览中...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-600 text-sm">
              {error}
            </div>
          ) : preview?.preview_mode === 'text' ? (
            <pre className="p-5 text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {preview.preview_text || '（空文档）'}
            </pre>
          ) : preview?.preview_mode === 'binary' ? (
            <iframe
              src={preview.download_url || fileUrl}
              className="w-full h-full border-0"
              title={filename || uploadId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 text-sm">
              <div>无法预览此文件格式</div>
              <a
                href={downloadUrl}
                className="text-blue-600 hover:text-blue-700 text-xs"
                download
              >
                点击下载文件
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
