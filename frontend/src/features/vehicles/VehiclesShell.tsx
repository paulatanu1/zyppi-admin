import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminSettings } from '@/lib/context/AdminSettingsContext';
import { FetchPaused } from '@/components/shared/FetchPaused';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { VerificationBadge, OnlineBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/formatters';
import type { VehicleModel } from '@/lib/types';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { VehicleDetail } from './VehicleDetail';

async function fetchVehicles(): Promise<VehicleModel[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.vehicles));
  return snap.docs.map(d => ({ vehicleId: d.id, ...d.data() } as VehicleModel))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export function VehiclesShell() {
  const { settings, update } = useAdminSettings();
  const [search, setSearch] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles, enabled: settings.fetchVehicles });
  const selectedVehicle = data.find(v => v.vehicleId === selectedId) ?? null;

  if (!settings.fetchVehicles) {
    return <FetchPaused onEnable={() => update('fetchVehicles', true)} />;
  }

  const [docResult, setDocResult] = useState<{ id: string; label: string } | null>(null);

  const updateDocStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateDoc(doc(db, COLLECTIONS.vehicles, id), { documentStatus: status }),
    onSuccess: (_d, { id, status }) => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setDocResult({ id, label: status === 'approved' ? '✅ Approved' : '❌ Rejected' });
      setTimeout(() => setDocResult(null), 2500);
    },
    onError: (err: any, { id }) => {
      setDocResult({ id, label: `⚠️ ${err?.message ?? 'Failed'}` });
      setTimeout(() => setDocResult(null), 3000);
    },
  });

  const filtered = data.filter(v => {
    const matchSearch = !search ||
      v.vehicleDetails?.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleDetails?.brand?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleDetails?.model?.toLowerCase().includes(search.toLowerCase()) ||
      v.location?.city?.toLowerCase().includes(search.toLowerCase());
    const matchDoc = docFilter === 'all' || v.documentStatus === docFilter;
    return matchSearch && matchDoc;
  });

  const columns: Column<VehicleModel>[] = [
    {
      key: 'vehicle', header: 'Vehicle',
      render: v => (
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {v.vehicleDetails?.brand} {v.vehicleDetails?.model}
          </p>
          <p className="text-xs font-mono text-gray-400">{v.vehicleDetails?.registrationNumber ?? '—'}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: v => <span className="text-xs text-gray-600">{v.vehicleDetails?.type ?? '—'}</span> },
    { key: 'city', header: 'City', render: v => <span className="text-xs text-gray-600">{v.location?.city ?? '—'}</span> },
    { key: 'status', header: 'Documents', render: v => <VerificationBadge status={v.documentStatus} /> },
    { key: 'online', header: 'Status', render: v => <OnlineBadge online={v.isOnline} /> },
    {
      key: 'rating', header: 'Rating',
      render: v => (
        <span className="text-xs text-gray-600">
          ⭐ {v.driver?.rating?.toFixed(1) ?? '—'} ({v.driver?.totalTrips ?? 0} trips)
        </span>
      ),
    },
    {
      key: 'pricing', header: 'Rate',
      render: v => <span className="text-xs text-gray-600">₹{v.pricing?.basePrice ?? '—'} + ₹{v.pricing?.perKmRate ?? '—'}/km</span>,
    },
    { key: 'created', header: 'Registered', render: v => <span className="text-xs text-gray-500">{formatDate(v.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: v => {
        const isPending = updateDocStatus.isPending && updateDocStatus.variables?.id === v.vehicleId;
        const result = docResult?.id === v.vehicleId ? docResult.label : null;
        return (
        <div className="flex items-center gap-1">
          {v.documentStatus === 'submitted' && !result && (
            <>
              <button
                onClick={e => { e.stopPropagation(); updateDocStatus.mutate({ id: v.vehicleId, status: 'approved' }); }}
                disabled={isPending}
                className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Approve docs">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); updateDocStatus.mutate({ id: v.vehicleId, status: 'rejected' }); }}
                disabled={isPending}
                className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors" title="Reject docs">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              </button>
            </>
          )}
          {result && <span className="text-[11px] font-medium text-gray-700">{result}</span>}
          <button onClick={e => { e.stopPropagation(); setSelectedId(v.vehicleId); }}
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
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'submitted', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setDocFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${docFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {s === 'all' ? 'All' : s}
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">
              {s === 'all' ? data.length : data.filter(v => v.documentStatus === s).length}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search by reg. number, brand, model, city..."
        onSearch={setSearch}
        searchValue={search}
        rowKey={v => v.vehicleId}
        emptyText="No vehicles found"
        onRowClick={v => setSelectedId(v.vehicleId)}
      />

      <VehicleDetail vehicle={selectedVehicle as any} onClose={() => setSelectedId(null)} />
    </div>
  );
}
