import { useState } from 'react';
import { actions, useStore, type Book, type Saved, type Status } from './store';
import { chosenQuote, money, msrpIsEstimate, msrpOf, quotes, vendorLink } from './pricing';
import { fmtDate, isUpcoming } from './books';
import { Cover, Icon } from './ui';

export function isbn13(isbn?: string): string | undefined {
  if (!isbn) return;
  const d = isbn.replace(/[^\dXx]/g, '').toUpperCase();
  if (d.length === 13) return d;
  if (d.length !== 10) return;
  const core = '978' + d.slice(0, 9);
  const sum = [...core].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0);
  return core + ((10 - (sum % 10)) % 10);
}

export interface Holdings {
  lib: boolean;
  sys: boolean;
  any: boolean;
  checked: boolean; // at least one catalog has been uploaded
}

/** Does my library / my system already own this ISBN? Based on uploaded catalog exports. */
export function useCatalog() {
  const { settings } = useStore();
  const norm = (xs: string[]) => new Set(xs.map(isbn13).filter(Boolean) as string[]);
  const lib = norm(settings.catalogIsbns);
  const sys = norm(settings.systemIsbns);
  const checked = lib.size > 0 || sys.size > 0;
  return (b: { isbn?: string; isbns?: string[] }): Holdings => {
    const ids = [b.isbn, ...(b.isbns ?? [])].map(isbn13).filter(Boolean) as string[];
    const inLib = ids.some((i) => lib.has(i));
    const inSys = inLib || ids.some((i) => sys.has(i));
    return { lib: inLib, sys: inSys, any: inLib || inSys, checked };
  };
}

