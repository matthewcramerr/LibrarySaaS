import { useState } from 'react';
import { actions, getState, uid, useStore, type State, type Vendor } from '../store';
import { download, extractIsbns } from '../csv';
import { PageHead } from '../ui';
import Team from './Team';

export default function SettingsView() {
  const { settings } = useStore();
  const [msg, setMsg] = useState('');
  const upd = (id: string, patch: Partial<Vendor>) =>
    actions.updateSettings({ vendors: settings.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)) });

  const [press, setPress] = useState('');

  async function importCatalog(f: File, key: 'catalogIsbns' | 'systemIsbns') {
    const isbns = extractIsbns(await f.text());
    actions.updateSettings({ [key]: isbns });
    setMsg(`Loaded ${isbns.length.toLocaleString()} ISBNs from ${f.name}.`);
  }

  async function restore(f: File) {
    try {
      actions.replaceAll(JSON.parse(await f.text()) as State);
      setMsg('Backup restored.');
    } catch {
      setMsg('That file is not a Shelfmark backup.');
    }
  }

  return (
    <div className="page narrow">
      <PageHead eyebrow="Settings" title="Your library" sub="Team, vendor discounts, catalogs and backups." />
      {msg && <div className="banner">{msg}</div>}

      <Team />

      <section className="card">
        <h2>Library</h2>
        <label>
          Name <input value={settings.library} onChange={(e) => actions.updateSettings({ library: e.target.value })} />
        </label>
      </section>

      <section className="card">
        <h2>Vendors</h2>
        <p className="muted small">Enter your contract discount. Leave processing blank if the vendor doesn't pre-process. Use {'{isbn}'} in the link.</p>
        <table className="vendors">
          <thead>
            <tr><th>Vendor</th><th>Discount %</th><th>Processing $</th><th>Order link</th><th /></tr>
          </thead>
          <tbody>
            {settings.vendors.map((v) => (
              <tr key={v.id}>
                <td><input value={v.name} onChange={(e) => upd(v.id, { name: e.target.value })} /></td>
                <td><input className="num" type="number" value={v.discount} onChange={(e) => upd(v.id, { discount: Number(e.target.value) })} /></td>
                <td>
                  <input
                    className="num"
                    type="number"
                    step="0.01"
                    value={v.processingFee ?? ''}
                    placeholder="none"
                    onChange={(e) => upd(v.id, { processingFee: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </td>
                <td><input value={v.url} placeholder="https://…{isbn}" onChange={(e) => upd(v.id, { url: e.target.value })} /></td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => actions.updateSettings({ vendors: settings.vendors.filter((x) => x.id !== v.id) })}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="btn btn-sm"
          onClick={() => actions.updateSettings({ vendors: [...settings.vendors, { id: uid(), name: 'New vendor', discount: 0, processingFee: null, url: '' }] })}
        >
          + Add vendor
        </button>
        <div className="row">
          <label>
            Default MSRP when unknown ($)
            <input className="num" type="number" value={settings.defaultMsrp} onChange={(e) => actions.updateSettings({ defaultMsrp: Number(e.target.value) })} />
          </label>
          <label>
            Your cost to process a book in-house ($)
            <input className="num" type="number" step="0.25" value={settings.inHouseProcessing} onChange={(e) => actions.updateSettings({ inHouseProcessing: Number(e.target.value) })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.preprocessing} onChange={(e) => actions.updateSettings({ preprocessing: e.target.checked })} />
            Compare shelf-ready prices
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Catalogs</h2>
        <p className="muted small">
          Upload an export from your ILS (CSV, MARC text or a plain ISBN list). Every book then shows if your library or your
          system already owns it. A live catalog connection comes with system setup.
        </p>
        <div className="row">
          <label>
            Your library — {settings.catalogIsbns.length.toLocaleString()} ISBNs
            <input type="file" accept=".csv,.txt,.mrk,.tsv" onChange={(e) => e.target.files?.[0] && importCatalog(e.target.files[0], 'catalogIsbns')} />
          </label>
          <label>
            Your system — {settings.systemIsbns.length.toLocaleString()} ISBNs
            <input type="file" accept=".csv,.txt,.mrk,.tsv" onChange={(e) => e.target.files?.[0] && importCatalog(e.target.files[0], 'systemIsbns')} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Presses you follow</h2>
        <p className="muted small">Small and regional presses often miss the big review sites. They show up as quick searches on Discover.</p>
        <div className="press-list">
          {settings.presses.map((p) => (
            <span key={p} className="flag flag-list">
              {p}
              <button className="icon-btn" onClick={() => actions.updateSettings({ presses: settings.presses.filter((x) => x !== p) })} aria-label={`Stop following ${p}`}>×</button>
            </span>
          ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const v = press.trim();
            if (v && !settings.presses.includes(v)) actions.updateSettings({ presses: [...settings.presses, v] });
            setPress('');
          }}
        >
          <input value={press} onChange={(e) => setPress(e.target.value)} placeholder="Add a press, e.g. Coffee House Press" />
          <button className="btn btn-line btn-sm">Follow</button>
        </form>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="muted small">Your library’s data is saved to your Shelfmark account. Download a copy anytime.</p>
        <div className="row">
          <button className="btn" onClick={() => download('shelfmark-backup.json', JSON.stringify(getState(), null, 2), 'application/json')}>
            Download backup
          </button>
          <label className="btn">
            Restore backup
            <input hidden type="file" accept=".json" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </label>
        </div>
      </section>
    </div>
  );
}
