import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { VerificationBadge, OnlineBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils/formatters';
import type { VehicleModel } from '@/lib/types';
import { CheckCircle, XCircle } from 'lucide-react';
import { VehicleDetail } from './VehicleDetail';

async function fetchVehicles(): Promise<VehicleModel[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.vehicles));
  return snap.docs.map(d => ({ vehicleId: d.id, ...d.data() } as VehicleModel))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export function VehiclesShell() {
  const [search, setSearch] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [selected, setSelected] = useState<VehicleModel | null>(null);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });

  const updateDocStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateDoc(doc(db, COLLECTIONS.vehicles, id), { documentStatus: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
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
      render: v => (
        <div className="flex items-center gap-1">
          {v.documentStatus === 'submitted' && (
            <>
              <button onClick={e => { e.stopPropagation(); updateDocStatus.mutate({ id: v.vehicleId, status: 'approved' }); }}
                className="rounded p-1 text-green-600 hover:bg-green-50 transition-colors" title="Approve docs">
                <CheckCircle className="h-4 w-4" />
              </button>
              <button onClick={e => { e.stopPropagation(); updateDocStatus.mutate({ id: v.vehicleId, status: 'rejected' }); }}
                className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors" title="Reject docs">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); setSelected(v); }}
            className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 font-medium transition-colors">
            View →
          </button>
        </div>
      ),
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
        onRowClick={setSelected}
      />

      <VehicleDetail vehicle={selected as any} onClose={() => setSelected(null)} />
    </div>
  );
}
