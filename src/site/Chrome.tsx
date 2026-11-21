import { Logo } from '../ui';
import { useSession } from '../session';

export function SiteNav({ path }: { path: string }) {
  const session = useSession();
  const link = (href: string, label: string) => (
    <a href={`#${href}`} className={path === href ? 'on' : ''}>{label}</a>
  );
  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#/" className="nav-logo"><Logo /></a>
        <nav className="nav-links">
          {link('/', 'Product')}
          {link('/things', 'Library of Things')}
          {link('/pricing', 'Pricing')}
        </nav>
        <div className="nav-cta">
          {session.status === 'in' ? (
            <a href="#/app/lists" className="btn btn-dark">Open app</a>
          ) : (
            <>
              <a href="#/login" className="nav-signin">Sign in</a>
              <a href="#/signup" className="btn btn-dark">Start free</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>Collection development and shelf-ready Library of Things kits, made for public libraries.</p>
        </div>
        <div className="footer-cols">
          <div>
            <h4>Product</h4>
            <a href="#/app/discover">Discover</a>
            <a href="#/app/lists">Ordering lists</a>
            <a href="#/app/budget">Budget builder</a>
            <a href="#/app/missed">You might have missed</a>
          </div>
          <div>
            <h4>Library of Things</h4>
            <a href="#/things">Design a kit</a>
            <a href="#/things">Starter bundles</a>
            <a href="#/things">Get a quote</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#/pricing">Pricing</a>
            <a href="#/pricing">For library systems</a>
          </div>
        </div>
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} Shelfmark</span>
        <span>Book data from Open Library</span>
      </div>
    </footer>
  );
}
