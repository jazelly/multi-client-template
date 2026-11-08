import { type Me, type Note, can } from '@app/shared';
import { LogOut, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { SignedOut, api, signIn, signOut } from './api';

const input = 'h-10 rounded-md border border-line bg-surface px-3 text-base text-fg outline-primary';
const primaryButton = 'h-10 rounded-md bg-primary px-4 font-semibold text-on-primary disabled:opacity-60';

export default function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const load = () =>
    api<Me>('/api/me')
      .then(setMe)
      .catch((e) => (e instanceof SignedOut ? setMe(null) : Promise.reject(e)));
  useEffect(() => void load(), []);

  if (me === undefined) return null;
  if (!me) return <SignIn onDone={load} />;
  return <Notes me={me} onSignOut={() => signOut().then(() => setMe(null))} />;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await signIn(String(f.get('email')), String(f.get('password')));
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-4">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 shadow-card">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
          Email
          <input name="email" type="email" autoComplete="username" required className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
          Password
          <input name="password" type="password" autoComplete="current-password" required className={input} />
        </label>
        {error && (
          <p role="alert" className="font-semibold text-bad">
            {error}
          </p>
        )}
        <button disabled={busy} className={primaryButton}>
          Sign in
        </button>
      </form>
    </main>
  );
}

function Notes({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const canWrite = can(me.role, 'notes.write');

  const load = () => api<Note[]>('/api/notes').then(setNotes);
  useEffect(() => void load(), []);

  const run = (p: Promise<unknown>) =>
    p.then(load, (e: Error) => setError(e.message));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">{me.org.name}</h1>
        <span className="text-sm text-muted">
          {me.user.name} · {me.role.name}
        </span>
        <button onClick={onSignOut} aria-label="Sign out" title="Sign out" className="rounded-sm p-1.5 text-muted hover:bg-surface-2">
          <LogOut size={18} />
        </button>
      </header>

      {canWrite && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(api('/api/notes', { body: { text } }).then(() => setText('')));
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="New note" aria-label="New note" className={`${input} flex-1`} />
          <button disabled={!text.trim()} className={primaryButton}>
            Add
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="font-semibold text-bad">
          {error}
        </p>
      )}

      <ul className="divide-y divide-line rounded-lg border border-line bg-surface shadow-card">
        {notes.map((n) => (
          <li key={n.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p>{n.text}</p>
              <p className="text-sm text-muted">
                {n.authorName} · {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {canWrite && (
              <button onClick={() => run(api(`/api/notes/${n.id}`, { method: 'DELETE' }))} aria-label="Delete note" title="Delete" className="rounded-sm p-1.5 text-muted hover:bg-surface-2 hover:text-bad">
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
        {!notes.length && <li className="px-4 py-6 text-center text-muted">No notes yet</li>}
      </ul>
    </main>
  );
}
