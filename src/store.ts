import { useSyncExternalStore } from 'react';

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

function load(): State {
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

let state: State = load();
const subs = new Set<() => void>();

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
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
  },
  updateBook(id: string, patch: Partial<Saved>) {
    const b = state.books[id];
    if (!b) return;
    set({ ...state, books: { ...state.books, [id]: { ...b, ...patch } } });
  },
  removeBook(id: string) {
    const books = { ...state.books };
    delete books[id];
    set({ ...state, books });
  },
  markPurchased(ids: string[], vendorName: string) {
    const books = { ...state.books };
    for (const id of ids) {
      if (books[id]) books[id] = { ...books[id], status: 'purchased', purchasedAt: now(), purchasedFrom: vendorName };
    }
    set({ ...state, books });
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
    return list.id;
  },
  renameList(id: string, name: string) {
    set({ ...state, lists: state.lists.map((l) => (l.id === id ? { ...l, name } : l)) });
  },
  deleteList(id: string) {
    const books = Object.fromEntries(
      Object.entries(state.books).map(([k, b]) => [k, { ...b, listIds: b.listIds.filter((x) => x !== id) }]),
    );
    set({ ...state, books, lists: state.lists.filter((l) => l.id !== id) });
  },
  updateSettings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
  },
  replaceAll(next: State) {
    set(next);
  },
};

export const getState = () => state;
