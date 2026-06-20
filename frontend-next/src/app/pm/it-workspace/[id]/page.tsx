'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  api,
  WorkItem, WorkItemStatus, WorkItemType, WorkItemPriority,
  QaCheck, QaCheckStatus,
} from '@/lib/api';

const STATUS_LABELS: Record<WorkItemStatus, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA', ready_for_release: 'Ready for Release', released: 'Released',
};

const STATUS_COLORS: Record<WorkItemStatus, { bg: string; color: string }> = {
  backlog: { bg: '#e5e7eb', color: '#374151' },
  planned: { bg: '#dbeafe', color: '#1e40af' },
  in_progress: { bg: '#fef3c7', color: '#92400e' },
  qa: { bg: '#ede9fe', color: '#5b21b6' },
  ready_for_release: { bg: '#dcfce7', color: '#166534' },
  released: { bg: '#d1fae5', color: '#065f46' },
};

const PRIORITY_COLORS: Record<WorkItemPriority, { bg: string; color: string }> = {
  low: { bg: '#f3f4f6', color: '#6b7280' },
  medium: { bg: '#dbeafe', color: '#1e40af' },
  high: { bg: '#fff7ed', color: '#c2410c' },
  urgent: { bg: '#fef2f2', color: '#991b1b' },
};

const QA_COLORS: Record<QaCheckStatus, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  passed: { bg: '#dcfce7', color: '#166534' },
  failed: { bg: '#fef2f2', color: '#991b1b' },
};

const NEXT_STATUSES: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ['planned'], planned: ['backlog', 'in_progress'],
  in_progress: ['planned', 'qa'], qa: ['in_progress', 'ready_for_release'],
  ready_for_release: ['qa'], released: [],
};

function StatusBadge({ status }: { status: WorkItemStatus }) {
  const c = STATUS_COLORS[status];
  return <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>{STATUS_LABELS[status]}</span>;
}

function PriorityBadge({ priority }: { priority: WorkItemPriority }) {
  const c = PRIORITY_COLORS[priority];
  return <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>;
}

