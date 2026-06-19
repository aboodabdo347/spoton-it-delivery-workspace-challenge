'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, WorkItem, WorkItemStatus, WorkItemPriority } from '@/lib/api';

const STATUS_LABELS: Record<WorkItemStatus, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  qa: 'QA',
  ready_for_release: 'Ready for Release',
  released: 'Released',
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

const ALL_STATUSES = Object.keys(STATUS_LABELS) as WorkItemStatus[];

function StatusBadge({ status }: { status: WorkItemStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: WorkItemPriority }) {
  const c = PRIORITY_COLORS[priority];
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export default function ItWorkspacePage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState<WorkItemStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<WorkItemPriority | ''>('');
  const [search, setSearch] = useState('');
  const [myWork, setMyWork] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsData, summaryData] = await Promise.all([
        api.workItems({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: search || undefined,
          myWork: myWork || undefined,
        }),
        api.workspaceSummary(),
      ]);
      setItems(itemsData);
      setSummary(summaryData.byStatus ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load work items');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search, myWork]);

  useEffect(() => { void load(); }, [load]);

  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>Work Items</h1>
          <p>Track features, bugs, improvements, and maintenance tasks through the delivery lifecycle.</p>
        </div>
        <Link href="/pm/it-workspace/new">
          <button className="button">+ New Work Item</button>
        </Link>
      </div>

      {/* Summary counts */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="card" style={{ flex: '1 1 100px', minWidth: 100, textAlign: 'center', padding: '12px 16px' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--navy)' }}>{total}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total</div>
        </div>
        {ALL_STATUSES.map((s) => (
          <div
            key={s}
            className="card"
            style={{ flex: '1 1 100px', minWidth: 100, textAlign: 'center', padding: '12px 16px', cursor: 'pointer', outline: statusFilter === s ? '2px solid var(--orange)' : 'none' }}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: STATUS_COLORS[s].color }}>{summary[s] ?? 0}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '14px 18px' }}>
        <input
          type="search"
          placeholder="Search title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', minWidth: 160 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as WorkItemStatus | '')}
          style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', background: 'white' }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as WorkItemPriority | '')}
          style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', background: 'white' }}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={myWork}
            onChange={(e) => setMyWork(e.target.checked)}
          />
          My Work
        </label>
        {(statusFilter || priorityFilter || search || myWork) && (
          <button
            style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', background: 'white', cursor: 'pointer', color: 'var(--muted)' }}
            onClick={() => { setStatusFilter(''); setPriorityFilter(''); setSearch(''); setMyWork(false); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="card error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="card empty" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          Loading work items...
        </div>
      ) : items.length === 0 ? (
        <div className="card empty" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>No work items found.</p>
          <Link href="/pm/it-workspace/new">
            <button className="button">Create your first work item</button>
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, maxWidth: 300 }}>
                    <Link href={`/pm/it-workspace/${item.id}`} style={{ color: 'var(--navy)' }}>
                      {item.title}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{item.type}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td><PriorityBadge priority={item.priority} /></td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{item.assignee ?? '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <Link href={`/pm/it-workspace/${item.id}`}>
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
