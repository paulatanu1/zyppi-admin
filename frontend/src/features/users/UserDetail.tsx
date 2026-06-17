import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc, where, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { SlideOver, DetailField, DetailSection } from '@/components/shared/SlideOver';
import { VerificationBadge, BookingStatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatDateTime, formatCurrency, timeAgo } from '@/lib/utils/formatters';
import type { UserModel, BookingModel, BookingStatus } from '@/lib/types';
import { CheckCircle, XCircle, Mail, Phone, Calendar, Shield } from 'lucide-react';

interface Props {
  user: UserModel | null;
  onClose: () => void;
}

export function UserDetail({ user, onClose }: Props) {
  const qc = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ['user-bookings', user?.userId],
    enabled: !!user,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.bookings), where('userId', '==', user!.userId))
      );
      return snap.docs.map(d => ({ bookingId: d.id, ...d.data() } as BookingModel))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        .slice(0, 10);
    },
  });

  const updateVerification = useMutation({
    mutationFn: (status: string) =>
      updateDoc(doc(db, COLLECTIONS.users, user!.userId), { verificationStatus: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user-bookings', user?.userId] });
    },
  });

  const totalSpent = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.fareDetails?.totalFare ?? 0), 0);

  return (
    <SlideOver
      open={!!user}
      onClose={onClose}
      title={user?.fullName ?? user?.email ?? 'User Detail'}
      subtitle={`UID: ${user?.userId?.slice(0, 16)}…`}
      width="xl"
    >
      {user && (
        <>
          {/* Avatar + quick stats */}
          <div className="px-6 py-5 flex items-center gap-4 bg-gray-50 border-b border-gray-100">
            <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700">
              {user.fullName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{user.fullName ?? '—'}</h3>
              <div className="flex items-center gap-2 mt-1">
                <VerificationBadge status={user.verificationStatus} />
                {user.role && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{user.role}</span>}
                {user.isAdmin && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 flex items-center gap-1"><Shield className="h-3 w-3" />Admin</span>}
              </div>
            </div>
          </div>

          {/* Quick numbers */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Bookings', value: bookings.length },
              { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length },
              { label: 'Total Spent', value: formatCurrency(totalSpent) },
            ].map(s => (
              <div key={s.label} className="px-4 py-3 text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <DetailSection title="Contact Information">
            <DetailField label="Full Name" value={user.fullName} />
            <DetailField label="Auth Method" value={user.authMethod} />
            <DetailField
              label="Email"
              value={user.email ? (
                <a href={`mailto:${user.email}`} className="flex items-center gap-1 text-indigo-600 hover:underline">
                  <Mail className="h-3.5 w-3.5" />{user.email}
                </a>
              ) : undefined}
            />
            <DetailField
              label="Mobile"
              value={user.mobile ? (
                <a href={`tel:${user.mobile}`} className="flex items-center gap-1 text-indigo-600 hover:underline">
                  <Phone className="h-3.5 w-3.5" />{user.mobile}
                </a>
              ) : undefined}
            />
          </DetailSection>

          {/* Account info */}
          <DetailSection title="Account">
            <DetailField label="User ID" value={user.userId} mono />
            <DetailField label="Role" value={user.role ?? 'Not set'} />
            <DetailField
              label="Joined"
              value={<span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-gray-400" />{formatDate(user.createdAt)}</span>}
            />
            <DetailField label="Last Active" value={timeAgo(user.lastLoginAt)} />
          </DetailSection>

          {/* Verification actions */}
          {user.verificationStatus && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Verification</p>
              <div className="flex items-center gap-3">
                <VerificationBadge status={user.verificationStatus} />
                <div className="flex gap-2">
                  {user.verificationStatus !== 'approved' && (
                    <button
                      onClick={() => updateVerification.mutate('approved')}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                  {user.verificationStatus !== 'rejected' && (
                    <button
                      onClick={() => updateVerification.mutate('rejected')}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  )}
                  {user.verificationStatus !== 'pending' && (
                    <button
                      onClick={() => updateVerification.mutate('pending')}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Reset to Pending
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent bookings */}
          <div className="px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Recent Bookings</p>
            {bookings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No bookings yet</p>
            ) : (
              <div className="space-y-2">
                {bookings.map(b => (
                  <div key={b.bookingId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <BookingStatusBadge status={b.status as BookingStatus} />
                        <span className="text-xs text-gray-400 capitalize">{b.bookingType}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">📍 {b.pickupLocation?.address ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">🏁 {b.dropLocation?.address ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.fareDetails?.totalFare)}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(b.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </SlideOver>
  );
}
