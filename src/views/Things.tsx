import { useMemo, useState } from 'react';
import { Icon } from '../ui';

// Draft catalog + prices for demand testing (benchmark: Penworthy STEM kits sell for ~$145).
const ITEMS = [
  { id: 'breakout', cat: 'Breakout & mystery', name: 'Breakout box: Mission to the Moon', price: 189, contents: ['Lockable box + 4 locks', 'Puzzle cards and clues', 'Game master guide', 'Reset checklist'] },
  { id: 'mystery', cat: 'Breakout & mystery', name: 'Murder mystery party', price: 169, contents: ['8 character booklets', 'Clue envelopes', 'Host guide', 'Name badges'] },
  { id: 'robot', cat: 'STEM', name: 'Coding robot', price: 119, contents: ['Coding robot', 'Command cards (40)', 'USB charging cable', 'Activity booklet'] },
  { id: 'telescope', cat: 'STEM', name: 'Backyard telescope', price: 149, contents: ['Tabletop telescope', 'Planisphere star finder', 'Red-light flashlight', 'Beginner sky guide'] },
  { id: 'yoga', cat: 'Wellness', name: 'Yoga kit', price: 89, contents: ['Yoga mat', 'Pose cards', 'Foam block', 'Guided practice book'] },
  { id: 'kinder', cat: 'Early literacy', name: 'Ready for kindergarten', price: 79, contents: ['3 picture books', 'Letter + number cards', 'Fine-motor activities', 'Parent guide'] },
  { id: 'art', cat: 'Art', name: 'Art studio', price: 69, contents: ['Watercolor set', 'Brushes', 'Mixed-media paper', 'Project cards'] },
  { id: 'podcast', cat: 'Tech', name: 'Podcasting kit', price: 179, contents: ['2 USB microphones', 'Headphones', 'Tabletop stands', 'Quick-start guide'] },
  { id: 'obd', cat: 'Tech', name: 'Car code reader', price: 89, contents: ['OBD-II code reader', 'Code lookup guide', 'Carrying pouch'] },
  { id: 'bocce', cat: 'Outdoors', name: 'Yard games: bocce', price: 99, contents: ['8 bocce balls', 'Pallino', 'Measuring cord', 'Rules card'] },
  { id: 'birding', cat: 'Outdoors', name: 'Birding backpack', price: 99, contents: ['8×21 binoculars', 'Regional field guide', 'Bird log notebook', 'Backpack'] },
  { id: 'own', cat: 'Custom', name: 'Your own item', price: 0, contents: ['Your item', 'Contents you specify'] },
];

const CASES = [
  { id: 'zip', name: 'Clear zip case', price: 6, note: 'Light, see-through' },
  { id: 'shell', name: 'Hard-shell case', price: 24, note: 'Foam insert, latches' },
  { id: 'tote', name: 'Canvas tote', price: 12, note: 'Soft, washable' },
  { id: 'bin', name: 'Stackable bin', price: 16, note: 'Lid, fits shelves' },
];

const COLORS = [
  { id: 'green', name: 'Reading-room green', hex: '#2f4b3a' },
  { id: 'navy', name: 'Navy', hex: '#1f3a5f' },
  { id: 'brick', name: 'Brick', hex: '#9a3b26' },
  { id: 'mustard', name: 'Mustard', hex: '#c4932b' },
  { id: 'plum', name: 'Plum', hex: '#4f2f5e' },
  { id: 'charcoal', name: 'Charcoal', hex: '#2b2b2b' },
];

const EXTRAS = [
  { id: 'marc', name: 'MARC record', price: 0, locked: true },
  { id: 'tag', name: 'Shelf tag', price: 2 },
  { id: 'card', name: 'Contents & care card', price: 1.5 },
  { id: 'parts', name: 'Spare parts pack', price: 9 },
  { id: 'rfid', name: 'RFID tag', price: 1.25 },
  { id: 'lock', name: 'Security zip tie lock', price: 3 },
];

const TIERS = [
  { qty: 1, off: 0 },
  { qty: 5, off: 5 },
  { qty: 10, off: 10 },
  { qty: 25, off: 15 },
  { qty: 50, off: 20 },
];

const PACKING = 8; // packing, labeling and cataloging per kit
const AGES = ['All ages', 'Kids', 'Teens', 'Adults'];
const AGE_COLOR: Record<string, string> = { 'All ages': '#5b5b5b', Kids: '#d4570f', Teens: '#2f8a3e', Adults: '#1f3a5f' };
const AGE_SHORT: Record<string, string> = { 'All ages': 'ALL', Kids: 'KIDS', Teens: 'TEEN', Adults: 'ADULT' };

