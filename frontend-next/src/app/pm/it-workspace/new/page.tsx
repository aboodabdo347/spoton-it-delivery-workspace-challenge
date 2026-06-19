'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, WorkItemType, WorkItemPriority } from '@/lib/api';

export default function NewWorkItemPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'feature' as WorkItemType,
    priority: 'medium' as WorkItemPriority,
    assignee: '',
    dueDate: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const item = await api.createWorkItem({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        priority: form.priority,
        assignee: form.assignee.trim() || undefined,
        dueDate: form.dueDate || undefined,
      });
      router.push(`/pm/it-workspace/${item.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create work item');
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">IT Delivery Workspace</div>
          <h1>New Work Item</h1>
        </div>
        <Link href="/pm/it-workspace">
          <button style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 16px', background: 'white', cursor: 'pointer' }}>
            ← Back
          </button>
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div className="field">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              required
              maxLength={200}
              placeholder="Short, clear title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              placeholder="Enough detail for implementation and testing"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, resize: 'vertical', font: 'inherit' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label htmlFor="type">Type *</label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 12px', background: 'white' }}
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="improvement">Improvement</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="priority">Priority *</label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 12px', background: 'white' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label htmlFor="assignee">Assignee</label>
              <input
                id="assignee"
                type="text"
                placeholder="Name or user ID"
                value={form.assignee}
                onChange={(e) => set('assignee', e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button type="submit" className="button" disabled={saving}>
              {saving ? 'Creating...' : 'Create Work Item'}
            </button>
            <Link href="/pm/it-workspace">
              <button type="button" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '11px 16px', background: 'white', cursor: 'pointer' }}>
                Cancel
              </button>
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
