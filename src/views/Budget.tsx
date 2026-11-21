import { useState } from 'react';
import { actions, useStore, type Book, type Saved } from '../store';
import { fmtDate, popularity, searchBooks } from '../books';
import { chosenQuote, money } from '../pricing';
import { useCatalog } from '../BookTable';
import { Cover, PageHead } from '../ui';

interface Pick {
  book: Saved;
  price: number;
  vendor: string;
}

const asSaved = (b: Book): Saved => ({ ...b, status: 'maybe', listIds: [], bestseller: !!b.nyt, addedAt: new Date().toISOString() });

export default function Budget() {
  const { books, settings } = useStore();
  const inCatalog = useCatalog();
  const [amount, setAmount] = useState(400);
  const [topic, setTopic] = useState('nonfiction');
  const [month, setMonth] = useState('');
  const [source, setSource] = useState<'search' | 'saved'>('search');
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');

  async function build(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote('');
    setSaved('');
    try {
      let pool: Saved[];
      if (source === 'saved') {
        const t = topic.toLowerCase();
        pool = Object.values(books).filter((b) => b.status === 'maybe' && (!t || (b.title + b.categories.join(' ')).toLowerCase().includes(t)));
      } else {
        const q = `subject:${topic}`;
        const pages = await Promise.all([0, 40].map((start) => searchBooks(q, { orderBy: month ? 'newest' : 'relevance', max: 40, start })));
        const seen = new Set<string>();
        pool = pages.flat().filter((b) => !seen.has(b.id) && seen.add(b.id)).map((b) => books[b.id] ?? asSaved(b));
      }
      const before = pool.length;
      if (month) pool = pool.filter((b) => b.pubDate?.startsWith(month));
      pool = pool.filter((b) => !inCatalog(b).any && b.status === 'maybe');
      pool.sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || popularity(b) - popularity(a));

      const out: Pick[] = [];
      let left = amount;
      for (const b of pool) {
        const q = chosenQuote(b, settings);
        if (!q || q.price > left) continue;
        out.push({ book: b, price: q.price, vendor: q.vendor.name });
        left -= q.price;
      }
      setPicks(out);
      if (month && pool.length < 5) setNote(`Only ${pool.length} of ${before} matches publish in ${month}. Try a wider date, or pick from your saved books.`);
    } catch (x) {
      setNote((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const spent = picks?.reduce((s, p) => s + p.price, 0) ?? 0;

  function save() {
    if (!picks?.length) return;
    const name = `${topic[0].toUpperCase()}${topic.slice(1)} ${month || ''} · ${money(amount)}`.replace(/\s+/g, ' ');
    for (const p of picks) actions.addBook(p.book);
    actions.createList(name, picks.map((p) => p.book.id));
    setSaved(name);
  }

  return (
    <div className="page">
      <PageHead eyebrow="Budget builder" title="Spend a budget in one click" sub="Pick an amount and a subject. We fill a list with the best-reviewed titles you don’t own yet." />

      <form className="sentence" onSubmit={build}>
        <span>Give me</span>
        <label className="inline-field money">
          $<input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Budget" />
        </label>
        <span>of the best</span>
        <label className="inline-field wide">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Subject" placeholder="nonfiction" />
        </label>
        <span>publishing in</span>
        <label className="inline-field">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Publication month" />
        </label>
        <span>from</span>
        <label className="inline-field">
          <select value={source} onChange={(e) => setSource(e.target.value as 'search' | 'saved')} aria-label="Source">
            <option value="search">all books</option>
            <option value="saved">my saved books</option>
          </select>
        </label>
        <button className="btn btn-dark btn-lg" disabled={busy}>{busy ? 'Building…' : 'Build list'}</button>
      </form>

      {note && <div className="banner banner-warn">{note}</div>}

      {picks && (
        <section className="budget-result">
          <div className="budget-bar">
            <div>
              <strong>{picks.length} books</strong>
              <span>{money(spent)} of {money(amount)}</span>
            </div>
            <div className="meter"><div style={{ width: `${Math.min(100, (spent / amount) * 100)}%` }} /></div>
            {saved ? (
              <a href="#/app/lists" className="btn btn-line">Open “{saved}”</a>
            ) : (
              <button className="btn btn-dark" onClick={save} disabled={!picks.length}>Save as ordering list</button>
            )}
          </div>
          <p className="dim small">
            Ranked by bestseller status, then rating × number of ratings. Books in your catalog are skipped. Prices use your vendor discounts.
          </p>
          <ol className="picks">
            {picks.map((p, i) => (
              <li key={p.book.id}>
                <span className="pick-n">{i + 1}</span>
                <Cover src={p.book.cover} title={p.book.title} author={p.book.authors[0]} size="sm" />
                <div className="pick-text">
                  <strong>{p.book.title}</strong>
                  <span>{p.book.authors.slice(0, 2).join(', ')} · {fmtDate(p.book.pubDate)}{p.book.rating ? ` · ${p.book.rating.toFixed(1)}★` : ''}</span>
                </div>
                <div className="pick-price">
                  <strong>{money(p.price)}</strong>
                  <span>{p.vendor}</span>
                </div>
                <button className="text-btn" onClick={() => setPicks(picks.filter((x) => x !== p))}>Remove</button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
