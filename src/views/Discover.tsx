import { useEffect, useState } from 'react';
import { actions, useStore, type Book } from '../store';
import { fmtDate, isUpcoming, lookupLine, searchBooks } from '../books';
import { HoldingBadges, SourceLinks, useCatalog } from '../BookTable';
import { extractIsbns } from '../csv';
import { Cover, Icon, PageHead } from '../ui';

const SUGGEST = ['subject:graphic novels', 'subject:cozy mystery', 'Percival Everett', 'subject:picture books', 'subject:true crime'];

export default function Discover({ capture }: { capture?: string }) {
  const { books, lists, settings } = useStore();
  const holdings = useCatalog();
  const [q, setQ] = useState('');
  const [orderBy, setOrderBy] = useState<'relevance' | 'newest'>('relevance');
  const [results, setResults] = useState<Book[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [paste, setPaste] = useState('');
  const [pasteMsg, setPasteMsg] = useState('');
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (capture) setPaste(capture);
  }, [capture]);

  async function run(query = q) {
    if (!query.trim()) return;
    setQ(query);
    setBusy(true);
    setErr('');
    try {
      setResults(await searchBooks(query, { orderBy, max: 30 }));
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function capturePaste() {
    const lines = paste.split(/\n|;/).map((l) => l.trim()).filter(Boolean).slice(0, 40);
    if (!lines.length) return;
    setPasteMsg(`Looking up ${lines.length}…`);
    let added = 0;
    const missed: string[] = [];
    for (const line of lines) {
      try {
        const b = await lookupLine(line);
        if (b) {
          actions.addBook(b, target || undefined);
          added++;
        } else missed.push(line);
      } catch {
        missed.push(line);
      }
    }
    setPasteMsg(`Added ${added} to your maybe pile.${missed.length ? ` Couldn't find: ${missed.join(', ')}` : ''}`);
    if (!missed.length) setPaste('');
  }

  const bookmarklet = `javascript:(()=>{const t=(getSelection().toString()||document.title).slice(0,2000);window.open('${location.origin}${location.pathname}#capture='+encodeURIComponent(t))})()`;

  return (
    <div className="page">
      <PageHead eyebrow="Discover" title="Find your next order" sub="Search by title, author, ISBN or subject. Save anything to your maybe pile." />

      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “subject:graphic novels” or an ISBN" autoFocus />
        <select value={orderBy} onChange={(e) => setOrderBy(e.target.value as 'relevance' | 'newest')}>
          <option value="relevance">Best match</option>
          <option value="newest">Newest</option>
        </select>
        <button className="btn btn-dark" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      <div className="suggest">
        {SUGGEST.map((s) => (
          <button key={s} onClick={() => run(s)}>{s.replace('subject:', '')}</button>
        ))}
        {settings.presses.length > 0 && <span className="suggest-label">Presses you follow</span>}
        {settings.presses.map((p) => (
          <button key={p} className="press" onClick={() => { setOrderBy('newest'); run(`publisher:"${p}"`); }}>{p}</button>
        ))}
      </div>

      <div className="discover-grid">
        <section>
          {err && <p className="error">{err}</p>}
          {results === null ? (
            <div className="empty empty-tall">
              <p className="empty-title">Search to start</p>
              <p>Results show pub date, ratings, NYT bestseller status, and whether you already own it.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty">No matches. Try fewer words.</div>
          ) : (
            <div className="cards">
              {results.map((b) => {
                const saved = books[b.id];
                return (
                  <article key={b.id} className="bcard">
                    <a href={b.previewLink} target="_blank" rel="noreferrer" className="bcard-cover">
                      <Cover src={b.cover} title={b.title} author={b.authors[0]} size="lg" />
                      {b.nyt && <span className="ribbon">NYT bestseller</span>}
                    </a>
                    <div className="bcard-body">
                      <h3>{b.title}</h3>
                      <p className="bcard-author">{b.authors.slice(0, 2).join(', ')}</p>
                      <p className="bcard-meta">
                        {fmtDate(b.pubDate)}
                        {isUpcoming(b.pubDate) && <span className="prepub">Pre-pub</span>}
                        {b.rating ? <span> · {b.rating.toFixed(1)}★ ({b.ratingsCount})</span> : null}
                      </p>
                      <div className="bl-flags"><HoldingBadges h={holdings(b)} /></div>
                      <SourceLinks b={b} />
                    </div>
                    <div className="bcard-actions">
                      {saved ? (
                        <a href="#/app/lists" className="btn btn-line btn-sm btn-block"><Icon name="check" size={14} /> Saved</a>
                      ) : (
                        <button className="btn btn-dark btn-sm btn-block" onClick={() => actions.addBook(b)}>Save</button>
                      )}
                      {lists.length > 0 && (
                        <select className="select-sm" value="" onChange={(e) => e.target.value && actions.addBook(b, e.target.value)}>
                          <option value="">Add to list…</option>
                          {lists.filter((l) => !saved?.listIds.includes(l.id)).map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="capture">
          <h2>Quick capture</h2>
          <p>Paste titles or ISBNs from a newsletter or email. One per line.</p>
          <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'9780593655030\nJames by Percival Everett\nThe Ministry of Time'} />
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Maybe pile only</option>
            {lists.map((l) => <option key={l.id} value={l.id}>Also add to {l.name}</option>)}
          </select>
          <button className="btn btn-dark btn-block" onClick={capturePaste} disabled={!paste.trim()}>Add to maybe pile</button>
          {pasteMsg && <p className="capture-msg">{pasteMsg}</p>}
          <label className="capture-file">
            <Icon name="upload" size={14} /> Or upload a CSV of ISBNs
            <input
              hidden
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const isbns = extractIsbns(await f.text());
                setPaste(isbns.join('\n'));
                setPasteMsg(`Found ${isbns.length} ISBNs in ${f.name}. Click "Add to maybe pile".`);
              }}
            />
          </label>
          <div className="capture-bm">
            <strong>Save from any website</strong>
            <p>Works in Edge and Chrome. Drag this button to your favorites bar. Highlight titles in Outlook, Kirkus or Edelweiss, then click it.</p>
            <a className="bookmarklet" href={bookmarklet} onClick={(e) => e.preventDefault()}>+ Shelfmark</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
