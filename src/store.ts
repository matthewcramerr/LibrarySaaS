import { useSyncExternalStore } from 'react';
import { api } from './api';

export type Status = 'maybe' | 'purchased' | 'cataloged';

export interface Book {
  id: string;
  isbn?: string;
  isbns?: string[]; // every edition's ISBN, for catalog matching
  title: string;
  authors: string[];
  pubDate?: string; // YYYY, YYYY-MM or YYYY-MM-DD
  categories: string[];
  rating?: number;
  ratingsCount?: number;
  cover?: string;
  previewLink?: string;
  nyt?: boolean; // tagged as a NYT bestseller by the data source
}

export interface Saved extends Book {
  status: Status;
  listIds: string[];
  bestseller: boolean;
  msrp?: number; // entered by the librarian; falls back to settings.defaultMsrp
  vendorId?: string; // manual override of the cheapest vendor
  addedAt: string;
  purchasedAt?: string;
  purchasedFrom?: string;
}

export interface List {
  id: string;
  name: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  discount: number; // % off MSRP
  processingFee: number | null; // $ per book for pre-processing; null = not offered
  url: string; // {isbn} and {title} are replaced
}

export interface Settings {
  library: string;
  preprocessing: boolean;
  inHouseProcessing: number; // $ staff cost to process a book yourself
  defaultMsrp: number;
  vendors: Vendor[];
  catalogIsbns: string[]; // this library's catalog export
  systemIsbns: string[]; // the whole library system's catalog export
  presses: string[]; // small / regional presses the librarian follows
}

export interface State {
  books: Record<string, Saved>;
  lists: List[];
  settings: Settings;
}

const KEY = 'shelfmark:v1';

export const defaultSettings: Settings = {
  library: 'My Library',
  preprocessing: false,
  inHouseProcessing: 3,
  defaultMsrp: 28,
  vendors: [
    { id: 'ingram', name: 'Ingram', discount: 40, processingFee: 2.5, url: 'https://ipage.ingramcontent.com/' },
    { id: 'amazon', name: 'Amazon Business', discount: 25, processingFee: null, url: 'https://www.amazon.com/s?k={isbn}' },
    { id: 'local', name: 'Local bookstore', discount: 20, processingFee: null, url: '' },
  ],
  catalogIsbns: [],
  systemIsbns: [],
  presses: ['Wisconsin Historical Society Press', 'University of Wisconsin Press', 'Milkweed Editions', 'Graywolf Press'],
};

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem('shelfwise:v1'); // keep data saved under the old name
    if (raw) {
      const s = JSON.parse(raw) as State;
      return { books: s.books ?? {}, lists: s.lists ?? [], settings: { ...defaultSettings, ...s.settings } };
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return { books: {}, lists: [], settings: defaultSettings };
}

let state: State = loadLocal();
let remote = false; // true once signed in: changes save to the server, not the browser
const subs = new Set<() => void>();

function set(next: State) {
  state = next;
  if (!remote) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  subs.forEach((f) => f());
}

export function useStore(): State {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );
}

// ---------- server sync ----------
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';
let syncStatus: SyncStatus = 'idle';
let syncError = '';
const syncSubs = new Set<() => void>();
function setSync(s: SyncStatus, err = '') {
  syncStatus = s;
  syncError = err;
  syncSubs.forEach((f) => f());
}
export function useSync() {
  const status = useSyncExternalStore(
    (f) => {
      syncSubs.add(f);
      return () => syncSubs.delete(f);
    },
    () => syncStatus,
  );
  return { status, error: syncError };
}

let inflight = 0;
const pendingBooks = new Set<string>();
const pendingLists = new Set<string>();
let bookTimer: ReturnType<typeof setTimeout> | undefined;
let listTimer: ReturnType<typeof setTimeout> | undefined;
let settingsTimer: ReturnType<typeof setTimeout> | undefined;
let settingsPending = false;

/** Nothing waiting to be sent and nothing in flight. */
const idle = () => inflight === 0 && pendingBooks.size === 0 && pendingLists.size === 0 && !settingsPending;

function track(p: Promise<unknown>) {
  inflight++;
  setSync('saving');
  p.then(
    () => {
      inflight--;
      if (idle() && syncStatus !== 'error') setSync('saved');
    },
    (e: Error) => {
      inflight--;
      setSync('error', e.message);
    },
  );
}

function flushBooks(keepalive = false) {
  clearTimeout(bookTimer);
  const books = [...pendingBooks].map((id) => state.books[id]).filter(Boolean);
  pendingBooks.clear();
  if (books.length) track(api.put('/api/books', { books }, keepalive));
  else if (idle()) setSync('saved');
}

function flushLists(keepalive = false) {
  clearTimeout(listTimer);
  const ids = [...pendingLists];
  pendingLists.clear();
  for (const lid of ids) {
    const l = state.lists.find((x) => x.id === lid);
    if (l) track(api.put(`/api/lists/${l.id}`, { name: l.name, createdAt: l.createdAt }, keepalive));
  }
  if (idle()) setSync('saved');
}

function flushSettings(keepalive = false) {
  clearTimeout(settingsTimer);
  if (!settingsPending) return;
  settingsPending = false;
  const { catalogIsbns: _a, systemIsbns: _b, ...rest } = state.settings;
  void _a; void _b;
  track(api.put('/api/settings', { settings: rest }, keepalive));
}

function queueBooks(ids: string[]) {
  if (!remote || !ids.length) return;
  ids.forEach((id) => pendingBooks.add(id));
  setSync('saving');
  clearTimeout(bookTimer);
  bookTimer = setTimeout(() => flushBooks(), 450);
}

