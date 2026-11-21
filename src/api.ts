export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown, keepalive = false): Promise<T> {
  const r = await fetch(path, {
    method,
    keepalive,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, (data as { error?: string }).error ?? `Request failed (${r.status})`);
  return data as T;
}

export interface Me {
  user: { id: string; name: string; email: string; isAdmin: boolean };
  library: { id: string; name: string; systemName: string | null; plan: string } | null;
  role: 'owner' | 'member' | null;
}

export const api = {
  get: <T>(p: string) => call<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => call<T>('POST', p, b),
  put: <T>(p: string, b: unknown = {}, keepalive = false) => call<T>('PUT', p, b, keepalive),
  patch: <T>(p: string, b: unknown = {}) => call<T>('PATCH', p, b),
  del: <T>(p: string) => call<T>('DELETE', p, {}),
};
