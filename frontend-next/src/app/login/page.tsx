'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.login(email, password);
      saveToken(result.accessToken);
      router.push('/pm/it-workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="form">
      <div>
        <div className="eyebrow">SpotOn Project Engine</div>
        <h1>Intern Challenge Login</h1>
        <p>Use the seeded account to enter the assessment workspace.</p>
      </div>
      <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 14 }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error ? <div className="error">{error}</div> : null}
        <button className="button" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </main>
  );
}
