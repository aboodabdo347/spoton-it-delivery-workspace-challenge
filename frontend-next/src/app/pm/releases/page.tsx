'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Release, DeploymentStatus } from '@/lib/api';

const STATUS_LABELS: Record<DeploymentStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  deployed: 'Deployed',
  rolled_back: 'Rolled Back',
};

const STATUS_COLORS: Record<DeploymentStatus, { bg: string; color: string }> = {
  draft: { bg: '#e5e7eb', color: '#374151' },
  scheduled: { bg: '#dbeafe', color: '#1e40af' },
  deployed: { bg: '#dcfce7', color: '#166534' },
  rolled_back: { bg: '#fef2f2', color: '#991b1b' },
};

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.releases()
      .then(setReleases)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load releases'))
      .finally(() => setLoading(false));
  }, []);

  const deployed = releases.filter((r) => r.deploymentStatus === 'deployed').length;
  const pending = releases.filter((r) => r.deploymentStatus !== 'deployed' && r.deploymentStatus !== 'rolled_back').length;

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>Release Notes</h1>
          <p>Plan, schedule, and ship versioned releases.</p>
        </div>
        <Link href="/pm/releases/new">
          <button className="button">+ New Release</button>
        </Link>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: releases.length, color: 'var(--navy)' },
          { label: 'Deployed', value: deployed, color: '#166534' },
          { label: 'In Progress', value: pending, color: '#1e40af' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ flex: 1, textAlign: 'center', padding: '14px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {error && <div className="card error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="card empty" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading releases...</div>
      ) : releases.length === 0 ? (
        <div className="card empty" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>No releases yet.</p>
          <Link href="/pm/releases/new"><button className="button">Create first release</button></Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th>Version</th>
                <th>Status</th>
                <th>Release Date</th>
                <th>Items</th>
                <th>Summary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>
                    <Link href={`/pm/releases/${r.id}`} style={{ color: 'var(--navy)' }}>{r.version}</Link>
                  </td>
                  <td><StatusBadge status={r.deploymentStatus} /></td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {r.releaseDate ? new Date(r.releaseDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{r.linkedWorkItems?.length ?? 0} item(s)</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 240 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.summary ?? '—'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/pm/releases/${r.id}`}>
                      <button style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '5px 10px', background: 'white', cursor: 'pointer', fontSize: 13 }}>
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
