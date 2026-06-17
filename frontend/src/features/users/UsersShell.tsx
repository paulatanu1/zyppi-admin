import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { VerificationBadge } from '@/components/shared/StatusBadge';
import { formatDate, timeAgo } from '@/lib/utils/formatters';
import type { UserModel } from '@/lib/types';
import { CheckCircle, XCircle, MoreVertical } from 'lucide-react';

async function fetchUsers(): Promise<UserModel[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.users), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ userId: d.id, ...d.data() } as UserModel));
}

export function UsersShell() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const updateVerification = useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      updateDoc(doc(db, COLLECTIONS.users, uid), { verificationStatus: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const filtered = data.filter(u => {
    const matchSearch = !search ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile?.includes(search);
    const matchStatus = statusFilter === 'all' || u.verificationStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<UserModel>[] = [
    {
      key: 'name', header: 'User',
      render: u => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
            {u.fullName?.[0]?.toUpperCase() ?? u.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{u.fullName ?? '—'}</p>
            <p className="text-xs text-gray-400">{u.email ?? u.mobile ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: u => <span className="text-xs text-gray-600">{u.role ?? '—'}</span> },
    { key: 'mobile', header: 'Phone', render: u => <span className="text-xs font-mono">{u.mobile ?? '—'}</span> },
    {
      key: 'verification', header: 'Verification',
      render: u => <VerificationBadge status={u.verificationStatus} />,
    },
    { key: 'joined', header: 'Joined', render: u => <span className="text-xs text-gray-500">{formatDate(u.createdAt)}</span> },
    { key: 'lastSeen', header: 'Last Active', render: u => <span className="text-xs text-gray-500">{timeAgo(u.lastLoginAt)}</span> },
    {
      key: 'actions', header: '',
      render: u => (
        <div className="flex items-center gap-1">
          {u.verificationStatus === 'submitted' && (
            <>
              <button
                onClick={() => updateVerification.mutate({ uid: u.userId, status: 'approved' })}
                className="rounded p-1 text-green-600 hover:bg-green-50 transition-colors" title="Approve">
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => updateVerification.mutate({ uid: u.userId, status: 'rejected' })}
                className="rounded p-1 text-red-500 hover:bg-red-50 transition-colors" title="Reject">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {(['all', 'pending', 'submitted', 'approved'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-xl border p-3 text-left transition-all ${statusFilter === s ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <p className="text-xs text-gray-500 capitalize">{s === 'all' ? 'Total Users' : `${s.charAt(0).toUpperCase() + s.slice(1)}`}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {s === 'all' ? data.length : data.filter(u => u.verificationStatus === s).length}
            </p>
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Search by name, email, phone..."
        onSearch={setSearch}
        searchValue={search}
        rowKey={u => u.userId}
        emptyText="No users found"
      />
    </div>
  );
}
