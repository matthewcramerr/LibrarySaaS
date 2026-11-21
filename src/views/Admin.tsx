import { useEffect, useState } from 'react';
import { api } from '../api';
import { PageHead } from '../ui';

interface Order {
  id: string;
  number: string;
  library_name: string;
  contact_name: string;
  contact_email: string;
  bill_to: string | null;
  tax_exempt: number;
  cert_name: string | null;
  subscriber: number;
  pay_method: string;
  items: string;
  total_cents: number;
  status: string;
  created_at: string;
}
interface Library {
  id: string;
  name: string;
  system_name: string | null;
  plan: string;
  members: number;
  books: number;
  created_at: string;
}

const STATUSES = ['invoiced', 'paid', 'building', 'shipped', 'cancelled'];
const money = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const day = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Admin() {
  const [data, setData] = useState<{ orders: Order[]; libraries: Library[] } | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ orders: Order[]; libraries: Library[] }>('/api/admin/overview').then(setData, (e: Error) => setErr(e.message));
  }, []);

  async function setStatus(o: Order, status: string) {
    await api.patch(`/api/admin/orders/${o.id}`, { status });
    setData((d) => d && { ...d, orders: d.orders.map((x) => (x.id === o.id ? { ...x, status } : x)) });
  }

  if (err) return <div className="page"><p className="error">{err}</p></div>;
  if (!data) return <div className="page"><p className="dim">Loading…</p></div>;

  const open$ = data.orders.filter((o) => o.status !== 'shipped' && o.status !== 'cancelled');
  return (
    <div className="page">
      <PageHead eyebrow="Admin" title="Orders & libraries" sub="Every Library of Things order and every library account." />
      <div className="stats">
        <div><span>Open orders</span><strong>{open$.length}</strong></div>
        <div><span>Open order value</span><strong>{money(open$.reduce((s, o) => s + o.total_cents, 0))}</strong></div>
        <div><span>Libraries</span><strong>{data.libraries.length}</strong></div>
        <div><span>Staff accounts</span><strong>{data.libraries.reduce((s, l) => s + l.members, 0)}</strong></div>
      </div>

      <h2 className="section-title">Library of Things orders</h2>
      {data.orders.length === 0 ? (
        <div className="empty">No orders yet.</div>
      ) : (
        <div className="admin-table">
          {data.orders.map((o) => {
            const items = JSON.parse(o.items) as { title: string; qty: number; unit: number }[];
            return (
              <div key={o.id} className="admin-row">
                <button className="admin-main" onClick={() => setOpen(open === o.id ? null : o.id)}>
                  <span className="mono">{o.number}</span>
                  <strong>{o.library_name}</strong>
                  <span className="dim">{o.contact_name}</span>
                  <span className="mono">{money(o.total_cents)}</span>
                  <span className="dim">{day(o.created_at)}</span>
                </button>
                <select value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                {open === o.id && (
                  <div className="admin-detail">
                    <p>
                      <a href={`mailto:${o.contact_email}`}>{o.contact_email}</a>
                      {o.bill_to && <> · bill to {o.bill_to}</>} · {o.pay_method}
                      {o.tax_exempt ? ` · tax exempt${o.cert_name ? ` (${o.cert_name})` : ' (no certificate yet)'}` : ''}
                      {o.subscriber ? ' · subscriber' : ''}
                    </p>
                    <ul>{items.map((i, n) => <li key={n}>{i.qty} × {i.title} — {money(Math.round(i.unit * 100))} each</li>)}</ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="section-title">Libraries</h2>
      <div className="admin-table">
        {data.libraries.map((l) => (
          <div key={l.id} className="admin-row">
            <div className="admin-main static">
              <strong>{l.name}</strong>
              <span className="dim">{l.system_name ?? '—'}</span>
              <span>{l.members} staff</span>
              <span>{l.books} books</span>
              <span className="dim">{day(l.created_at)}</span>
            </div>
            <span className="dim">{l.plan}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