interface Config {
  item: string;
  caseId: string;
  color: string;
  library: string;
  title: string;
  age: string;
  loan: number;
  logo?: string;
  extras: string[];
}

interface Line extends Config {
  key: string;
  qty: number;
  unit: number;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const offFor = (qty: number) => [...TIERS].reverse().find((t) => qty >= t.qty)?.off ?? 0;

function unitBase(c: Config) {
  const item = ITEMS.find((i) => i.id === c.item)!;
  const cs = CASES.find((x) => x.id === c.caseId)!;
  const ex = EXTRAS.filter((e) => c.extras.includes(e.id)).reduce((s, e) => s + e.price, 0);
  return item.price + cs.price + ex + PACKING;
}

export default function Things() {
  const [c, setC] = useState<Config>({
    item: 'breakout',
    caseId: 'shell',
    color: 'green',
    library: 'Riverside Public Library',
    title: 'Mission to the Moon',
    age: 'Teens',
    loan: 14,
    extras: ['marc', 'tag', 'card'],
  });
  const [qty, setQty] = useState(5);
  const [view, setView] = useState<'case' | 'tag' | 'card'>('case');
  const [cart, setCart] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState('');
  const [form, setForm] = useState({ library: '', name: '', email: '', billTo: '' });
  const [exempt, setExempt] = useState(true);
  const [subscriber, setSubscriber] = useState(false);
  const [certName, setCertName] = useState('');
  const [pay, setPay] = useState<'invoice' | 'card'>('invoice');

  const set = (patch: Partial<Config>) => setC({ ...c, ...patch });
  const item = ITEMS.find((i) => i.id === c.item)!;
  const color = COLORS.find((x) => x.id === c.color)!.hex;
  const base = unitBase(c);
  const off = offFor(qty);
  const unit = base * (1 - off / 100);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + l.qty * l.unit, 0);

  function pickItem(id: string) {
    const it = ITEMS.find((i) => i.id === id)!;
    set({ item: id, title: id === 'own' ? 'Your Kit Name' : it.name.split(': ').pop()!.replace(/\b\w/g, (m) => m.toUpperCase()) });
  }

  function onLogo(f: File) {
    const r = new FileReader();
    r.onload = () => set({ logo: String(r.result) });
    r.readAsDataURL(f);
  }

  function checkout(e: React.FormEvent) {
    e.preventDefault();
    const no = `SM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    try {
      const k = 'shelfmark:lot-orders';
      localStorage.setItem(k, JSON.stringify([...JSON.parse(localStorage.getItem(k) ?? '[]'), { no, ...form, exempt, certName, subscriber, cart: cart.map(({ logo, ...rest }) => ({ ...rest, hasLogo: !!logo })), total: cartTotal, at: new Date().toISOString() }]));
    } catch { /* storage blocked */ }
    printInvoice(no);
    setSent(no);
  }

  function printInvoice(no: string) {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = cart.map((l) => `<tr><td>${esc(l.title)}<div class="s">${esc(CASES.find((x) => x.id === l.caseId)!.name)} · ${esc(l.age)} · MARC + shelf tag</div></td><td>${l.qty}</td><td>${money(l.unit)}</td><td>${money(l.unit * l.qty)}</td></tr>`).join('');
    w.document.write(`<!doctype html><title>Invoice ${no}</title><style>body{font:14px/1.5 Georgia,serif;color:#16140f;max-width:720px;margin:48px auto;padding:0 24px}h1{font-weight:500;margin:0}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{text-align:left;padding:10px 6px;border-bottom:1px solid #ddd}th{font:12px system-ui;color:#777;text-transform:uppercase}.s{font:12px system-ui;color:#777}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16140f;padding-bottom:16px}.tot{text-align:right;font-size:20px}.note{font:13px system-ui;color:#555;margin-top:24px}</style>
<div class="top"><div><h1>Shelfmark</h1><div class="s">Library of Things</div></div><div style="text-align:right"><strong>DRAFT INVOICE ${no}</strong><div class="s">${new Date().toLocaleDateString()}</div></div></div>
<p><strong>Bill to:</strong> ${esc(form.library)}<br>${esc(form.name)} · ${esc(form.billTo || form.email)}</p>
<table><tr><th>Kit</th><th>Qty</th><th>Each</th><th>Amount</th></tr>${rows}
<tr><td colspan="3">Shipping</td><td>${subscriber ? 'Free' : 'TBD'}</td></tr><tr><td colspan="3">Sales tax</td><td>${exempt ? 'Exempt' + (certName ? ' (certificate on file)' : '') : 'TBD'}</td></tr></table>
<div class="tot">Total due: <strong>${money(cartTotal)}</strong></div>
<p class="note">Your kits are built and shipped once payment is received. Each kit arrives packed, labeled, with a MARC record and shelf tag. Add your barcode and it's ready to lend.</p>
<script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
  }

  function addToCart() {
    setCart([...cart, { ...c, key: Math.random().toString(36).slice(2), qty, unit }]);
    setOpen(true);
  }

  function addBundle(name: string, ids: string[], off: number) {
    const lines = ids.map((id) => {
      const it = ITEMS.find((i) => i.id === id)!;
      const cfg: Config = { ...c, item: id, title: it.name.split(': ').pop()!.replace(/\b\w/g, (m) => m.toUpperCase()) };
      return { ...cfg, key: Math.random().toString(36).slice(2), qty: 1, unit: unitBase(cfg) * (1 - off / 100) };
    });
    setCart([...cart, ...lines]);
    setOpen(true);
    void name;
  }

  const initials = useMemo(() => c.library.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 3).map((w) => w[0]).join(''), [c.library]);
  const Brand = ({ dark = false }: { dark?: boolean }) =>
    c.logo ? <img className="brand-logo" src={c.logo} alt="" /> : <span className={`brand-mark ${dark ? 'dark' : ''}`} style={{ background: dark ? color : undefined }}>{initials || 'PL'}</span>;

