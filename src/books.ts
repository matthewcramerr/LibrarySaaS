import type { Book } from './store';

const API = 'https://www.googleapis.com/books/v1/volumes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBook(v: any): Book {
  const i = v.volumeInfo ?? {};
  const ids: { type: string; identifier: string }[] = i.industryIdentifiers ?? [];
  const isbn = (ids.find((x) => x.type === 'ISBN_13') ?? ids.find((x) => x.type === 'ISBN_10'))?.identifier;
  return {
    id: isbn ?? v.id,
    isbn,
    title: i.subtitle ? `${i.title}: ${i.subtitle}` : i.title ?? 'Untitled',
    authors: i.authors ?? [],
    pubDate: i.publishedDate,
    categories: i.categories ?? [],
    rating: i.averageRating,
    ratingsCount: i.ratingsCount,
    cover: i.imageLinks?.thumbnail?.replace('http://', 'https://'),
    previewLink: i.infoLink ?? i.previewLink,
  };
}

const OL = 'https://openlibrary.org/search.json';
const OL_FIELDS = 'key,title,subtitle,author_name,first_publish_year,publish_date,isbn,subject,ratings_average,ratings_count,cover_i';

/** Earliest full date among an Open Library work's edition dates, as YYYY[-MM[-DD]]. */
function olDate(dates: string[] = [], firstYear?: number): string | undefined {
  const parsed = dates
    .map((d) => {
      if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(d)) return d;
      const t = Date.parse(d);
      if (isNaN(t) || !/\d{4}/.test(d)) return undefined;
      const iso = new Date(t).toISOString().slice(0, 10);
      return /\b\d{1,2}\b/.test(d.replace(/\d{4}/, '')) ? iso : iso.slice(0, 7);
    })
    .filter((d): d is string => !!d && (!firstYear || d.startsWith(String(firstYear))))
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
  return parsed[0] ?? (firstYear ? String(firstYear) : undefined);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function olToBook(d: any): Book {
  const isbns: string[] = d.isbn ?? [];
  const isbn = isbns.find((x) => x.length === 13) ?? isbns[0];
  const subjects: string[] = d.subject ?? [];
  return {
    id: isbn ?? d.key,
    isbn,
    isbns: isbns.slice(0, 60),
    title: d.subtitle ? `${d.title}: ${d.subtitle}` : d.title ?? 'Untitled',
    authors: d.author_name ?? [],
    pubDate: olDate(d.publish_date, d.first_publish_year),
    categories: subjects.filter((s) => !/^nyt:|bestseller|^accessible|^protected|^in library/i.test(s) && s.length < 30).slice(0, 3),
    rating: d.ratings_average ? Math.round(d.ratings_average * 10) / 10 : undefined,
    ratingsCount: d.ratings_count,
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
    previewLink: `https://openlibrary.org${d.key}`,
    nyt: subjects.some((s) => /^nyt:|new york times bestseller/i.test(s)),
  };
}

async function searchOpenLibrary(q: string, opts: { orderBy?: 'relevance' | 'newest'; max?: number; start?: number }) {
  const params = new URLSearchParams({
    q: q.replace(/\binauthor:/g, 'author:'),
    fields: OL_FIELDS,
    limit: String(opts.max ?? 20),
    offset: String(opts.start ?? 0),
    lang: 'en',
  });
  if (opts.orderBy === 'newest') params.set('sort', 'new');
  const r = await fetch(`${OL}?${params}`);
  if (!r.ok) throw new Error(`Search failed (${r.status})`);
  const j = await r.json();
  return ((j.docs ?? []) as unknown[]).map(olToBook);
}

/** Open Library first (free, no key). Google Books as a fallback. */
export async function searchBooks(
  q: string,
  opts: { orderBy?: 'relevance' | 'newest'; max?: number; start?: number } = {},
): Promise<Book[]> {
  try {
    const res = await searchOpenLibrary(q, opts);
    if (res.length) return res;
  } catch {
    /* fall through to Google */
  }
  return searchGoogle(q, opts);
}

async function searchGoogle(
  q: string,
  opts: { orderBy?: 'relevance' | 'newest'; max?: number; start?: number } = {},
): Promise<Book[]> {
  const params = new URLSearchParams({
    q,
    maxResults: String(Math.min(opts.max ?? 20, 40)),
    startIndex: String(opts.start ?? 0),
    printType: 'books',
    orderBy: opts.orderBy ?? 'relevance',
    langRestrict: 'en',
  });
  const r = await fetch(`${API}?${params}`);
  if (!r.ok) throw new Error(r.status === 429 ? 'Google Books is busy. Try again in a minute.' : `Search failed (${r.status})`);
  const j = await r.json();
  // de-dupe by id
  const seen = new Set<string>();
  return ((j.items ?? []) as unknown[]).map(toBook).filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
}

const isbnLike = (s: string) => /^[\d-\sxX]{10,17}$/.test(s.trim()) && s.replace(/[^\dxX]/g, '').length >= 10;

/** Turn one pasted line (ISBN, title, or "title by author") into the best match. */
export async function lookupLine(line: string): Promise<Book | null> {
  const t = line.trim();
  if (!t) return null;
  const q = isbnLike(t) ? `isbn:${t.replace(/[^\dxX]/g, '')}` : t.replace(/\s+by\s+/i, ' inauthor:');
  const res = await searchBooks(q, { max: 1 });
  return res[0] ?? null;
}

export const fmtDate = (d?: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!m) return y;
  const mon = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'short' });
  return day ? `${mon} ${Number(day)}, ${y}` : `${mon} ${y}`;
};

export const isUpcoming = (d?: string) => !!d && d > new Date().toISOString().slice(0, 10);

export const popularity = (b: Pick<Book, 'rating' | 'ratingsCount'>) =>
  (b.rating ?? 3) * Math.log10((b.ratingsCount ?? 0) + 10);
