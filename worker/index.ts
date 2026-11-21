/// <reference types="@cloudflare/workers-types" />
// Shelfmark API: accounts, libraries, collection data, Library of Things orders.

interface Env {
  DB: D1Database;
}

interface Session {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
  libraryId: string | null;
  role: 'owner' | 'member' | null;
  tokenHash: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const COOKIE = 'sm_session';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // Workers' maximum
const enc = new TextEncoder();

// ---------- helpers ----------
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const hex = (buf: ArrayBuffer | Uint8Array) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

async function body<T>(req: Request, maxBytes = 1_000_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request is too large.');
  try {
    return JSON.parse(text || '{}') as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return hex(bits);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function cookie(token: string, maxAge: number, secure: boolean) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function readCookie(req: Request) {
  const m = (req.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  return m?.[1] ?? null;
}

// ---------- sessions ----------
async function getSession(env: Env, req: Request): Promise<Session | null> {
  const token = readCookie(req);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.is_admin, m.library_id, m.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       LEFT JOIN memberships m ON m.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ?
      ORDER BY m.created_at LIMIT 1`,
  )
    .bind(tokenHash, now())
    .first<{ id: string; email: string; name: string; is_admin: number; library_id: string | null; role: 'owner' | 'member' | null }>();
  if (!row) return null;
  return { userId: row.id, email: row.email, name: row.name, isAdmin: !!row.is_admin, libraryId: row.library_id, role: row.role, tokenHash };
}

async function startSession(env: Env, userId: string, secure: boolean) {
  const token = randomHex(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, expires, now())
    .run();
  return cookie(token, SESSION_DAYS * 86400, secure);
}

function need(s: Session | null): Session & { libraryId: string } {
  if (!s) throw new HttpError(401, 'Please sign in.');
  if (!s.libraryId) throw new HttpError(403, 'Your account is not part of a library.');
  return s as Session & { libraryId: string };
}

async function me(env: Env, s: Session) {
  const lib = s.libraryId
    ? await env.DB.prepare('SELECT id, name, system_name, plan FROM libraries WHERE id = ?').bind(s.libraryId).first<{ id: string; name: string; system_name: string | null; plan: string }>()
    : null;
  return {
    user: { id: s.userId, name: s.name, email: s.email, isAdmin: s.isAdmin },
    library: lib ? { id: lib.id, name: lib.name, systemName: lib.system_name, plan: lib.plan } : null,
    role: s.role,
  };
}

// ---------- routes ----------
type Handler = (ctx: { req: Request; env: Env; session: Session | null; params: string[]; secure: boolean }) => Promise<Response>;
const routes: [string, RegExp, Handler][] = [];
const route = (method: string, path: string, h: Handler) =>
  routes.push([method, new RegExp('^' + path.replace(/:[a-z]+/g, '([^/]+)') + '$'), h]);

// Auth
route('POST', '/api/auth/signup', async ({ req, env, secure }) => {
  const b = await body<Record<string, unknown>>(req);
  const name = str(b.name, 100);
  const email = str(b.email, 254).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const libraryName = str(b.libraryName, 150);
  const systemName = str(b.systemName, 150) || null;
  const inviteCode = str(b.invite, 64);
  if (!name) throw new HttpError(400, 'Enter your name.');
  if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email.');
  if (password.length < 10) throw new HttpError(400, 'Use at least 10 characters for your password.');
  if (password.length > 200) throw new HttpError(400, 'That password is too long.');
  if (await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) {
    throw new HttpError(409, 'An account with that email already exists. Sign in instead.');
  }

  let invite: { code: string; library_id: string } | null = null;
  if (inviteCode) {
    invite = await env.DB.prepare('SELECT code, library_id FROM invites WHERE code = ? AND used_by IS NULL AND expires_at > ?')
      .bind(inviteCode, now())
      .first();
    if (!invite) throw new HttpError(400, 'That invite link has expired or was already used.');
  } else if (!libraryName) {
    throw new HttpError(400, 'Enter your library’s name.');
  }

  const userId = uid();
  const salt = randomHex(16);
  const t = now();
  const stmts = [
    env.DB.prepare('INSERT INTO users (id, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(
      userId, email, name, await hashPassword(password, salt), salt, t,
    ),
  ];
  if (invite) {
    stmts.push(env.DB.prepare("INSERT INTO memberships (user_id, library_id, role, created_at) VALUES (?, ?, 'member', ?)").bind(userId, invite.library_id, t));
    stmts.push(env.DB.prepare('UPDATE invites SET used_by = ? WHERE code = ?').bind(userId, invite.code));
  } else {
    const libraryId = uid();
    stmts.push(env.DB.prepare('INSERT INTO libraries (id, name, system_name, created_at) VALUES (?, ?, ?, ?)').bind(libraryId, libraryName, systemName, t));
    stmts.push(env.DB.prepare("INSERT INTO memberships (user_id, library_id, role, created_at) VALUES (?, ?, 'owner', ?)").bind(userId, libraryId, t));
  }
  await env.DB.batch(stmts);
  const setCookie = await startSession(env, userId, secure);
  const s = (await getSession(env, new Request('https://x', { headers: { cookie: setCookie.split(';')[0] } })))!;
  return json(await me(env, s), 201, { 'set-cookie': setCookie });
});

route('POST', '/api/auth/login', async ({ req, env, secure }) => {
  const b = await body<Record<string, unknown>>(req);
  const email = str(b.email, 254).toLowerCase();
  const password = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
  const since = new Date(Date.now() - 15 * 60e3).toISOString();
  const fails = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_failures WHERE email = ? AND at > ?').bind(email, since).first<{ n: number }>();
  if ((fails?.n ?? 0) >= 8) throw new HttpError(429, 'Too many tries. Wait 15 minutes and try again.');

  const u = await env.DB.prepare('SELECT id, password_hash, password_salt FROM users WHERE email = ?').bind(email).first<{ id: string; password_hash: string; password_salt: string }>();
  const ok = u ? timingSafeEqual(await hashPassword(password, u.password_salt), u.password_hash) : (await hashPassword(password, '00'.repeat(16)), false);
  if (!u || !ok) {
    await env.DB.prepare('INSERT INTO login_failures (email, at) VALUES (?, ?)').bind(email, now()).run();
    throw new HttpError(401, 'That email and password don’t match.');
  }
  await env.DB.prepare('DELETE FROM login_failures WHERE email = ?').bind(email).run();
  const setCookie = await startSession(env, u.id, secure);
  const s = (await getSession(env, new Request('https://x', { headers: { cookie: setCookie.split(';')[0] } })))!;
  return json(await me(env, s), 200, { 'set-cookie': setCookie });
});

route('POST', '/api/auth/logout', async ({ env, session, secure }) => {
  if (session) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run();
  return json({ ok: true }, 200, { 'set-cookie': cookie('', 0, secure) });
});

route('GET', '/api/me', async ({ env, session }) => {
  if (!session) throw new HttpError(401, 'Not signed in.');
  return json(await me(env, session));
});

route('GET', '/api/invites/:code', async ({ env, params }) => {
  const r = await env.DB.prepare(
    'SELECT l.name FROM invites i JOIN libraries l ON l.id = i.library_id WHERE i.code = ? AND i.used_by IS NULL AND i.expires_at > ?',
  )
    .bind(params[0], now())
    .first<{ name: string }>();
  if (!r) throw new HttpError(404, 'That invite link has expired or was already used.');
  return json({ libraryName: r.name });
});

// Collection state
route('GET', '/api/state', async ({ env, session }) => {
  const s = need(session);
  const [lib, lists, books, cat] = await env.DB.batch([
    env.DB.prepare('SELECT name, settings FROM libraries WHERE id = ?').bind(s.libraryId),
    env.DB.prepare('SELECT id, name, created_at FROM lists WHERE library_id = ? ORDER BY created_at').bind(s.libraryId),
    env.DB.prepare('SELECT data FROM books WHERE library_id = ?').bind(s.libraryId),
    env.DB.prepare('SELECT scope, isbn FROM catalog_isbns WHERE library_id = ?').bind(s.libraryId),
  ]);
  const libRow = lib.results[0] as { name: string; settings: string };
  const settings = { ...JSON.parse(libRow?.settings ?? '{}'), library: libRow?.name };
  const catalogIsbns: string[] = [];
  const systemIsbns: string[] = [];
  for (const r of cat.results as { scope: string; isbn: string }[]) (r.scope === 'system' ? systemIsbns : catalogIsbns).push(r.isbn);
  return json({
    settings: { ...settings, catalogIsbns, systemIsbns },
    lists: (lists.results as { id: string; name: string; created_at: string }[]).map((l) => ({ id: l.id, name: l.name, createdAt: l.created_at })),
    books: Object.fromEntries((books.results as { data: string }[]).map((r) => { const b = JSON.parse(r.data); return [b.id, b]; })),
  });
});

const STATUSES = new Set(['maybe', 'purchased', 'cataloged']);
function bookStmt(env: Env, s: Session & { libraryId: string }, b: Record<string, unknown>) {
  const id = str(b.id, 120);
  const status = STATUSES.has(b.status as string) ? (b.status as string) : 'maybe';
  if (!id || !str(b.title, 500)) throw new HttpError(400, 'Each book needs an id and a title.');
  const data = JSON.stringify(b);
  if (data.length > 20_000) throw new HttpError(413, 'A book record is too large.');
  return env.DB.prepare(
    `INSERT INTO books (library_id, id, data, status, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (library_id, id) DO UPDATE SET data = excluded.data, status = excluded.status, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  ).bind(s.libraryId, id, data, status, now(), s.userId);
}

route('PUT', '/api/books', async ({ req, env, session }) => {
  const s = need(session);
  const b = await body<{ books?: Record<string, unknown>[] }>(req, 5_000_000);
  const books = Array.isArray(b.books) ? b.books : [];
  if (books.length > 1000) throw new HttpError(413, 'Send at most 1,000 books at a time.');
  for (let i = 0; i < books.length; i += 100) await env.DB.batch(books.slice(i, i + 100).map((x) => bookStmt(env, s, x)));
  return json({ ok: true, saved: books.length });
});

route('DELETE', '/api/books/:id', async ({ env, session, params }) => {
  const s = need(session);
  await env.DB.prepare('DELETE FROM books WHERE library_id = ? AND id = ?').bind(s.libraryId, decodeURIComponent(params[0])).run();
  return json({ ok: true });
});

route('PUT', '/api/lists/:id', async ({ req, env, session, params }) => {
  const s = need(session);
  const b = await body<{ name?: string; createdAt?: string }>(req);
  const name = str(b.name, 120) || 'Untitled list';
  const existing = await env.DB.prepare('SELECT library_id FROM lists WHERE id = ?').bind(params[0]).first<{ library_id: string }>();
  if (existing && existing.library_id !== s.libraryId) throw new HttpError(404, 'List not found.');
  await env.DB.prepare('INSERT INTO lists (id, library_id, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name')
    .bind(str(params[0], 64), s.libraryId, name, str(b.createdAt, 40) || now())
    .run();
  return json({ ok: true });
});

route('DELETE', '/api/lists/:id', async ({ env, session, params }) => {
  const s = need(session);
  await env.DB.prepare('DELETE FROM lists WHERE id = ? AND library_id = ?').bind(params[0], s.libraryId).run();
  return json({ ok: true });
});

route('PUT', '/api/settings', async ({ req, env, session }) => {
  const s = need(session);
  const b = await body<{ settings?: Record<string, unknown> }>(req, 200_000);
  const { catalogIsbns: _a, systemIsbns: _b, ...settings } = b.settings ?? {};
  void _a; void _b;
  const stmts = [env.DB.prepare('UPDATE libraries SET settings = ? WHERE id = ?').bind(JSON.stringify(settings), s.libraryId)];
  const libName = str(settings.library, 150);
  if (libName && s.role === 'owner') stmts.push(env.DB.prepare('UPDATE libraries SET name = ? WHERE id = ?').bind(libName, s.libraryId));
  await env.DB.batch(stmts);
  return json({ ok: true });
});

route('PUT', '/api/catalog/:scope', async ({ req, env, session, params }) => {
  const s = need(session);
  const scope = params[0] === 'system' ? 'system' : params[0] === 'library' ? 'library' : null;
  if (!scope) throw new HttpError(404, 'Unknown catalog.');
  const b = await body<{ isbns?: unknown[] }>(req, 8_000_000);
  const isbns = [...new Set((b.isbns ?? []).filter((x): x is string => typeof x === 'string' && /^[0-9X]{10}([0-9]{3})?$/.test(x)))];
  if (isbns.length > 400_000) throw new HttpError(413, 'That catalog is too large for one upload.');
  const stmts: D1PreparedStatement[] = [env.DB.prepare('DELETE FROM catalog_isbns WHERE library_id = ? AND scope = ?').bind(s.libraryId, scope)];
  const per = 30; // 3 params per row, stay under D1's 100-parameter limit
  for (let i = 0; i < isbns.length; i += per) {
    const chunk = isbns.slice(i, i + per);
    stmts.push(
      env.DB.prepare(`INSERT OR IGNORE INTO catalog_isbns (library_id, scope, isbn) VALUES ${chunk.map(() => '(?, ?, ?)').join(', ')}`).bind(
        ...chunk.flatMap((x) => [s.libraryId, scope, x]),
      ),
    );
  }
  for (let i = 0; i < stmts.length; i += 400) await env.DB.batch(stmts.slice(i, i + 400));
  return json({ ok: true, count: isbns.length });
});

route('POST', '/api/import', async ({ req, env, session }) => {
  const s = need(session);
  const b = await body<{ books?: Record<string, unknown>[]; lists?: { id: string; name: string; createdAt?: string }[] }>(req, 8_000_000);
  const lists = (b.lists ?? []).slice(0, 500);
  const books = (b.books ?? []).slice(0, 5000);
  const listStmts = lists.map((l) =>
    env.DB.prepare('INSERT OR IGNORE INTO lists (id, library_id, name, created_at) VALUES (?, ?, ?, ?)').bind(str(l.id, 64), s.libraryId, str(l.name, 120) || 'Untitled list', str(l.createdAt, 40) || now()),
  );
  if (listStmts.length) await env.DB.batch(listStmts);
  for (let i = 0; i < books.length; i += 100) await env.DB.batch(books.slice(i, i + 100).map((x) => bookStmt(env, s, x)));
  return json({ ok: true, books: books.length, lists: lists.length });
});

// Team
route('GET', '/api/team', async ({ env, session }) => {
  const s = need(session);
  const members = await env.DB.prepare(
    'SELECT u.id, u.name, u.email, m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.library_id = ? ORDER BY m.created_at',
  ).bind(s.libraryId).all();
  const invites = s.role === 'owner'
    ? await env.DB.prepare('SELECT code, expires_at FROM invites WHERE library_id = ? AND used_by IS NULL AND expires_at > ? ORDER BY created_at DESC').bind(s.libraryId, now()).all()
    : { results: [] };
  return json({ members: members.results, invites: invites.results });
});

route('POST', '/api/invites', async ({ env, session }) => {
  const s = need(session);
  if (s.role !== 'owner') throw new HttpError(403, 'Only the account owner can invite staff.');
  const code = randomHex(16);
  const expires = new Date(Date.now() + 7 * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO invites (code, library_id, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').bind(code, s.libraryId, s.userId, expires, now()).run();
  return json({ code, expiresAt: expires }, 201);
});

route('DELETE', '/api/invites/:code', async ({ env, session, params }) => {
  const s = need(session);
  if (s.role !== 'owner') throw new HttpError(403, 'Only the account owner can manage invites.');
  await env.DB.prepare('DELETE FROM invites WHERE code = ? AND library_id = ?').bind(params[0], s.libraryId).run();
  return json({ ok: true });
});

route('DELETE', '/api/team/:id', async ({ env, session, params }) => {
  const s = need(session);
  if (s.role !== 'owner') throw new HttpError(403, 'Only the account owner can remove staff.');
  if (params[0] === s.userId) throw new HttpError(400, 'You can’t remove yourself.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM memberships WHERE user_id = ? AND library_id = ?').bind(params[0], s.libraryId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(params[0]),
  ]);
  return json({ ok: true });
});

// Library of Things orders
route('POST', '/api/orders', async ({ req, env, session }) => {
  const b = await body<Record<string, unknown>>(req, 200_000);
  const name = str(b.name, 100);
  const email = str(b.email, 254).toLowerCase();
  const libraryName = str(b.library, 150);
  const items = Array.isArray(b.items) ? b.items.slice(0, 200) : [];
  const total = Number(b.total);
  if (!name || !isEmail(email) || !libraryName) throw new HttpError(400, 'Enter your name, work email and library.');
  if (!items.length) throw new HttpError(400, 'Your cart is empty.');
  if (!Number.isFinite(total) || total <= 0 || total > 1_000_000) throw new HttpError(400, 'Invalid total.');
  const pay = b.pay === 'card' ? 'card' : 'invoice';
  const number = `SM-${new Date().getFullYear()}-${String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000)}`;
  const billTo = str(b.billTo, 254);
  await env.DB.prepare(
    `INSERT INTO lot_orders (id, number, library_id, user_id, contact_name, contact_email, library_name, bill_to, tax_exempt, cert_name, subscriber, pay_method, items, total_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(uid(), number, session?.libraryId ?? null, session?.userId ?? null, name, email, libraryName, billTo || null, b.exempt ? 1 : 0, str(b.certName, 200) || null, b.subscriber ? 1 : 0, pay, JSON.stringify(items), Math.round(total * 100), now())
    .run();
  return json({ number }, 201);
});

route('GET', '/api/orders', async ({ env, session }) => {
  const s = need(session);
  const r = await env.DB.prepare('SELECT number, status, total_cents, items, created_at FROM lot_orders WHERE library_id = ? ORDER BY created_at DESC').bind(s.libraryId).all();
  return json({ orders: r.results });
});

// Admin (users.is_admin = 1)
function admin(s: Session | null) {
  if (!s?.isAdmin) throw new HttpError(403, 'Admins only.');
}

route('GET', '/api/admin/overview', async ({ env, session }) => {
  admin(session);
  const [orders, libraries] = await env.DB.batch([
    env.DB.prepare('SELECT id, number, library_name, contact_name, contact_email, bill_to, tax_exempt, cert_name, subscriber, pay_method, items, total_cents, status, created_at FROM lot_orders ORDER BY created_at DESC LIMIT 500'),
    env.DB.prepare(
      `SELECT l.id, l.name, l.system_name, l.plan, l.created_at,
              (SELECT COUNT(*) FROM memberships m WHERE m.library_id = l.id) AS members,
              (SELECT COUNT(*) FROM books b WHERE b.library_id = l.id) AS books
         FROM libraries l ORDER BY l.created_at DESC LIMIT 500`,
    ),
  ]);
  return json({ orders: orders.results, libraries: libraries.results });
});

const ORDER_STATUSES = new Set(['invoiced', 'paid', 'building', 'shipped', 'cancelled']);
route('PATCH', '/api/admin/orders/:id', async ({ req, env, session, params }) => {
  admin(session);
  const b = await body<{ status?: string }>(req);
  if (!ORDER_STATUSES.has(b.status ?? '')) throw new HttpError(400, 'Unknown status.');
  await env.DB.prepare('UPDATE lot_orders SET status = ? WHERE id = ?').bind(b.status, params[0]).run();
  return json({ ok: true });
});

// ---------- entry ----------
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    try {
      // CSRF: state-changing requests must be same-origin JSON.
      if (req.method !== 'GET') {
        const origin = req.headers.get('origin');
        if (origin && new URL(origin).host !== url.host) throw new HttpError(403, 'Cross-site request blocked.');
        if (!(req.headers.get('content-type') ?? '').includes('application/json')) throw new HttpError(415, 'Send JSON.');
      }
      const session = await getSession(env, req);
      for (const [method, re, h] of routes) {
        if (method !== req.method) continue;
        const m = url.pathname.match(re);
        if (m) return await h({ req, env, session, params: m.slice(1), secure: url.protocol === 'https:' });
      }
      throw new HttpError(404, 'Not found.');
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Something went wrong. Try again.' }, 500);
    }
  },
};