function queueList(id: string) {
  if (!remote) return;
  pendingLists.add(id);
  setSync('saving');
  clearTimeout(listTimer);
  listTimer = setTimeout(() => flushLists(), 450);
}

function queueSettings() {
  if (!remote) return;
  settingsPending = true;
  setSync('saving');
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => flushSettings(), 600);
}

// Leaving the page: send anything still waiting, and warn if a save is in flight.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (!remote) return;
    flushLists(true);
    flushBooks(true);
    flushSettings(true);
  });
  window.addEventListener('beforeunload', (e) => {
    if (!remote || idle()) return;
    flushLists(true);
    flushBooks(true);
    flushSettings(true);
    e.preventDefault();
  });
}

/** Switch to the server's copy after sign-in. */
export function hydrateRemote(data: { books: Record<string, Saved>; lists: List[]; settings: Partial<Settings> }) {
  remote = true;
  setSync('idle');
  set({ books: data.books ?? {}, lists: data.lists ?? [], settings: { ...defaultSettings, ...data.settings } });
}

/** Back to this browser's copy after sign-out. */
export function useLocal() {
  remote = false;
  setSync('idle');
  set(loadLocal());
}

export const isRemote = () => remote;
export const localSnapshot = () => loadLocal();

/** Copy what's saved in this browser into the signed-in library. */
export async function importLocal() {
  const local = loadLocal();
  const books = Object.values(local.books);
  await api.post('/api/import', { books, lists: local.lists });
  const merged: State = {
    ...state,
    books: { ...local.books, ...state.books },
    lists: [...state.lists, ...local.lists.filter((l) => !state.lists.some((x) => x.id === l.id))],
  };
  set(merged);
  try {
    localStorage.setItem(KEY + ':imported', new Date().toISOString());
  } catch {
    /* ignore */
  }
  return books.length;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export const actions = {
  addBook(b: Book, listId?: string) {
    const existing = state.books[b.id];
    const listIds = existing ? existing.listIds : [];
    const saved: Saved = existing
      ? { ...existing, listIds: listId && !listIds.includes(listId) ? [...listIds, listId] : listIds }
      : { ...b, status: 'maybe', listIds: listId ? [listId] : [], bestseller: !!b.nyt, addedAt: now() };
    set({ ...state, books: { ...state.books, [b.id]: saved } });
    queueBooks([b.id]);
  },
  updateBook(id: string, patch: Partial<Saved>) {
    const b = state.books[id];
    if (!b) return;
    set({ ...state, books: { ...state.books, [id]: { ...b, ...patch } } });
    queueBooks([id]);
  },
  removeBook(id: string) {
    const books = { ...state.books };
    delete books[id];
    set({ ...state, books });
    pendingBooks.delete(id);
    if (remote) track(api.del(`/api/books/${encodeURIComponent(id)}`));
  },
  markPurchased(ids: string[], vendorName: string) {
    const books = { ...state.books };
    for (const id of ids) {
      if (books[id]) books[id] = { ...books[id], status: 'purchased', purchasedAt: now(), purchasedFrom: vendorName };
    }
    set({ ...state, books });
    queueBooks(ids);
  },
  toggleList(bookId: string, listId: string) {
    const b = state.books[bookId];
    if (!b) return;
    const listIds = b.listIds.includes(listId) ? b.listIds.filter((x) => x !== listId) : [...b.listIds, listId];
    actions.updateBook(bookId, { listIds });
  },
  createList(name: string, bookIds: string[] = []): string {
    const list: List = { id: uid(), name: name.trim() || 'Untitled list', createdAt: now() };
    const books = { ...state.books };
    for (const id of bookIds) {
      const b = books[id];
      if (b && !b.listIds.includes(list.id)) books[id] = { ...b, listIds: [...b.listIds, list.id] };
    }
    set({ ...state, books, lists: [...state.lists, list] });
    if (remote) {
      // the list must exist before books point at it
      track(api.put(`/api/lists/${list.id}`, { name: list.name, createdAt: list.createdAt }).then(() => queueBooks(bookIds)));
    }
    return list.id;
  },
  renameList(id: string, name: string) {
    set({ ...state, lists: state.lists.map((l) => (l.id === id ? { ...l, name } : l)) });
    queueList(id);
  },
  deleteList(id: string) {
    const changed = Object.values(state.books).filter((b) => b.listIds.includes(id)).map((b) => b.id);
    const books = Object.fromEntries(
      Object.entries(state.books).map(([k, b]) => [k, { ...b, listIds: b.listIds.filter((x) => x !== id) }]),
    );
    set({ ...state, books, lists: state.lists.filter((l) => l.id !== id) });
    if (remote) {
      track(api.del(`/api/lists/${id}`));
      queueBooks(changed);
    }
  },
  updateSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
    if (!remote) return;
    if (patch.catalogIsbns) track(api.put('/api/catalog/library', { isbns: patch.catalogIsbns }));
    if (patch.systemIsbns) track(api.put('/api/catalog/system', { isbns: patch.systemIsbns }));
    const other = Object.keys(patch).filter((k) => k !== 'catalogIsbns' && k !== 'systemIsbns');
    if (other.length) queueSettings();
  },
  replaceAll(next: State) {
    set({ books: next.books ?? {}, lists: next.lists ?? [], settings: { ...defaultSettings, ...next.settings } });
    if (!remote) return;
    track(api.post('/api/import', { books: Object.values(state.books), lists: state.lists }));
    queueSettings();
  },
};

export const getState = () => state;
