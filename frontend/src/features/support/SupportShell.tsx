import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminSettings } from '@/lib/context/AdminSettingsContext';
import { FetchPaused } from '@/components/shared/FetchPaused';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { formatDateTime } from '@/lib/utils/formatters';
import type { ComplaintModel, FeedbackModel } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
};

function ComplaintsTab() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, COLLECTIONS.complaints));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ComplaintModel))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });

  const filtered = data.filter(c =>
    !search || c.subject?.toLowerCase().includes(search.toLowerCase()) ||
    c.ticketId?.includes(search) || c.userId?.includes(search)
  );

  const columns: Column<ComplaintModel>[] = [
    { key: 'ticket', header: 'Ticket ID', render: c => <span className="font-mono text-xs text-indigo-600">{c.ticketId ?? c.id.slice(0, 8)}</span> },
    {
      key: 'subject', header: 'Subject',
      render: c => <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{c.subject ?? '—'}</p>,
    },
    {
      key: 'priority', header: 'Priority',
      render: c => <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_COLORS[c.priority ?? 'Low'])}>{c.priority ?? '—'}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: c => (
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
          c.status === 'resolved' ? 'bg-green-100 text-green-700' :
          c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600')}>
          {c.status ?? 'Pending'}
        </span>
      ),
    },
    {
      key: 'description', header: 'Description',
      render: c => <p className="text-xs text-gray-500 max-w-[240px] truncate">{c.description ?? '—'}</p>,
    },
    { key: 'created', header: 'Submitted', render: c => <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span> },
  ];

  return (
    <DataTable data={filtered} columns={columns} loading={isLoading}
      searchPlaceholder="Search by ticket ID, subject..." onSearch={setSearch} searchValue={search}
      rowKey={c => c.id} emptyText="No complaints found" />
  );
}

function FeedbacksTab() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, COLLECTIONS.feedbacks));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackModel))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    },
  });

  const filtered = data.filter(f => !search || f.message?.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<FeedbackModel>[] = [
    { key: 'id', header: 'ID', render: f => <span className="font-mono text-xs text-gray-400">{f.feedbackId ?? f.id.slice(0, 8)}</span> },
    {
      key: 'rating', header: 'Rating',
      render: f => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < (f.rating ?? 0) ? 'text-amber-400' : 'text-gray-200'}>★</span>
          ))}
          <span className="ml-1 text-xs text-gray-500">{f.rating}/5</span>
        </div>
      ),
    },
    { key: 'message', header: 'Message', render: f => <p className="text-sm text-gray-700 max-w-[300px]">{f.message ?? '—'}</p> },
    { key: 'created', header: 'Submitted', render: f => <span className="text-xs text-gray-400">{formatDateTime(f.createdAt)}</span> },
  ];

  const avgRating = data.length ? (data.reduce((s, f) => s + (f.rating ?? 0), 0) / data.length).toFixed(1) : '—';

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Avg Rating</p>
          <p className="text-2xl font-bold text-amber-500">⭐ {avgRating}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900">{data.length}</p>
        </div>
      </div>
      <DataTable data={filtered} columns={columns} loading={isLoading}
        searchPlaceholder="Search feedback..." onSearch={setSearch} searchValue={search}
        rowKey={f => f.id} emptyText="No feedback yet" />
    </div>
  );
}

export function SupportShell() {
  const { settings, update } = useAdminSettings();
  const [tab, setTab] = useState<'complaints' | 'feedbacks'>('complaints');

  if (!settings.fetchSupport) {
    return <FetchPaused onEnable={() => update('fetchSupport', true)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {(['complaints', 'feedbacks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-xs font-medium capitalize transition-all ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'complaints' ? <ComplaintsTab /> : <FeedbacksTab />}
    </div>
  );
}