  return (
    <div className="studio-page">
      <div className="crumbs">
        <a href="#/">Shelfmark</a> <span>/</span> <a href="#/things">Library of Things</a> <span>/</span> Design a kit
        <button className="cart-btn" onClick={() => setOpen(true)}>
          <Icon name="cart" /> Cart{cartCount ? ` (${cartCount})` : ''}
        </button>
      </div>

      <section className="studio">
        <div className="stage">
          <div className="stage-canvas" style={{ ['--kit' as string]: color }}>
            {view === 'case' && (
              <div className={`case case-${c.caseId}`}>
                {c.caseId === 'shell' && <div className="case-handle" />}
                {c.caseId === 'tote' && <div className="tote-handles" />}
                {c.caseId === 'bin' && <div className="bin-lid" />}
                <div className="case-label">
                  <div className="rating" style={{ background: AGE_COLOR[c.age] }}>{AGE_SHORT[c.age]}</div>
                  <div className="cl-top">
                    <Brand dark />
                    <div>
                      <div className="cl-lib">{c.library}</div>
                      <div className="cl-sub">Library of Things</div>
                    </div>
                  </div>
                  <div className="cl-title">{c.title}</div>
                  <div className="cl-meta">
                    <span>{c.age} · {c.loan}-day loan</span>
                  </div>
                  <div className="cl-barcode">Your barcode here</div>
                </div>
              </div>
            )}
            {view === 'tag' && (
              <div className="shelf-tag">
                <div className="st-band" />
                <Brand dark />
                <div className="st-kicker">Borrow this kit</div>
                <div className="st-title">{c.title}</div>
                <ul>{item.contents.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul>
                <div className="st-foot">
                  <span className="cl-age" style={{ background: AGE_COLOR[c.age] }}>{c.age}</span>
                  <span>{c.loan} days · Ask at the desk</span>
                </div>
              </div>
            )}
            {view === 'card' && (
              <div className="contents-card">
                <div className="cc-head">
                  <Brand dark />
                  <div>
                    <div className="cc-title">{c.title}</div>
                    <div className="cl-sub">{c.library}</div>
                  </div>
                </div>
                <div className="cc-label">What’s inside — check before returning</div>
                <ul>{item.contents.map((x) => <li key={x}><span className="box" />{x}</li>)}</ul>
                <div className="cc-care">Missing or broken piece? Tell staff. Please don’t try to fix it.</div>
              </div>
            )}
          </div>
          <div className="stage-tabs">
            {([['case', 'Case'], ['tag', 'Shelf tag'], ['card', 'Contents card']] as const).map(([v, l]) => (
              <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="config">
          <p className="kicker">Library of Things</p>
          <h1>Design a kit</h1>
          <p className="config-lede">Your branding on a case we pack, label and catalog. Arrives ready to lend.</p>

          <fieldset>
            <legend>1. Item</legend>
            <div className="opt-grid">
              {ITEMS.map((i) => (
                <button key={i.id} className={`opt ${c.item === i.id ? 'on' : ''}`} onClick={() => pickItem(i.id)}>
                  <em className="opt-cat">{i.cat}</em>
                  <span>{i.name}</span>
                  <small>{i.price ? `from ${money(i.price)}` : 'Ship it to us'}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>2. Case</legend>
            <div className="opt-grid two">
              {CASES.map((x) => (
                <button key={x.id} className={`opt ${c.caseId === x.id ? 'on' : ''}`} onClick={() => { set({ caseId: x.id }); setView('case'); }}>
                  <span>{x.name}</span>
                  <small>{x.note} · +{money(x.price)}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>3. Color <span className="legend-val">{COLORS.find((x) => x.id === c.color)!.name}</span></legend>
            <div className="swatches">
              {COLORS.map((x) => (
                <button key={x.id} className={`swatch ${c.color === x.id ? 'on' : ''}`} style={{ background: x.hex }} onClick={() => set({ color: x.id })} aria-label={x.name} title={x.name} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>4. Your branding</legend>
            <div className="fields">
              <label>Library name<input value={c.library} onChange={(e) => set({ library: e.target.value })} /></label>
              <label>Kit name<input value={c.title} onChange={(e) => set({ title: e.target.value })} /></label>
              <label>Age group
                <select value={c.age} onChange={(e) => set({ age: e.target.value })}>{AGES.map((a) => <option key={a}>{a}</option>)}</select>
              </label>
              <label>Loan period
                <select value={c.loan} onChange={(e) => set({ loan: Number(e.target.value) })}>{[7, 14, 21, 28].map((d) => <option key={d} value={d}>{d} days</option>)}</select>
              </label>
            </div>
            <label className="upload">
              <Icon name="upload" />
              <span>{c.logo ? 'Replace logo' : 'Upload your logo'}<small>PNG or SVG, transparent background works best</small></span>
              <input hidden type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
            </label>
          </fieldset>

          <fieldset>
            <legend>5. Extras</legend>
            <div className="extras">
              {EXTRAS.map((x) => (
                <label key={x.id} className={`extra ${x.locked ? 'locked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={c.extras.includes(x.id)}
                    disabled={x.locked}
                    onChange={(e) => set({ extras: e.target.checked ? [...c.extras, x.id] : c.extras.filter((y) => y !== x.id) })}
                  />
                  <span>{x.name}</span>
                  <small>{x.price ? `+${money(x.price)}` : 'Included'}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>6. Quantity</legend>
            <table className="tiers">
              <thead><tr><th>Qty</th><th>Price each</th><th>Savings</th></tr></thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.qty} className={offFor(qty) === t.off ? 'on' : ''} onClick={() => setQty(t.qty)}>
                    <td>{t.qty}{t.qty === 50 ? '+' : ''}</td>
                    <td>{money(base * (1 - t.off / 100))}</td>
                    <td>{t.off ? `${t.off}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>

          <div className="buybox">
            <div className="qty-step">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Fewer">−</button>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantity" />
              <button onClick={() => setQty(qty + 1)} aria-label="More">+</button>
            </div>
            <div className="buy-total">
              <strong>{money(unit * qty)}</strong>
              <span>{money(unit)} each{off ? ` · ${off}% off` : ''}</span>
            </div>
            <button className="btn btn-dark btn-lg" onClick={addToCart}>Add to cart</button>
          </div>
          <p className="fine">Includes packing, labeling and cataloging. Draft pricing — final quote before you pay.</p>
        </div>
      </section>

      <section className="lot-how">
        <h2>How it works</h2>
        <ol>
          <li><strong>Design it here</strong><p>Pick an item, a case and your branding. See it before you order.</p></li>
          <li><strong>We build it</strong><p>Packed in a durable case with labels, a contents card and a shelf tag.</p></li>
          <li><strong>We catalog it</strong><p>Every kit ships with a MARC record ready to load.</p></li>
          <li><strong>You shelve it</strong><p>Stick on your barcode, scan it in, and it’s ready to lend.</p></li>
        </ol>
      </section>

      <section className="bundles">
        <div className="bundles-head">
          <h2>Starter collections</h2>
          <p>Launching a Library of Things? Start with a set. Uses your branding from above.</p>
        </div>
        <div className="bundle-grid">
          {[
            { name: 'Pick 12', desc: 'Launch a collection. Twelve kits, mixed ages.', ids: ['breakout', 'mystery', 'robot', 'telescope', 'yoga', 'kinder', 'art', 'podcast', 'obd', 'bocce', 'birding', 'yoga'], off: 15 },
            { name: 'Collection of 50', desc: 'A full Library of Things, ready for a display wall.', ids: Array.from({ length: 50 }, (_, i) => ITEMS[i % (ITEMS.length - 1)].id), off: 25 },
            { name: 'Kids 5', desc: 'Kindergarten readiness, art, robots and yoga.', ids: ['kinder', 'art', 'robot', 'yoga', 'kinder'], off: 8 },
            { name: 'Kids 10', desc: 'Ten kid-friendly kits across every theme.', ids: ['kinder', 'art', 'robot', 'yoga', 'kinder', 'art', 'robot', 'yoga', 'breakout', 'birding'], off: 12 },
          ].map((b) => (
            <article key={b.name} className="bundle">
              <h3>{b.name}</h3>
              <p>{b.desc}</p>
              <div className="bundle-foot">
                <span>{b.ids.length} kits · {b.off}% off</span>
                <button className="btn btn-line btn-sm" onClick={() => addBundle(b.name, b.ids, b.off)}>Add set</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <h2>Your cart</h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" /></button>
        </div>
        {cart.length === 0 ? (
          <p className="dim">Nothing yet. Design a kit and add it.</p>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.map((l) => (
                <li key={l.key}>
                  <span className="cart-swatch" style={{ background: COLORS.find((x) => x.id === l.color)!.hex }} />
                  <div>
                    <strong>{l.title}</strong>
                    <span>{CASES.find((x) => x.id === l.caseId)!.name} · {l.qty} × {money(l.unit)}</span>
                  </div>
                  <span className="cart-amt">{money(l.qty * l.unit)}</span>
                  <button className="icon-btn" onClick={() => setCart(cart.filter((x) => x !== l))} aria-label="Remove"><Icon name="x" size={14} /></button>
                </li>
              ))}
            </ul>
            <div className="cart-total"><span>Estimated total</span><strong>{money(cartTotal)}</strong></div>
            <div className="cart-ship"><span>Shipping</span><span>{subscriber ? 'Free for Shelfmark libraries' : 'Calculated on invoice'}</span></div>
            <div className="cart-ship"><span>Sales tax</span><span>{exempt ? 'Tax exempt' : 'Calculated on invoice'}</span></div>
            {sent ? (
              <div className="banner"><Icon name="check" /> Invoice {sent} created. Print it or save it as a PDF for your municipality. We start building your kits when payment arrives. (Saved in this browser only for now.)</div>
            ) : (
              <form className="quote" onSubmit={checkout}>
                <h3>Checkout</h3>
                <input required placeholder="Library or system" value={form.library} onChange={(e) => setForm({ ...form, library: e.target.value })} />
                <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <label className="check-row">
                  <input type="checkbox" checked={subscriber} onChange={(e) => setSubscriber(e.target.checked)} /> We subscribe to Shelfmark (free shipping)
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} /> We're tax exempt
                </label>
                {exempt && (
                  <label className="upload upload-sm">
                    <Icon name="upload" />
                    <span>{certName || 'Upload your tax-exempt certificate'}<small>PDF or photo. We approve it once and keep it on file.</small></span>
                    <input hidden type="file" accept=".pdf,image/*" onChange={(e) => setCertName(e.target.files?.[0]?.name ?? '')} />
                  </label>
                )}
                <div className="pay-opts">
                  <label className={`pay ${pay === 'invoice' ? 'on' : ''}`}>
                    <input type="radio" checked={pay === 'invoice'} onChange={() => setPay('invoice')} />
                    <span><strong>Send an invoice</strong><small>For municipal billing or checks. Ships once paid.</small></span>
                  </label>
                  <label className={`pay ${pay === 'card' ? 'on' : ''}`}>
                    <input type="radio" checked={pay === 'card'} onChange={() => setPay('card')} />
                    <span><strong>Pay by card</strong><small>Library purchasing card.</small></span>
                  </label>
                </div>
                {pay === 'invoice' && <input type="email" placeholder="Send invoice to (e.g. accounts payable)" value={form.billTo} onChange={(e) => setForm({ ...form, billTo: e.target.value })} />}
                {pay === 'card' && <p className="fine">Card checkout isn't live yet. Choose invoice for now.</p>}
                <button className="btn btn-dark btn-block" disabled={pay === 'card'}>Create invoice</button>
              </form>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
