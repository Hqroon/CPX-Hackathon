// Home page: log in before the slide gate.
// Accounts are local to this device (no server auth): we only keep a name and email.
import React, { useState } from 'react';
import { CONFIG } from '../config.js';
import TopBar from './Brand.jsx';

const KEY = 'doomscroll-tax.user';

export function loadUser() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  try { localStorage.removeItem(KEY); } catch {}
}

function saveUser(user) {
  try { localStorage.setItem(KEY, JSON.stringify(user)); } catch {}
}

export default function Home({ onLogin }) {
  const saved = loadUser();
  const [mode, setMode] = useState('login'); // login | signup
  const [name, setName] = useState(saved?.name || '');
  const [email, setEmail] = useState(saved?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const signup = mode === 'signup';

  function submit(e) {
    e.preventDefault();
    if (signup && !name.trim()) return setError('Add your name so we know who owes the points.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter an email like name@student.xjtlu.edu.cn.');
    if (password.length < 4) return setError('Your password needs at least 4 characters.');
    const fromEmail = email.trim().split('@')[0];
    const user = { name: name.trim() || fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1), email: email.trim() };
    saveUser(user);
    onLogin(user);
  }

  function guest() {
    const user = { name: 'Guest', email: '' };
    saveUser(user);
    onLogin(user);
  }

  const clear = (set) => (e) => { set(e.target.value); setError(''); };

  return (
    <div className="screen home">
      <TopBar />
      <div className="screen-scroll">
        <p className="eyebrow">{signup ? 'Create your account' : 'Welcome back'}</p>
        <h1 className="title">{signup ? 'Start your first session' : 'Log in to keep scrolling'}</h1>
        <p className="lede">Your first {CONFIG.freeReels} reels are free. After that, every reel costs a point.</p>

        <form id="login-form" className="card form-card" onSubmit={submit} noValidate>
          {signup && (
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={clear(setName)} autoComplete="name" placeholder="Afsar" />
            </label>
          )}
          <label className="field">
            <span>Student email</span>
            <input type="email" value={email} onChange={clear(setEmail)} autoComplete="email" inputMode="email" placeholder="name@student.xjtlu.edu.cn" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password" value={password} onChange={clear(setPassword)}
              autoComplete={signup ? 'new-password' : 'current-password'} placeholder="At least 4 characters"
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>

        <p className="switch-line">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="text-link" onClick={() => { setMode(signup ? 'login' : 'signup'); setError(''); }}>
            {signup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>

      <div className="bottom-actions">
        <button className="btn primary" type="submit" form="login-form">{signup ? 'Create account' : 'Log in'}</button>
        <button className="btn secondary" type="button" onClick={guest}>Try it as a guest</button>
      </div>
    </div>
  );
}
