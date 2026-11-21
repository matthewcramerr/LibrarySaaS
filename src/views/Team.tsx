import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSession } from '../session';

interface Member { id: string; name: string; email: string; role: string }
interface Invite { code: string; expires_at: string }

const linkFor = (code: string) => `${location.origin}${location.pathname}#/signup?invite=${code}`;

export default function Team() {
  const session = useSession();
  const me = session.status === 'in' ? session.me : null;
  const owner = me?.role === 'owner';
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');

  const load = () =>
    api.get<{ members: Member[]; invites: Invite[] }>('/api/team').then((r) => {
      setMembers(r.members);
      setInvites(r.invites);
    }, (e: Error) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(linkFor(code));
      setCopied(code);
    } catch {
      setCopied('');
    }
  }

  return (
    <section className="card">
      <h2>Team</h2>
      <p className="muted small">
        {me?.library?.name}{me?.library?.systemName ? ` · ${me.library.systemName}` : ''} · {members.length} of 3 included seats used
        {members.length > 3 ? ` (+${members.length - 3} extra at $5/month each)` : ''}
      </p>
      {err && <p className="error">{err}</p>}
      <ul className="team">
        {members.map((m) => (
          <li key={m.id}>
            <div><strong>{m.name}</strong><span>{m.email}</span></div>
            <span className="dim small">{m.role === 'owner' ? 'Owner' : 'Staff'}</span>
            {owner && m.id !== me?.user.id && (
              <button className="text-btn" onClick={async () => { if (confirm(`Remove ${m.name} from your library?`)) { await api.del(`/api/team/${m.id}`); load(); } }}>Remove</button>
            )}
          </li>
        ))}
      </ul>
      {owner ? (
        <>
          <div className="row">
            <button className="btn btn-dark btn-sm" onClick={async () => { const r = await api.post<{ code: string }>('/api/invites'); await load(); copy(r.code); }}>
              Create invite link
            </button>
            <span className="muted small">Links work once and expire in 7 days.</span>
          </div>
          {invites.map((i) => (
            <div key={i.code} className="invite">
              <code>{linkFor(i.code)}</code>
              <button className="btn btn-line btn-sm" onClick={() => copy(i.code)}>{copied === i.code ? 'Copied' : 'Copy'}</button>
              <button className="text-btn" onClick={async () => { await api.del(`/api/invites/${i.code}`); load(); }}>Cancel</button>
            </div>
          ))}
        </>
      ) : (
        <p className="muted small">Ask your library’s account owner to invite more staff.</p>
      )}
    </section>
  );
}