function QaBadge({ status }: { status: QaCheckStatus }) {
  const c = QA_COLORS[status];
  return <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export default function WorkItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [item, setItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', type: 'feature' as WorkItemType,
    priority: 'medium' as WorkItemPriority, assignee: '', dueDate: '',
  });

  // QA state
  const [qaChecks, setQaChecks] = useState<QaCheck[]>([]);
  const [qaError, setQaError] = useState('');
  const [showAddCheck, setShowAddCheck] = useState(false);
  const [addingCheck, setAddingCheck] = useState(false);
  const [newCheck, setNewCheck] = useState({ testTitle: '', expectedResult: '', actualResult: '', tester: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, checks] = await Promise.all([
        api.workItem(id),
        api.qaChecks(id),
      ]);
      setItem(data);
      setQaChecks(checks);
      setForm({
        title: data.title, description: data.description ?? '',
        type: data.type, priority: data.priority,
        assignee: data.assignee ?? '', dueDate: data.dueDate ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load work item');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const updated = await api.updateWorkItem(id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type, priority: form.priority,
        assignee: form.assignee.trim() || undefined,
        dueDate: form.dueDate || undefined,
      });
      setItem(updated); setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update work item');
    } finally { setSaving(false); }
  }

  async function handleTransition(newStatus: WorkItemStatus) {
    setTransitioning(true); setError('');
    try {
      const updated = await api.updateWorkItem(id, { status: newStatus });
      setItem(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change status');
    } finally { setTransitioning(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this work item? This cannot be undone.')) return;
    try {
      await api.deleteWorkItem(id);
      router.push('/pm/it-workspace');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete work item');
    }
  }

  async function handleAddCheck(e: React.FormEvent) {
    e.preventDefault();
    setAddingCheck(true); setQaError('');
    try {
      const check = await api.createQaCheck(id, {
        testTitle: newCheck.testTitle.trim(),
        expectedResult: newCheck.expectedResult.trim(),
        actualResult: newCheck.actualResult.trim(),
        tester: newCheck.tester.trim() || undefined,
        notes: newCheck.notes.trim() || undefined,
      });
      setQaChecks((prev) => [...prev, check]);
      setNewCheck({ testTitle: '', expectedResult: '', actualResult: '', tester: '', notes: '' });
      setShowAddCheck(false);
    } catch (e) {
      setQaError(e instanceof Error ? e.message : 'Failed to add QA check');
    } finally { setAddingCheck(false); }
  }

  async function handleQaStatus(checkId: string, status: QaCheckStatus) {
    setQaError('');
    try {
      const updated = await api.updateQaCheck(checkId, { status });
      setQaChecks((prev) => prev.map((c) => c.id === checkId ? updated : c));
    } catch (e) {
      setQaError(e instanceof Error ? e.message : 'Failed to update QA check');
    }
  }

  async function handleDeleteCheck(checkId: string) {
    if (!confirm('Delete this QA check?')) return;
    setQaError('');
    try {
      await api.deleteQaCheck(checkId);
      setQaChecks((prev) => prev.filter((c) => c.id !== checkId));
    } catch (e) {
      setQaError(e instanceof Error ? e.message : 'Failed to delete QA check');
    }
  }

  if (loading) return (
    <section><div className="card empty" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div></section>
  );

  if (error && !item) return (
    <section>
      <div className="card error" style={{ padding: 24 }}>{error}</div>
      <Link href="/pm/it-workspace"><button className="button" style={{ marginTop: 16 }}>← Back</button></Link>
    </section>
  );

  if (!item) return null;

  const nextStatuses = NEXT_STATUSES[item.status];
  const passedCount = qaChecks.filter((c) => c.status === 'passed').length;
  const qaReady = qaChecks.length > 0 && passedCount === qaChecks.length;

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1 style={{ wordBreak: 'break-word' }}>{item.title}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>{item.type}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!editing && <button className="button secondary" onClick={() => setEditing(true)}>Edit</button>}
          <Link href="/pm/it-workspace">
            <button style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 16px', background: 'white', cursor: 'pointer' }}>← Back</button>
          </Link>
        </div>
      </div>

      {error && <div className="card error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Status transitions */}
      {nextStatuses.length > 0 && !editing && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 18px' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Move to:</span>
          {nextStatuses.map((s) => {
            const c = STATUS_COLORS[s];
            const blocked = s === 'ready_for_release' && !qaReady;
            return (
              <button key={s} disabled={transitioning || blocked} onClick={() => handleTransition(s)}
                title={blocked ? `Blocked: ${qaChecks.length === 0 ? 'No QA checks' : `${qaChecks.length - passedCount} check(s) not passed`}` : undefined}
                style={{ background: c.bg, color: c.color, border: 'none', borderRadius: 999, padding: '6px 14px', fontWeight: 700, fontSize: 13, cursor: blocked ? 'not-allowed' : 'pointer', opacity: (transitioning || blocked) ? 0.5 : 1 }}>
                {STATUS_LABELS[s]}{blocked ? ' 🔒' : ''}
              </button>
            );
          })}
          {nextStatuses.includes('ready_for_release') && !qaReady && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {qaChecks.length === 0 ? 'Add QA checks to unlock Ready for Release' : `${passedCount}/${qaChecks.length} QA checks passed`}
            </span>
          )}
        </div>
      )}

      {editing ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>Edit Work Item</h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: 18 }}>
            <div className="field">
              <label htmlFor="edit-title">Title *</label>
              <input id="edit-title" type="text" required maxLength={200} value={form.title} onChange={(e) => setField('title', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="edit-description">Description</label>
              <textarea id="edit-description" rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, resize: 'vertical', font: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label htmlFor="edit-type">Type</label>
                <select id="edit-type" value={form.type} onChange={(e) => setField('type', e.target.value)}
                  style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 12px', background: 'white' }}>
                  <option value="feature">Feature</option><option value="bug">Bug</option>
                  <option value="improvement">Improvement</option><option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="edit-priority">Priority</label>
                <select id="edit-priority" value={form.priority} onChange={(e) => setField('priority', e.target.value)}
                  style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 12px', background: 'white' }}>
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label htmlFor="edit-assignee">Assignee</label>
                <input id="edit-assignee" type="text" value={form.assignee} onChange={(e) => setField('assignee', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="edit-dueDate">Due Date</label>
                <input id="edit-dueDate" type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="button" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => { setEditing(false); setError(''); }}
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 16px', background: 'white', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Details + Description */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start', marginBottom: 20 }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Description</h3>
              {item.description
                ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.description}</p>
                : <p style={{ color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>No description provided.</p>}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="card">
                <h3 style={{ marginTop: 0, marginBottom: 14 }}>Details</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <Row label="Status"><StatusBadge status={item.status} /></Row>
                  <Row label="Priority"><PriorityBadge priority={item.priority} /></Row>
                  <Row label="Type">{item.type}</Row>
                  <Row label="Assignee">{item.assignee ?? '—'}</Row>
                  <Row label="Due Date">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</Row>
                  <Row label="Created">{new Date(item.createdAt).toLocaleDateString()}</Row>
                  <Row label="Updated">{new Date(item.updatedAt).toLocaleDateString()}</Row>
                </div>
              </div>
              {item.status !== 'released' && (
                <div className="card">
                  <button onClick={handleDelete}
                    style={{ width: '100%', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', background: '#fef2f2', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}>
                    Delete Work Item
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* QA Checks */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>QA Checks</h3>
                {qaChecks.length > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    {passedCount}/{qaChecks.length} passed
                    {/* progress bar */}
                    <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: '#e5e7eb', width: 200 }}>
                      <div style={{ height: '100%', borderRadius: 999, background: qaReady ? '#16a34a' : '#f59e0b', width: `${(passedCount / qaChecks.length) * 100}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}
              </div>
              {item.status !== 'released' && (
                <button onClick={() => setShowAddCheck(!showAddCheck)} className="button"
                  style={{ fontSize: 13, padding: '8px 14px' }}>
                  {showAddCheck ? 'Cancel' : '+ Add Check'}
                </button>
              )}
            </div>

            {qaError && <div className="error" style={{ marginBottom: 12 }}>{qaError}</div>}

            {/* Add check form */}
            {showAddCheck && (
              <form onSubmit={handleAddCheck} style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Test Title *</label>
                    <input type="text" required maxLength={300} placeholder="What is being tested"
                      value={newCheck.testTitle} onChange={(e) => setNewCheck((n) => ({ ...n, testTitle: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>Tester</label>
                    <input type="text" placeholder="Name" value={newCheck.tester}
                      onChange={(e) => setNewCheck((n) => ({ ...n, tester: e.target.value }))} />
                  </div>
                </div>
                <div className="field">
                  <label>Expected Result *</label>
                  <textarea required rows={2} placeholder="Describe the expected behavior"
                    value={newCheck.expectedResult} onChange={(e) => setNewCheck((n) => ({ ...n, expectedResult: e.target.value }))}
                    style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, font: 'inherit', resize: 'vertical' }} />
                </div>
                <div className="field">
                  <label>Actual Result *</label>
                  <textarea required rows={2} placeholder="What actually happened"
                    value={newCheck.actualResult} onChange={(e) => setNewCheck((n) => ({ ...n, actualResult: e.target.value }))}
                    style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, font: 'inherit', resize: 'vertical' }} />
                </div>
                <div className="field">
                  <label>Notes</label>
                  <input type="text" placeholder="Optional context" value={newCheck.notes}
                    onChange={(e) => setNewCheck((n) => ({ ...n, notes: e.target.value }))} />
                </div>
                <div>
                  <button type="submit" className="button" disabled={addingCheck} style={{ fontSize: 13, padding: '8px 14px' }}>
                    {addingCheck ? 'Adding...' : 'Add Check'}
                  </button>
                </div>
              </form>
            )}

            {/* QA check list */}
            {qaChecks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontStyle: 'italic' }}>
                No QA checks yet. Add one to track testing progress.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {qaChecks.map((check) => (
                  <div key={check.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{check.testTitle}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                          <strong>Expected:</strong> {check.expectedResult}
                        </div>
                        {check.actualResult && (
                          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                            <strong>Actual:</strong> {check.actualResult}
                          </div>
                        )}
                        {check.tester && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Tester: {check.tester}</div>}
                        {check.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Notes: {check.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <QaBadge status={check.status} />
                        {item.status !== 'released' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {check.status !== 'passed' && (
                              <button onClick={() => handleQaStatus(check.id, 'passed')}
                                style={{ background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Pass
                              </button>
                            )}
                            {check.status !== 'failed' && (
                              <button onClick={() => handleQaStatus(check.id, 'failed')}
                                style={{ background: '#fef2f2', color: '#991b1b', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Fail
                              </button>
                            )}
                            {check.status !== 'pending' && (
                              <button onClick={() => handleQaStatus(check.id, 'pending')}
                                style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Reset
                              </button>
                            )}
                            <button onClick={() => handleDeleteCheck(check.id)}
                              style={{ background: 'none', color: '#9ca3af', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{children}</span>
    </div>
  );
}
