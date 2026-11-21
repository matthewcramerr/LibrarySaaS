import { useEffect, useState } from 'react';
import { api } from '../api';
import { signIn, signUp } from '../session';
import { Logo } from '../ui';

const after = (params: URLSearchParams) => {
  const next = params.get('next');
  location.hash = next && next.startsWith('/app') ? next : '/app/lists';
};

export function SignIn({ params }: { params: URLSearchParams }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="auth">
      <form
        className="auth-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr('');
          try {
            await signIn(email, password);
            after(params);
          } catch (x) {
            setErr((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Logo />
        <h1>Welcome back</h1>
        <label>Work email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="auth-err">{err}</p>}
        <button className="btn btn-dark btn-lg btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="auth-alt">New to Shelfmark? <a href={`#/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}>Create an account</a></p>
        <p className="fine">Forgot your password? Ask your library’s account owner for a new invite link.</p>
      </form>
    </div>
  );
}

export function SignUp({ params }: { params: URLSearchParams }) {
  const invite = params.get('invite') ?? '';
  const [inviteLib, setInviteLib] = useState('');
  const [inviteErr, setInviteErr] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '', libraryName: '', systemName: '' });
  const [staff, setStaff] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!invite) return;
    api.get<{ libraryName: string }>(`/api/invites/${encodeURIComponent(invite)}`).then(
      (r) => setInviteLib(r.libraryName),
      (e: Error) => setInviteErr(e.message),
    );
  }, [invite]);

  return (
    <div className="auth">
      <form
        className="auth-card"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!staff) return setErr('Shelfmark is for library staff. Please confirm you work at a library.');
          setBusy(true);
          setErr('');
          try {
            await signUp(invite ? { name: f.name, email: f.email, password: f.password, invite } : f);
            after(params);
          } catch (x) {
            setErr((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Logo />
        <h1>{invite ? (inviteLib ? `Join ${inviteLib}` : 'Join your library') : 'Create your account'}</h1>
        {inviteErr && <p className="auth-err">{inviteErr}</p>}
        <label>Your name<input autoComplete="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Work email<input type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><small>At least 10 characters.</small></label>
        {!invite && (
          <>
            <label>Library name<input required value={f.libraryName} onChange={(e) => setF({ ...f, libraryName: e.target.value })} placeholder="e.g. Riverside Public Library" /></label>
            <label>Library system <span className="opt-label">optional</span><input value={f.systemName} onChange={(e) => setF({ ...f, systemName: e.target.value })} placeholder="e.g. Bridges Library System" /></label>
          </>
        )}
        <label className="check-row"><input type="checkbox" checked={staff} onChange={(e) => setStaff(e.target.checked)} /> I work at a library</label>
        {err && <p className="auth-err">{err}</p>}
        <button className="btn btn-dark btn-lg btn-block" disabled={busy || !!inviteErr}>{busy ? 'Creating…' : invite ? 'Join library' : 'Create account'}</button>
        <p className="auth-alt">Already have an account? <a href="#/login">Sign in</a></p>
      </form>
    </div>
  );
}
