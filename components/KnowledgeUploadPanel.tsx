'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { KnowledgeUploadResponse } from '@/types/knowledge';
import { uploadKnowledgeDocument } from '@/lib/knowledgeUpload';
import { useIdentityStore } from '@/store/identityStore';

export type KnowledgeUploadPanelProps = {
  onUploaded?: (resp: KnowledgeUploadResponse) => void;
};

function scannedPdfHint(err?: string | null): boolean {
  if (!err) return false;
  return String(err).includes('suspect_scanned_pdf_need_ocr');
}

function invalidUtf8Hint(err?: string | null): boolean {
  if (!err) return false;
  const s = String(err);
  return (
    s.includes('invalid byte sequence for encoding "UTF8"') ||
    s.includes('invalid byte sequence for encoding "UTF-8"') ||
    s.includes('invalid byte sequence for encoding UTF8')
  );
}

function embeddingDimsMismatchHint(err?: string | null): { expected: number; got: number } | null {
  if (!err) return null;
  const s = String(err);
  const m = s.match(/expected\s+(\d+)\s+dimensions?,\s+not\s+(\d+)/i);
  if (!m) return null;
  const expected = Number(m[1]);
  const got = Number(m[2]);
  if (!Number.isFinite(expected) || !Number.isFinite(got)) return null;
  return { expected, got };
}

function mapUploadError(err?: string | null): { title: string; body: string; raw?: string } | null {
  if (!err) return null;

  if (scannedPdfHint(err)) {
    return {
      title: '无法解析（疑似扫描件）',
      body: '当前版本不支持 OCR。请上传可复制文字的 PDF；或等待后续版本支持 OCR。',
      raw: err,
    };
  }

  if (invalidUtf8Hint(err)) {
    return {
      title: '文本编码解析失败（UTF-8）',
      body: '后端在解析文档时遇到非 UTF-8 字节（例如包含 0x00）。建议：重新导出/另存为 UTF-8 编码的文本或 PDF；若是 Word/HTML，请先转存为纯文本或标准 PDF 后再上传。',
      raw: err,
    };
  }

  const dims = embeddingDimsMismatchHint(err);
  if (dims) {
    return {
      title: '已知限制：pg 向量索引维度上限',
      body: `检测到维度提示：expected ${dims.expected} dimensions, not ${dims.got}。这是当前 pg/索引对维度的限制导致后端将维度降到 ${dims.expected}；使用上无区别，可忽略。后续版本预计迁移到 Milvus。`,
      raw: err,
    };
  }

  return {
    title: '上传失败',
    body: err,
    raw: err,
  };
}

export const KnowledgeUploadPanel: React.FC<KnowledgeUploadPanelProps> = ({ onUploaded }) => {
  const userId = useIdentityStore((s) => s.userId);
  const conversationId = useIdentityStore((s) => s.conversationId);

  const [tagsText, setTagsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KnowledgeUploadResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tags = useMemo(() => {
    return tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tagsText]);

  async function handlePickedFile(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const resp = await uploadKnowledgeDocument({
        file,
        userId,
        conversationId,
        tags,
      });
      setResult(resp);
      onUploaded?.(resp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const mappedError = useMemo(() => mapUploadError(error), [error]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-900">📤 Knowledge Upload</div>
        <div className="text-[11px] text-gray-500 font-mono">/api/knowledge/documents/upload</div>
      </div>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0] ?? null;
            // allow re-selecting the same file
            e.target.value = '';
            if (!f) return;
            await handlePickedFile(f);
          }}
        />

        <div className="grid grid-cols-1 gap-2">
          <label className="text-[11px] text-gray-600">
            tags（逗号分隔）
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="guideline, diabetes"
              className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-xs"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          className={[
            'w-full rounded-md px-3 py-2 text-xs font-semibold border',
            busy ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800',
          ].join(' ')}
          onClick={() => {
            setError(null);
            fileInputRef.current?.click();
          }}
        >
          {busy ? 'Uploading…' : '选择文件并上传'}
        </button>

        <div className="text-[11px] text-gray-500">
          user_id: <span className="font-mono text-gray-700 break-all">{userId}</span>
        </div>
        <div className="text-[11px] text-gray-500">
          conversation_id: <span className="font-mono text-gray-700 break-all">{conversationId}</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 whitespace-pre-wrap break-words">
          {mappedError ? (
            <div className="space-y-1">
              <div className="font-semibold">{mappedError.title}</div>
              <div className="text-red-800">{mappedError.body}</div>
              {mappedError.raw && mappedError.raw !== mappedError.body ? (
                <details>
                  <summary className="cursor-pointer text-[11px] text-red-700">raw error（展开）</summary>
                  <div className="mt-1 font-mono text-[11px] whitespace-pre-wrap break-words">{mappedError.raw}</div>
                </details>
              ) : null}
            </div>
          ) : (
            error
          )}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
          <div className="text-[11px] text-gray-600 mb-1">Response</div>
          <pre className="text-[11px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words max-h-60 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/50 p-2 text-[11px] text-gray-500">
          本版本仅做 Upload → stored 元数据回显；Knowledge usage/chunks 后续再接。
        </div>
      )}
    </div>
  );
};

