export const DEFAULT_APP_ID = 'pk';
export const DEFAULT_USER_ID = '10001';

/**
 * Resolve the effective app_id/user_id to send to backend.
 *
 * Priority (high -> low):
 * 1) explicit passed value
 * 2) NEXT_PUBLIC_APP_ID / NEXT_PUBLIC_USER_ID
 * 3) PRD defaults (pk / 10001)
 */
export function resolveIdentityDefaults(input?: {
  userId?: string | null;
  appId?: string | null;
}): { user_id: string; app_id: string } {
  const envUser = (process.env.NEXT_PUBLIC_USER_ID ?? '').trim();
  const envApp = (process.env.NEXT_PUBLIC_APP_ID ?? '').trim();

  const user_id = (input?.userId ?? '').trim() || envUser || DEFAULT_USER_ID;
  const app_id = (input?.appId ?? '').trim() || envApp || DEFAULT_APP_ID;

  return { user_id, app_id };
}

