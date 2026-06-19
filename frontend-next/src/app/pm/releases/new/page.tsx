'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function NewReleasePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ version: '', releaseDate: '', summary: '' });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const release = await api.createRelease({
        version: form.version.trim(),
        releaseDate: form.releaseDate || undefined,
        summary: form.summary.trim() || undefined,
      });
      router.push(`/pm/releases/${release.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create release');
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Release Notes</div>
          <h1>New Release</h1>
        </div>
        <Link href="/pm/releases">
          <button style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 16px', background: 'white', cursor: 'pointer' }}>← Back</button>
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div className="field">
            <label htmlFor="version">Version *</label>
            <input id="version" type="text" required maxLength={50} placeholder="e.g. v1.2.0"
              value={form.version} onChange={(e) => set('version', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="releaseDate">Release Date</label>
            <input id="releaseDate" type="date" value={form.releaseDate} onChange={(e) => set('releaseDate', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="summary">Summary</label>
            <textarea id="summary" rows={3} placeholder="Short description of what's in this release"
              value={form.summary} onChange={(e) => set('summary', e.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, resize: 'vertical', font: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="button" disabled={saving}>{saving ? 'Creating...' : 'Create Release'}</button>
            <Link href="/pm/releases">
              <button type="button" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 16px', background: 'white', cursor: 'pointer' }}>Cancel</button>
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
