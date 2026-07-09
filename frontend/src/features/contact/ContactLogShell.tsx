import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminSettings } from '@/lib/context/AdminSettingsContext';
import { FetchPaused } from '@/components/shared/FetchPaused';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { SlideOver, DetailField, DetailSection } from '@/components/shared/SlideOver';
import { formatDateTime } from '@/lib/utils/formatters';
import type { ContactMessageModel } from '@/lib/types';
import { CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

async function fetchContactMessages(): Promise<ContactMessageModel[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.contact));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ContactMessageModel))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
      status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
      {status ?? 'new'}
    </span>
  );
}

export function ContactLogShell() {
  const { settings, update } = useAdminSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'resolved'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ id: string; label: string } | null>(null);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['contactMessages'],
    queryFn: fetchContactMessages,
    enabled: settings.fetchContact,
  });
  const selected = data.find(m => m.id === selectedId) ?? null;

  const markResolved = useMutation({
    mutationFn: (id: string) =>
      updateDoc(doc(db, COLLECTIONS.contact, id), { status: 'resolved', resolvedAt: serverTimestamp() }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['contactMessages'] });
      setActionResult({ id, label: '✅ Resolved' });
      setTimeout(() => setActionResult(null), 2500);
    },
    onError: (err: any, id) => {
      setActionResult({ id, label: `⚠️ ${err?.message ?? 'Failed to update'}` });
      setTimeout(() => setActionResult(null), 2500);
    },
  });

  if (!settings.fetchContact) {
    return <FetchPaused onEnable={() => update('fetchContact', true)} />;
  }

  const filtered = data.filter(m => {
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.subject?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || (m.status ?? 'new') === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<ContactMessageModel>[] = [
    {
      key: 'from', header: 'From',
      render: m => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{m.name ?? '—'}</p>
          <p className="text-xs text-gray-400">{m.email ?? '—'}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Topic', render: m => <span className="text-xs text-gray-600">{m.category ?? '—'}</span> },
    {
      key: 'subject', header: 'Subject',
      render: m => <p className="text-sm text-gray-700 max-w-[220px] truncate">{m.subject ?? '—'}</p>,
    },
    { key: 'status', header: 'Status', render: m => <StatusBadge status={m.status} /> },
    { key: 'created', header: 'Submitted', render: m => <span className="text-xs text-gray-400">{formatDateTime(m.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: m => {
        const isPending = markResolved.isPending && markResolved.variables === m.id;
        const result = actionResult?.id === m.id ? actionResult.label : null;
        return (
          <div className="flex items-center gap-1">
            {(m.status ?? 'new') !== 'resolved' && !result && (
              <button
                onClick={e => { e.stopPropagation(); markResolved.mutate(m.id); }}
                disabled={isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Mark resolved">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Resolve
              </button>
            )}
            {result && <span className="text-[11px] font-medium text-gray-700">{result}</span>}
            <button
              onClick={e => { e.stopPropagation(); setSelectedId(m.id); }}
              className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 font-medium transition-colors">
              View →
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {(['all', 'new', 'resolved'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-xl border p-3 text-left transition-all ${statusFilter === s ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <p className="text-xs text-gray-500 capitalize">{s === 'all' ? 'Total Messages' : s}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {s === 'all' ? data.length : data.filter(m => (m.status ?? 'new') === s).length}
            </p>
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search by name, email, subject..."
        onSearch={setSearch}
        searchValue={search}
        rowKey={m => m.id}
        emptyText="No contact messages yet"
        onRowClick={m => setSelectedId(m.id)}
      />

      <SlideOver open={!!selected} onClose={() => setSelectedId(null)}
        title={selected?.subject ?? 'Contact Message'} subtitle={selected ? `From ${selected.name ?? '—'}` : undefined}>
        {selected && (
          <>
            <DetailSection title="Sender">
              <DetailField label="Name" value={selected.name} />
              <DetailField label="Email" value={selected.email} mono />
              <DetailField label="Phone" value={selected.phone || undefined} mono />
              <DetailField label="Topic" value={selected.category} />
            </DetailSection>
            <DetailSection title="Status">
              <DetailField label="Status" value={<StatusBadge status={selected.status} />} />
              <DetailField label="Submitted" value={formatDateTime(selected.createdAt)} />
              {selected.resolvedAt && <DetailField label="Resolved" value={formatDateTime(selected.resolvedAt)} />}
            </DetailSection>
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Message</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.message ?? '—'}</p>
            </div>
            <div className="px-6 py-4 flex items-center gap-2">
              {(selected.status ?? 'new') !== 'resolved' && (
                <button
                  onClick={() => markResolved.mutate(selected.id)}
                  disabled={markResolved.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
                  {markResolved.isPending && markResolved.variables === selected.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle className="h-3.5 w-3.5" />}
                  Mark Resolved
                </button>
              )}
              <a href={`mailto:${selected.email ?? ''}?subject=${encodeURIComponent(`Re: ${selected.subject ?? 'Your message to Zyppi'}`)}`}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Reply by Email
              </a>
              {actionResult?.id === selected.id && (
                <span className="text-xs font-medium text-gray-700">{actionResult.label}</span>
              )}
            </div>
          </>
        )}
      </SlideOver>
    </div>
  );
}
