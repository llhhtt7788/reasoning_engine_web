import { promises as fs } from 'fs';
import path from 'path';

export type RequestLogOptions = {
  enabled: boolean;
  logDir: string;
  maxBytes: number;
};

export function getRequestLogOptionsFromEnv(): RequestLogOptions {
  const enabled = process.env.ENABLE_REQUEST_LOGS === '1' || process.env.ENABLE_REQUEST_LOGS === 'true';
  const logDir = process.env.REQUEST_LOG_DIR || 'logs';
  const maxBytes = (() => {
    const raw = process.env.REQUEST_LOG_MAX_BYTES;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : 256 * 1024;
  })();

  return { enabled, logDir, maxBytes };
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function redactPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;

  // NOTE: User asked "暂时不做安全策略". We keep minimal redaction to avoid
  // accidentally writing tokens into logs.
  const SENSITIVE_KEYS = new Set([
    'authorization',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apikey',
    'password',
    'secret',
    'cookie',
  ]);

  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;

    const rec = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(rec)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_KEYS.has(lower)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = walk(val);
      }
    }
    return out;
  };

  return walk(payload);
}

export type WriteRequestLogInput = {
  route: string;
  method: string;
  tsIso: string;
  headers: Record<string, string>;
  bodyText?: string;
  bodyJson?: unknown;
};

export async function writeRequestLog(opts: RequestLogOptions, info: WriteRequestLogInput): Promise<void> {
  const cwd = process.cwd();
  const dir = path.isAbsolute(opts.logDir) ? opts.logDir : path.join(cwd, opts.logDir);
  await fs.mkdir(dir, { recursive: true });

  const safeHeaders = { ...info.headers };
  if (safeHeaders['authorization']) safeHeaders['authorization'] = '[REDACTED]';

  const parsed = info.bodyJson !== undefined ? info.bodyJson : info.bodyText ? safeJsonParse(info.bodyText) : null;
  const redacted = redactPayload(parsed);

  const bodyOut =
    info.bodyJson !== undefined
      ? redacted
      : parsed
        ? redacted
        : (info.bodyText ?? null);

  const record: Record<string, unknown> = {
    ts: info.tsIso,
    route: info.route,
    method: info.method,
    headers: safeHeaders,
    body: bodyOut,
  };

  const stamp = info.tsIso.replace(/[:.]/g, '-');
  const safeRoute = info.route.replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = path.join(dir, `${stamp}_${info.method}_${safeRoute}.json`);

  let encoded = JSON.stringify(record, null, 2);
  const bytes = Buffer.byteLength(encoded, 'utf8');
  if (bytes > opts.maxBytes) {
    record.body = '[TRUNCATED] payload too large';
    encoded = JSON.stringify(record, null, 2);
  }

  await fs.writeFile(file, encoded, 'utf8');
}

