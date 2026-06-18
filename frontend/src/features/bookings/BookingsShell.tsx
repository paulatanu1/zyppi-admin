import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminSettings } from '@/lib/context/AdminSettingsContext';
import { FetchPaused } from '@/components/shared/FetchPaused';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { BookingStatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime, formatCurrency } from '@/lib/utils/formatters';
import type { BookingModel, BookingStatus } from '@/lib/types';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Progress', value: 'inProgress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

async function fetchBookings(): Promise<BookingModel[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.bookings));
  return snap.docs.map(d => ({ bookingId: d.id, ...d.data() } as BookingModel))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export function BookingsShell() {
  const { settings, update } = useAdminSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data = [], isLoading } = useQuery({ queryKey: ['bookings'], queryFn: fetchBookings, enabled: settings.fetchBookings });

  if (!settings.fetchBookings) {
    return <FetchPaused onEnable={() => update('fetchBookings', true)} />;
  }

  const filtered = data.filter(b => {
    const matchSearch = !search ||
      b.bookingId.toLowerCase().includes(search.toLowerCase()) ||
      b.userName?.toLowerCase().includes(search.toLowerCase()) ||
      b.userPhone?.includes(search) ||
      b.pickupLocation?.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<BookingModel>[] = [
    {
      key: 'id', header: 'Booking ID',
      render: b => <span className="font-mono text-xs text-gray-500">{b.bookingId.slice(0, 10)}…</span>,
    },
    {
      key: 'user', header: 'Rider',
      render: b => (
        <div>
          <p className="text-sm font-medium text-gray-900">{b.userName ?? '—'}</p>
          <p className="text-xs text-gray-400">{b.userPhone ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'route', header: 'Route',
      render: b => (
        <div className="max-w-[180px]">
          <p className="text-xs text-gray-700 truncate">📍 {b.pickupLocation?.address ?? '—'}</p>
          <p className="text-xs text-gray-400 truncate">🏁 {b.dropLocation?.address ?? '—'}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: b => <span className="text-xs capitalize text-gray-600">{b.bookingType ?? '—'}</span> },
    { key: 'status', header: 'Status', render: b => <BookingStatusBadge status={b.status as BookingStatus} /> },
    { key: 'fare', header: 'Fare', render: b => <span className="text-sm font-semibold text-gray-900">{formatCurrency(b.fareDetails?.totalFare)}</span> },
    { key: 'payment', header: 'Payment', render: b => <span className="text-xs capitalize text-gray-500">{b.paymentMethod ?? '—'}</span> },
    { key: 'created', header: 'Created', render: b => <span className="text-xs text-gray-500">{formatDateTime(b.createdAt)}</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${statusFilter === s.value ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {s.label}
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">
              {s.value === 'all' ? data.length : data.filter(b => b.status === s.value).length}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search by ID, rider name, phone, location..."
        onSearch={setSearch}
        searchValue={search}
        rowKey={b => b.bookingId}
        emptyText="No bookings found"
      />
    </div>
  );
}
