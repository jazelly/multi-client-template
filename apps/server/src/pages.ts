// Hosted sign-in page for OAuth clients (the phone app). The OAuth provider sends the browser here with a signed
// query; the page hands that query back with the sign-in so the flow continues to the app.

const STYLE = `
:root { color-scheme: light dark; --bg: #f4f4f2; --card: #fff; --text: #17181a; --muted: #5f6368; --line: #d7d8d4; --accent: #2457d6; --bad: #b3261e; }
@media (prefers-color-scheme: dark) { :root { --bg: #121314; --card: #1c1d1f; --text: #ececea; --muted: #a2a5a9; --line: #34363a; --accent: #7ea2ff; --bad: #ff8a80; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; background: var(--bg); color: var(--text);
  font: 15px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; }
main { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 20px; }
h1 { margin: 0; font-size: 24px; }
form { display: flex; flex-direction: column; gap: 12px; padding: 20px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--muted); }
input { height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--text); font: 16px system-ui, sans-serif; }
input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
button { height: 46px; border: 0; border-radius: 10px; background: var(--accent); color: #fff; font: 600 15px system-ui, sans-serif; cursor: pointer; }
button:disabled { opacity: .6; cursor: progress; }
.error { margin: 0; color: var(--bad); font-weight: 600; }
.error:empty { display: none; }`;

const SCRIPT = `
const q = location.search.slice(1);
const form = document.querySelector('form');
const error = document.querySelector('.error');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  form.querySelector('button').disabled = true;
  error.textContent = '';
  const res = await fetch('/api/auth/sign-in/email', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: f.email, password: f.password, ...(q && { oauth_query: q }) }) });
  const r = await res.json().catch(() => ({}));
  if (r.url) location.href = r.url;
  else { error.textContent = r.message || 'Sign-in failed'; form.querySelector('button').disabled = false; }
});`;

export const signInPage = () => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in</title><style>${STYLE}</style></head>
<body><main><h1>Sign in</h1><form>
<label>Email<input name="email" type="email" autocomplete="username" required></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required></label>
<p class="error" role="alert"></p><button>Sign in</button></form></main><script>${SCRIPT}</script></body></html>`;
