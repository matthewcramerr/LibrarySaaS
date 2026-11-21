import { useSyncExternalStore } from 'react';
import { api, ApiError, type Me } from './api';
import { hydrateRemote, useLocal, type List, type Saved, type Settings } from './store';

type SessionState = { status: 'loading' } | { status: 'out' } | { status: 'in'; me: Me };

let session: SessionState = { status: 'loading' };
const subs = new Set<() => void>();
function set(s: SessionState) {
  session = s;
  subs.forEach((f) => f());
}

export function useSession() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => session,
  );
}

async function loadState(me: Me) {
  const data = await api.get<{ books: Record<string, Saved>; lists: List[]; settings: Partial<Settings> }>('/api/state');
  hydrateRemote(data);
  set({ status: 'in', me });
}

export async function initSession() {
  try {
    const me = await api.get<Me>('/api/me');
    await loadState(me);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status === 401) set({ status: 'out' });
    else set({ status: 'out' });
  }
}

export async function signIn(email: string, password: string) {
  const me = await api.post<Me>('/api/auth/login', { email, password });
  await loadState(me);
}

export async function signUp(fields: { name: string; email: string; password: string; libraryName?: string; systemName?: string; invite?: string }) {
  const me = await api.post<Me>('/api/auth/signup', fields);
  await loadState(me);
}

export async function signOut() {
  await api.post('/api/auth/logout').catch(() => {});
  useLocal();
  set({ status: 'out' });
}

export function refreshMe(me: Me) {
  if (session.status === 'in') set({ status: 'in', me });
}