const site = (domain: string, b: Book) =>
  `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} "${b.title.split(':')[0]}" ${b.authors[0] ?? ''}`)}`;

export const REVIEW_SITES = [
  ['Kirkus', 'kirkusreviews.com'],
  ['PW', 'publishersweekly.com'],
  ['LJ', 'libraryjournal.com'],
  ['Booklist', 'booklistonline.com'],
] as const;
export const PREVIEW_SITES = [
  ['Edelweiss', 'edelweiss.plus'],
  ['NetGalley', 'netgalley.com'],
] as const;

export function SourceLinks({ b }: { b: Book }) {
  return (
    <div className="sources">
      <span className="src-label">Reviews</span>
      {REVIEW_SITES.map(([n, d]) => <a key={n} href={site(d, b)} target="_blank" rel="noreferrer">{n}</a>)}
      <span className="src-label">Preview</span>
      {PREVIEW_SITES.map(([n, d]) => <a key={n} href={site(d, b)} target="_blank" rel="noreferrer">{n}</a>)}
    </div>
  );
}

export function HoldingBadges({ h }: { h: Holdings }) {
  if (!h.checked) return null;
  return (
    <>
      <span className={`hold ${h.lib ? 'yes' : 'no'}`} title="Your library's catalog">{h.lib ? <Icon name="check" size={11} /> : '—'} Your library</span>
      <span className={`hold ${h.sys ? 'yes' : 'no'}`} title="Your library system's catalog">{h.sys ? <Icon name="check" size={11} /> : '—'} System</span>
    </>
  );
}

export function BookTable({ books, empty }: { books: Saved[]; empty?: React.ReactNode }) {
  const { settings, lists } = useStore();
  const holdings = useCatalog();
  const [asking, setAsking] = useState<{ id: string; vendor: string } | null>(null);
  if (!books.length) return <div className="empty">{empty ?? 'No books here yet.'}</div>;

  return (
    <div className="booklist">
      <div className="bl-head">
        <span>Title</span>
        <span>Publishes</span>
        <span>Rating</span>
        <span>List price</span>
        <span>Your price</span>
        <span>Status</span>
        <span />
      </div>
      {books.map((b) => {
        const q = chosenQuote(b, settings);
        const all = quotes(b, settings);
        const link = q ? vendorLink(q.vendor, b) : '';
        const h = holdings(b);
        return (
          <div key={b.id} className={`bl-row ${b.status !== 'maybe' ? 'is-done' : ''}`}>
            <div className="bl-book">
              <Cover src={b.cover} title={b.title} author={b.authors[0]} size="sm" />
              <div className="bl-text">
                <a href={b.previewLink} target="_blank" rel="noreferrer" className="bl-title">{b.title}</a>
                <div className="bl-author">{b.authors.join(', ') || 'Unknown author'}</div>
                <div className="bl-flags">
                  <HoldingBadges h={h} />
                  <button className={`flag-btn ${b.bestseller ? 'on' : ''}`} onClick={() => actions.updateBook(b.id, { bestseller: !b.bestseller })} title="Bestseller">
                    <Icon name="star" size={12} /> Bestseller
                  </button>
                  {b.listIds.map((id) => {
                    const l = lists.find((x) => x.id === id);
                    return l ? (
                      <button key={id} className="flag flag-list" onClick={() => actions.toggleList(b.id, id)} title="Remove from list">
                        {l.name} <Icon name="x" size={10} />
                      </button>
                    ) : null;
                  })}
                  {lists.some((l) => !b.listIds.includes(l.id)) && (
                    <select className="flag-add" value="" onChange={(e) => e.target.value && actions.toggleList(b.id, e.target.value)}>
                      <option value="">+ Add to list</option>
                      {lists.filter((l) => !b.listIds.includes(l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  )}
                </div>
                <SourceLinks b={b} />
              </div>
            </div>
            <div className="bl-date">
              {fmtDate(b.pubDate)}
              {isUpcoming(b.pubDate) && <span className="prepub">Pre-pub</span>}
            </div>
            <div className="bl-rating">
              {b.rating ? <>{b.rating.toFixed(1)}<small> / 5</small></> : <span className="dim">—</span>}
              {b.ratingsCount ? <div className="dim small">{b.ratingsCount} ratings</div> : null}
            </div>
            <div className="bl-msrp">
              <span className="dollar">$</span>
              <input
                className={msrpIsEstimate(b) ? 'est' : ''}
                type="number"
                min={0}
                step="0.01"
                placeholder={String(settings.defaultMsrp)}
                value={b.msrp ?? ''}
                title={msrpIsEstimate(b) ? `Estimated at ${money(msrpOf(b, settings))}. Type the real list price.` : 'List price'}
                onChange={(e) => actions.updateBook(b.id, { msrp: e.target.value === '' ? undefined : Number(e.target.value) })}
              />
            </div>
            <div className="bl-price">
              {q && (
                <>
                  <strong>{money(q.price)}</strong>
                  <select value={q.vendor.id} onChange={(e) => actions.updateBook(b.id, { vendorId: e.target.value })}>
                    {all.map((x, i) => (
                      <option key={x.vendor.id} value={x.vendor.id}>
                        {x.vendor.name} — {money(x.price)}{i === 0 ? ' (best)' : ''}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div className="bl-status">
              <select className={`status-${b.status}`} value={b.status} onChange={(e) => actions.updateBook(b.id, { status: e.target.value as Status })}>
                <option value="maybe">To buy</option>
                <option value="purchased">Ordered</option>
                <option value="cataloged">In catalog</option>
              </select>
              {b.purchasedFrom && b.status !== 'maybe' && <div className="dim small">via {b.purchasedFrom}</div>}
            </div>
            <div className="bl-actions">
              {asking?.id === b.id ? (
                <div className="ask">
                  <span>Ordered?</span>
                  <button className="btn btn-dark btn-sm" onClick={() => { actions.markPurchased([b.id], asking.vendor); setAsking(null); }}>Yes</button>
                  <button className="text-btn" onClick={() => setAsking(null)}>Not yet</button>
                </div>
              ) : (
                <>
                  {b.status === 'maybe' && q && (
                    <button
                      className="btn btn-dark btn-sm"
                      onClick={() => {
                        if (link) window.open(link, '_blank', 'noopener');
                        setAsking({ id: b.id, vendor: q.vendor.name });
                      }}
                      title={link ? `Open ${q.vendor.name}` : 'Mark as ordered'}
                    >
                      Buy
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => actions.removeBook(b.id)} title="Remove">
                    <Icon name="x" size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function totalCost(books: Saved[], settings: ReturnType<typeof useStore>['settings']) {
  return books.reduce((s, b) => s + (chosenQuote(b, settings)?.price ?? 0), 0);
}
