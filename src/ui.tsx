import { useState, type ReactNode } from 'react';

const PATHS: Record<string, ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12.5h2M3 10h18" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  box: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  upload: <path d="M12 16V4m-5 5 5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  cart: <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
};

export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="4" height="18" rx="1" fill="currentColor" />
        <rect x="9" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".55" />
        <rect x="14.5" y="4" width="4" height="17" rx="1" transform="rotate(-12 16.5 12.5)" fill="var(--accent)" />
      </svg>
      Shelfwise
    </span>
  );
}

const SPINES = ['#2f4b3a', '#7a2e1f', '#1f3a5f', '#6b5a2e', '#4a2f5c', '#2e5a5a', '#8a4b1f', '#3d3d3d'];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

/** Real cover when we have one, otherwise a typeset stand-in (never a blank box). */
export function Cover({ src, title, author, size = 'md' }: { src?: string; title: string; author?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img className={`cover cover-${size}`} src={src} alt="" loading="lazy" onError={() => setFailed(true)} onLoad={(e) => (e.currentTarget.naturalWidth < 5 ? setFailed(true) : null)} />;
  }
  return (
    <div className={`cover cover-${size} cover-type`} style={{ background: SPINES[Math.abs(hash(title)) % SPINES.length] }}>
      <span className="cover-title">{title.split(':')[0]}</span>
      {author && size !== 'sm' && <span className="cover-author">{author}</span>}
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, children }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export const coverByIsbn = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
