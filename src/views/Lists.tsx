import { useMemo, useState } from 'react';
import { actions, useStore, type Saved } from '../store';
import { BookTable, totalCost } from '../BookTable';
import { isUpcoming, popularity } from '../books';
import { chosenQuote, money, vendorLink } from '../pricing';
import { download, slug, toCsv } from '../csv';
import { Icon } from '../ui';

type Sort = 'pub' | 'rating' | 'popular' | 'bestseller' | 'added' | 'title' | 'price';
const MAYBE = '__maybe';
const ALL = '__all';

const sorters: Record<Sort, (a: Saved, b: Saved) => number> = {
  pub: (a, b) => (a.pubDate ?? '9999').localeCompare(b.pubDate ?? '9999'),
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  popular: (a, b) => popularity(b) - popularity(a),
  bestseller: (a, b) => Number(b.bestseller) - Number(a.bestseller) || popularity(b) - popularity(a),
  added: (a, b) => b.addedAt.localeCompare(a.addedAt),
  title: (a, b) => a.title.localeCompare(b.title),
  price: () => 0,
};

export default function Lists() {
  const { books, lists, settings } = useStore();
  const [sel, setSel] = useState<string>(MAYBE);
  const [sort, setSort] = useState<Sort>('pub');
  const [status, setStatus] = useState<'open' | 'all' | 'done'>('open');
  const [upcoming, setUpcoming] = useState(false);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [orderMsg, setOrderMsg] = useState('');

  const all = Object.values(books);
  const current = lists.find((l) => l.id === sel);
  const inSel = (b: Saved) => (sel === ALL ? true : sel === MAYBE ? b.listIds.length === 0 : b.listIds.includes(sel));

  const shown = useMemo(() => {
    let xs = all.filter(inSel);
    if (status === 'open') xs = xs.filter((b) => b.status === 'maybe');
    if (status === 'done') xs = xs.filter((b) => b.status !== 'maybe');
    if (upcoming) xs = xs.filter((b) => isUpcoming(b.pubDate));
    if (text) {
      const t = text.toLowerCase();
      xs = xs.filter((b) => (b.title + b.authors.join(' ') + b.categories.join(' ')).toLowerCase().includes(t));
    }
    if (sort === 'price') return xs.sort((a, b) => (chosenQuote(a, settings)?.price ?? 0) - (chosenQuote(b, settings)?.price ?? 0));
    return xs.sort(sorters[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, sel, status, upcoming, text, sort, settings]);

  const toOrder = shown.filter((b) => b.status === 'maybe');
  const selAll = all.filter(inSel);
  const stats = {
    toBuy: selAll.filter((b) => b.status === 'maybe'),
    ordered: selAll.filter((b) => b.status !== 'maybe').length,
    prepub: selAll.filter((b) => b.status === 'maybe' && isUpcoming(b.pubDate)).length,
  };

  function orderAll() {
    if (!toOrder.length) return;
    const byVendor = new Map<string, Saved[]>();
    for (const b of toOrder) {
      const v = chosenQuote(b, settings)!.vendor.name;
      byVendor.set(v, [...(byVendor.get(v) ?? []), b]);
    }
    const name = slug(current?.name ?? (sel === MAYBE ? 'maybe' : 'all'));
    for (const [vendor, bs] of byVendor) {
      const rows = bs.map((b) => {
        const q = chosenQuote(b, settings)!;
        return {
          ISBN: b.isbn ?? '',
          Title: b.title,
          Author: b.authors.join('; '),
          'Pub date': b.pubDate ?? '',
          Qty: 1,
          Vendor: vendor,
          'Unit price': q.price.toFixed(2),
          Processing: settings.preprocessing ? (q.processed ? 'Vendor' : 'In-house') : 'None',
          Link: vendorLink(q.vendor, b),
        };
      });
      download(`${name}-${slug(vendor)}-order.csv`, toCsv(rows));
    }
    for (const [vendor, bs] of byVendor) actions.markPurchased(bs.map((b) => b.id), vendor);
    setOrderMsg(`Downloaded ${byVendor.size} order file${byVendor.size > 1 ? 's' : ''}, one per vendor. ${toOrder.length} books marked as ordered.`);
  }

  const count = (id: string) =>
    all.filter((b) => b.status === 'maybe' && (id === ALL ? true : id === MAYBE ? !b.listIds.length : b.listIds.includes(id))).length;

  const tab = (id: string, label: string) => (
    <button key={id} className={`tab ${sel === id ? 'on' : ''}`} onClick={() => { setSel(id); setOrderMsg(''); }}>
      {label} <span>{count(id)}</span>
    </button>
  );

  return (
    <div className="page">
      <div className="tabs">
        {tab(MAYBE, 'Maybe pile')}
        {lists.map((l) => tab(l.id, l.name))}
        {tab(ALL, 'All books')}
        {adding ? (
          <form
            className="tab-new"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) setSel(actions.createList(newName));
              setNewName('');
              setAdding(false);
            }}
          >
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={() => !newName && setAdding(false)} placeholder="e.g. Nonfiction October" />
          </form>
        ) : (
          <button className="tab tab-add" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> New list</button>
        )}
      </div>

      <header className="list-hero">
        <div>
          {current ? (
            <input className="list-name" value={current.name} onChange={(e) => actions.renameList(current.id, e.target.value)} aria-label="List name" />
          ) : (
            <h1 className="list-name">{sel === MAYBE ? 'Maybe pile' : 'All books'}</h1>
          )}
          <p className="page-sub">
            {sel === MAYBE ? 'Everything you saved that isn’t on a list yet.' : sel === ALL ? 'Every saved book, on any list.' : 'Add books over the month, then order them together.'}
          </p>
        </div>
        <div className="list-cta">
          <button className="btn btn-dark btn-lg" disabled={!toOrder.length} onClick={orderAll}>Order {toOrder.length || ''} books</button>
          {current && (
            <button
              className="text-btn"
              onClick={() => {
                if (confirm(`Delete "${current.name}"? The books stay saved.`)) {
                  actions.deleteList(current.id);
                  setSel(MAYBE);
                }
              }}
            >
              Delete list
            </button>
          )}
        </div>
      </header>

      <div className="stats">
        <div><span>To buy</span><strong>{stats.toBuy.length}</strong></div>
        <div><span>Estimated spend</span><strong>{money(totalCost(stats.toBuy, settings))}</strong></div>
        <div><span>Pre-pub</span><strong>{stats.prepub}</strong></div>
        <div><span>Ordered</span><strong>{stats.ordered}</strong></div>
      </div>

      {orderMsg && <div className="banner"><Icon name="check" /> {orderMsg}</div>}

      <div className="toolbar">
        <div className="toolbar-search">
          <Icon name="search" size={14} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter this list" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="pub">Sort by pub date</option>
          <option value="rating">Sort by review score</option>
          <option value="popular">Sort by popularity</option>
          <option value="bestseller">Bestsellers first</option>
          <option value="price">Sort by price</option>
          <option value="added">Recently added</option>
          <option value="title">Title A–Z</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as 'open' | 'all' | 'done')}>
          <option value="open">To buy</option>
          <option value="done">Ordered &amp; in catalog</option>
          <option value="all">All statuses</option>
        </select>
        <label className="toggle">
          <input type="checkbox" checked={upcoming} onChange={(e) => setUpcoming(e.target.checked)} /> Pre-pub only
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.preprocessing} onChange={(e) => actions.updateSettings({ preprocessing: e.target.checked })} /> Shelf-ready prices
        </label>
      </div>

      <BookTable
        books={shown}
        empty={<>Nothing here yet. <a href="#/app/discover">Find books</a> to add.</>}
      />
    </div>
  );
}
