import { useEffect, useState } from 'react';
import { importLocal, localSnapshot, useStore, useSync } from './store';
import { initSession, signOut, useSession } from './session';
import { Icon, Logo } from './ui';
import Home from './site/Home';
import { SignIn, SignUp } from './site/Auth';
import { SiteFooter, SiteNav } from './site/Chrome';
import Discover from './views/Discover';
import Lists from './views/Lists';
import Budget from './views/Budget';
import Missed from './views/Missed';
import Things from './views/Things';
import Pricing from './views/Pricing';
import SettingsView from './views/Settings';
import Admin from './views/Admin';

export interface Route {
  path: string;
  params: URLSearchParams;
}

function parse(): Route {
  const h = location.hash.slice(1);
  // legacy bookmarklet links: #capture=...
  if (h.startsWith('capture=')) return { path: '/app/discover', params: new URLSearchParams(h) };
  const [path, qs] = (h || '/').split('?');
  return { path: path || '/', params: new URLSearchParams(qs) };
}

const APP_NAV = [
  ['/app/discover', 'Discover', 'compass'],
  ['/app/lists', 'Lists', 'list'],
  ['/app/budget', 'Budget builder', 'wallet'],
  ['/app/missed', 'You might have missed', 'calendar'],
] as const;

export default function App() {
  const [route, setRoute] = useState<Route>(parse);
  const session = useSession();

  useEffect(() => {
    initSession();
    const on = () => {
      setRoute(parse());
      scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  if (route.path.startsWith('/app')) {
    if (session.status === 'loading') return <div className="boot"><Logo /></div>;
    if (session.status === 'out') {
      const next = location.hash.slice(1);
      return (
        <div className="site">
          <SiteNav path="/login" />
          <SignIn params={new URLSearchParams({ next })} />
        </div>
      );
    }
    return <AppShell route={route} />;
  }

  const page =
    route.path === '/things' ? <Things /> :
    route.path === '/pricing' ? <Pricing /> :
    route.path === '/login' ? <SignIn params={route.params} /> :
    route.path === '/signup' ? <SignUp params={route.params} /> :
    <Home />;

  return (
    <div className="site">
      <SiteNav path={route.path} />
      {page}
      <SiteFooter />
    </div>
  );
}

function SyncBadge() {
  const { status, error } = useSync();
  if (status === 'idle') return null;
  return (
    <span className={`sync sync-${status}`} title={error}>
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'All changes saved' : 'Couldn’t save — check your connection'}
    </span>
  );
}

function ImportBanner() {
  const local = localSnapshot();
  const count = Object.keys(local.books).length;
  const [state, setState] = useState<'ask' | 'busy' | 'done' | 'hidden'>(() => {
    try {
      return localStorage.getItem('shelfmark:v1:imported') || localStorage.getItem('shelfmark:import-dismissed') ? 'hidden' : 'ask';
    } catch {
      return 'hidden';
    }
  });
  const [msg, setMsg] = useState('');
  if (!count || state === 'hidden') return null;
  if (state === 'done') return <div className="banner"><Icon name="check" /> {msg}</div>;
  return (
    <div className="banner banner-import">
      <span>You have {count} book{count === 1 ? '' : 's'} saved in this browser from before you signed in.</span>
      <button
        className="btn btn-dark btn-sm"
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy');
          try {
            const n = await importLocal();
            setMsg(`Imported ${n} books and ${local.lists.length} lists into your library.`);
            setState('done');
          } catch (e) {
            setMsg((e as Error).message);
            setState('ask');
          }
        }}
      >
        {state === 'busy' ? 'Importing…' : 'Import them'}
      </button>
      <button
        className="text-btn"
        onClick={() => {
          try { localStorage.setItem('shelfmark:import-dismissed', '1'); } catch { /* ignore */ }
          setState('hidden');
        }}
      >
        Not now
      </button>
      {msg && <span className="error">{msg}</span>}
    </div>
  );
}

function AppShell({ route }: { route: Route }) {
  const { books } = useStore();
  const session = useSession();
  const me = session.status === 'in' ? session.me : null;
  const toBuy = Object.values(books).filter((b) => b.status === 'maybe').length;
  const p = route.path;
  const capture = route.params.get('capture') ?? undefined;

  return (
    <div className="shell">
      <aside className="rail">
        <a href="#/" className="rail-logo"><Logo /></a>
        <div className="rail-lib">{me?.library?.name}</div>
        <nav className="rail-nav">
          {APP_NAV.map(([path, label, icon]) => (
            <a key={path} href={`#${path}`} className={p === path || (p === '/app' && path === '/app/discover') ? 'on' : ''}>
              <Icon name={icon} /> {label}
              {path === '/app/lists' && toBuy > 0 && <span className="rail-count">{toBuy}</span>}
            </a>
          ))}
          <div className="rail-sep" />
          <a href="#/things"><Icon name="box" /> Library of Things</a>
          <a href="#/app/settings" className={p === '/app/settings' ? 'on' : ''}><Icon name="gear" /> Settings &amp; team</a>
          {me?.user.isAdmin && <a href="#/app/admin" className={p === '/app/admin' ? 'on' : ''}><Icon name="cart" /> Admin</a>}
        </nav>
        <div className="rail-foot">
          <div className="rail-user">
            <strong>{me?.user.name}</strong>
            <span>{me?.user.email}</span>
          </div>
          <button className="text-btn" onClick={async () => { await signOut(); location.hash = '/'; }}>Sign out</button>
        </div>
      </aside>
      <main className="shell-main">
        <div className="shell-top"><SyncBadge /></div>
        <ImportBanner />
        {(p === '/app' || p === '/app/discover') && <Discover capture={capture} />}
        {p === '/app/lists' && <Lists />}
        {p === '/app/budget' && <Budget />}
        {p === '/app/missed' && <Missed />}
        {p === '/app/settings' && <SettingsView />}
        {p === '/app/admin' && (me?.user.isAdmin ? <Admin /> : <div className="page"><p>Admins only.</p></div>)}
      </main>
    </div>
  );
}
