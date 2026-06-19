'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Release, DeploymentStatus, WorkItem } from '@/lib/api';

const STATUS_LABELS: Record<DeploymentStatus, string> = {
  draft: 'Draft', scheduled: 'Scheduled', deployed: 'Deployed', rolled_back: 'Rolled Back',
};
const STATUS_COLORS: Record<DeploymentStatus, { bg: string; color: string }> = {
  draft: { bg: '#e5e7eb', color: '#374151' },
  scheduled: { bg: '#dbeafe', color: '#1e40af' },
  deployed: { bg: '#dcfce7', color: '#166534' },
  rolled_back: { bg: '#fef2f2', color: '#991b1b' },
};

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const c = STATUS_COLORS[status];
  return <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>{STATUS_LABELS[status]}</span>;
}

export default function ReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Link items state
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [readyItems, setReadyItems] = useState<WorkItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const [form, setForm] = useState({ version: '', releaseDate: '', summary: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.release(id);
      setRelease(data);
      setSelectedIds(new Set(data.linkedWorkItemIds));
      setForm({ version: data.version, releaseDate: data.releaseDate ?? '', summary: data.summary ?? '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load release');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function openLinkPanel() {
    setLinkError('');
    try {
      const items = await api.workItems({ status: 'ready_for_release' });
      setReadyItems(items);
      setSelectedIds(new Set(release?.linkedWorkItemIds ?? []));
      setShowLinkPanel(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ready items');
    }
  }

  async function handleLinkSave() {
    setLinking(true); setLinkError('');
    try {
      const updated = await api.linkItems(id, [...selectedIds]);
      setRelease(updated);
      setShowLinkPanel(false);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to link items');
    } finally { setLinking(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const updated = await api.updateRelease(id, {
        version: form.version.trim(),
        releaseDate: form.releaseDate || undefined,
        summary: form.summary.trim() || undefined,
      });
      setRelease(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update release');
    } finally { setSaving(false); }
  }

  async function handleStatusChange(status: DeploymentStatus) {
    setError('');
    try {
      const updated = await api.updateRelease(id, { deploymentStatus: status });
      setRelease(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    }
  }

  async function handleDeploy() {
    if (!confirm(`Deploy ${release?.version}? Linked work items will be marked as Released.`)) return;
    setDeploying(true); setError('');
    try {
      const updated = await api.deployRelease(id);
      setRelease(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deploy release');
    } finally { setDeploying(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this release? This cannot be undone.')) return;
    try {
      await api.deleteRelease(id);
      router.push('/pm/releases');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete release');
    }
  }

  if (loading) return <section><div className="card empty" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div></section>;
  if (error && !release) return (
    <section>
      <div className="card error" style={{ padding: 24 }}>{error}</div>
      <Link href="/pm/releases"><button className="button" style={{ marginTop: 16 }}>← Back</button></Link>
    </section>
  );
  if (!release) return null;

  const isDeployed = release.deploymentStatus === 'deployed';
  const isRolledBack = release.deploymentStatus === 'rolled_back';
  const canDeploy = !isDeployed && !isRolledBack && (release.linkedWorkItems?.length ?? 0) > 0;

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Release Notes</div>
          <h1>{release.version}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <StatusBadge status={release.deploymentStatus} />
            {release.releaseDate && (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                {new Date(release.releaseDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!isDeployed && !editing && (
            <button className="button secondary" onClick={() => setEditing(true)}>Edit</button>
          )}
          <Link href="/pm/releases">
            <button style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 16px', background: 'white', cursor: 'pointer' }}>← Back</button>
          </Link>
        </div>
      </div>

      {error && <div className="card error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Status controls */}
      {!isDeployed && !editing && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 18px' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Status:</span>
          {(['draft', 'scheduled', 'rolled_back'] as DeploymentStatus[])
            .filter((s) => s !== release.deploymentStatus)
            .map((s) => {
              const c = STATUS_COLORS[s];
              return (
                <button key={s} onClick={() => handleStatusChange(s)}
                  style={{ background: c.bg, color: c.color, border: 'none', borderRadius: 999, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Mark as {STATUS_LABELS[s]}
                </button>
              );
            })}
          {canDeploy && (
            <button onClick={handleDeploy} disabled={deploying}
              style={{ background: '#166534', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginLeft: 'auto', opacity: deploying ? 0.6 : 1 }}>
              {deploying ? 'Deploying...' : '🚀 Deploy Release'}
            </button>
          )}
          {!canDeploy && !isDeployed && !isRolledBack && (
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
              Link at least one ready work item to deploy
            </span>
          )}
        </div>
      )}

      {isDeployed && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '12px 18px', marginBottom: 20, color: '#166534', fontWeight: 600 }}>
          ✓ Deployed — all linked work items have been marked as Released.
        </div>
      )}

      {editing ? (
        <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Edit Release</h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: 18 }}>
            <div className="field">
              <label>Version *</label>
              <input type="text" required maxLength={50} value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
            </div>
            <div className="field">
              <label>Release Date</label>
              <input type="date" value={form.releaseDate} onChange={(e) => setForm((f) => ({ ...f, releaseDate: e.target.value }))} />
            </div>
            <div className="field">
              <label>Summary</label>
              <textarea rows={3} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, resize: 'vertical', font: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="button" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={() => setEditing(false)}
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 16px', background: 'white', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start', marginBottom: 20 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Summary</h3>
            {release.summary
              ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{release.summary}</p>
              : <p style={{ color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>No summary provided.</p>}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="card">
              <h3 style={{ marginTop: 0, marginBottom: 14 }}>Details</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Status', value: <StatusBadge status={release.deploymentStatus} /> },
                  { label: 'Version', value: release.version },
                  { label: 'Release Date', value: release.releaseDate ? new Date(release.releaseDate).toLocaleDateString() : '—' },
                  { label: 'Items', value: `${release.linkedWorkItems?.length ?? 0}` },
                  { label: 'Created', value: new Date(release.createdAt).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {!isDeployed && (
              <div className="card">
                <button onClick={handleDelete}
                  style={{ width: '100%', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', background: '#fef2f2', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}>
                  Delete Release
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linked Work Items */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Linked Work Items ({release.linkedWorkItems?.length ?? 0})</h3>
          {!isDeployed && (
            <button onClick={openLinkPanel} className="button" style={{ fontSize: 13, padding: '8px 14px' }}>
              {showLinkPanel ? 'Cancel' : 'Link Items'}
            </button>
          )}
        </div>

        {/* Link item picker */}
        {showLinkPanel && (
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600 }}>Select ready-for-release work items:</p>
            {linkError && <div className="error" style={{ marginBottom: 12 }}>{linkError}</div>}
            {readyItems.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                No items are currently in "Ready for Release" status.
              </p>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                  {readyItems.map((item) => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'white' }}>
                      <input type="checkbox" checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(item.id); else next.delete(item.id);
                          setSelectedIds(next);
                        }} />
                      <span style={{ fontWeight: 600 }}>{item.title}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{item.type} · {item.priority}</span>
                    </label>
                  ))}
                </div>
                <button onClick={handleLinkSave} className="button" disabled={linking} style={{ fontSize: 13, padding: '8px 14px' }}>
                  {linking ? 'Saving...' : `Save (${selectedIds.size} selected)`}
                </button>
              </>
            )}
          </div>
        )}

        {(release.linkedWorkItems?.length ?? 0) === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontStyle: 'italic' }}>
            No work items linked yet.{!isDeployed && ' Use "Link Items" to add ready work items.'}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {release.linkedWorkItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/pm/it-workspace/${item.id}`} style={{ color: 'var(--navy)' }}>{item.title}</Link>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{item.type}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{item.priority}</td>
                  <td>
                    <span style={{ background: item.status === 'released' ? '#d1fae5' : '#dcfce7', color: item.status === 'released' ? '#065f46' : '#166534', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                      {item.status === 'released' ? 'Released' : 'Ready for Release'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
