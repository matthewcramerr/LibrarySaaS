import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Icon, Logo } from './ui';
import Home from './site/Home';
import { SiteFooter, SiteNav } from './site/Chrome';
import Discover from './views/Discover';
import Lists from './views/Lists';
import Budget from './views/Budget';
import Missed from './views/Missed';
import Things from './views/Things';
import Pricing from './views/Pricing';
import SettingsView from './views/Settings';

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

export const go = (path: string) => {
  location.hash = path;
};

const APP_NAV = [
  ['/app/discover', 'Discover', 'compass'],
  ['/app/lists', 'Lists', 'list'],
  ['/app/budget', 'Budget builder', 'wallet'],
  ['/app/missed', 'You might have missed', 'calendar'],
] as const;

export default function App() {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  if (route.path.startsWith('/app')) return <AppShell route={route} />;

  return (
    <div className="site">
      <SiteNav path={route.path} />
      {route.path === '/things' ? <Things /> : route.path === '/pricing' ? <Pricing /> : <Home />}
      <SiteFooter />
    </div>
  );
}

function AppShell({ route }: { route: Route }) {
  const { books, settings } = useStore();
  const toBuy = Object.values(books).filter((b) => b.status === 'maybe').length;
  const p = route.path;
  const capture = route.params.get('capture') ?? undefined;

  return (
    <div className="shell">
      <aside className="rail">
        <a href="#/" className="rail-logo"><Logo /></a>
        <div className="rail-lib">{settings.library}</div>
        <nav className="rail-nav">
          {APP_NAV.map(([path, label, icon]) => (
            <a key={path} href={`#${path}`} className={p === path || (p === '/app' && path === '/app/discover') ? 'on' : ''}>
              <Icon name={icon} /> {label}
              {path === '/app/lists' && toBuy > 0 && <span className="rail-count">{toBuy}</span>}
            </a>
          ))}
          <div className="rail-sep" />
          <a href="#/things"><Icon name="box" /> Library of Things</a>
          <a href="#/app/settings" className={p === '/app/settings' ? 'on' : ''}><Icon name="gear" /> Settings</a>
        </nav>
        <div className="rail-foot">
          <a href="#/pricing">Plans &amp; pricing</a>
        </div>
      </aside>
      <main className="shell-main">
        {(p === '/app' || p === '/app/discover') && <Discover capture={capture} />}
        {p === '/app/lists' && <Lists />}
        {p === '/app/budget' && <Budget />}
        {p === '/app/missed' && <Missed />}
        {p === '/app/settings' && <SettingsView />}
      </main>
    </div>
  );
}
