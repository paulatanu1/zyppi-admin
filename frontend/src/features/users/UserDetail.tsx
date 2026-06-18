import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc, where, query } from 'firebase/firestore';
import { useAdminSettings } from '@/lib/context/AdminSettingsContext';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { SlideOver, DetailField, DetailSection } from '@/components/shared/SlideOver';
import { VerificationBadge, BookingStatusBadge } from '@/components/shared/StatusBadge';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { formatDate, formatCurrency, timeAgo } from '@/lib/utils/formatters';
import type { UserModel, BookingModel, VehicleModel, BookingStatus } from '@/lib/types';
import { CheckCircle, XCircle, Mail, Phone, Calendar, Shield, Car, Pencil, Loader2 } from 'lucide-react';

interface Props {
  user: UserModel | null;
  onClose: () => void;
}

export function UserDetail({ user, onClose }: Props) {
  const qc = useQueryClient();
  const { settings } = useAdminSettings();
  const [editingMobile, setEditingMobile] = useState(false);
  const [newMobile, setNewMobile] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [savingMobile, setSavingMobile] = useState(false);

  async function saveMobileNumber() {
    if (!user) return;
    const trimmed = newMobile.trim();
    if (!trimmed) { setMobileError('Mobile number is required'); return; }
    setSavingMobile(true);
    setMobileError('');
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.users), where('mobile', '==', trimmed))
      );
      const conflict = snap.docs.find(d => d.id !== user.userId);
      if (conflict) {
        setMobileError('This mobile number is already registered to another user');
        return;
      }
      await updateDoc(doc(db, COLLECTIONS.users, user.userId), { mobile: trimmed });
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditingMobile(false);
    } catch {
      setMobileError('Failed to update mobile number');
    } finally {
      setSavingMobile(false);
    }
  }

  React.useEffect(() => {
    setEditingMobile(false);
    setMobileError('');
    setVerifyLabel('');
  }, [user?.userId]);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['user-vehicles', user?.userId],
    enabled: !!user && settings.fetchUserDetails,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.vehicles), where('userId', '==', user!.userId))
      );
      return snap.docs.map(d => ({ vehicleId: d.id, ...d.data() } as VehicleModel & { documents?: any }));
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['user-bookings', user?.userId],
    enabled: !!user && settings.fetchUserDetails,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.bookings), where('userId', '==', user!.userId))
      );
      return snap.docs.map(d => ({ bookingId: d.id, ...d.data() } as BookingModel))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        .slice(0, 10);
    },
  });

  const [verifyLabel, setVerifyLabel] = useState('');

  const updateVerification = useMutation({
    mutationFn: (status: string) =>
      updateDoc(doc(db, COLLECTIONS.users, user!.userId), { verificationStatus: status }),
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user-bookings', user?.userId] });
      const labels: Record<string, string> = {
        approved: '✅ Approved successfully',
        rejected: '❌ Rejected',
        pending: '↩️ Reset to pending',
      };
      setVerifyLabel(labels[status] ?? 'Updated');
      setTimeout(() => setVerifyLabel(''), 3000);
    },
    onError: () => {
      setVerifyLabel('Failed — try again');
      setTimeout(() => setVerifyLabel(''), 3000);
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
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Mobile</p>
              {editingMobile ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="tel"
                      value={newMobile}
                      onChange={e => { setNewMobile(e.target.value); setMobileError(''); }}
                      placeholder="+91XXXXXXXXXX"
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      autoFocus
                    />
                    <button
                      onClick={saveMobileNumber}
                      disabled={savingMobile}
                      className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1"
                    >
                      {savingMobile ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingMobile(false); setMobileError(''); }}
                      className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {mobileError && <p className="text-xs text-red-600">{mobileError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {user.mobile ? (
                    <a href={`tel:${user.mobile}`} className="flex items-center gap-1 text-sm text-indigo-600 hover:underline font-mono">
                      <Phone className="h-3.5 w-3.5" />{user.mobile}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-300">—</span>
                  )}
                  <button
                    onClick={() => { setNewMobile(user.mobile ?? ''); setEditingMobile(true); setMobileError(''); }}
                    className="rounded p-0.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit mobile"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
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
            <div className="col-span-2 flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">FCM Token (Push Notifications)</p>
              {user.fcmToken ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">✅ Token registered</span>
                  <span className="text-[10px] font-mono text-gray-400 truncate max-w-[240px]">{user.fcmToken.slice(0, 32)}…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600">❌ No token — notifications won't reach this device</span>
                </div>
              )}
            </div>
          </DetailSection>

          {/* Verification actions */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Verification</p>
            <div className="flex items-center gap-3 flex-wrap">
              <VerificationBadge status={user.verificationStatus ?? 'pending'} />
              <div className="flex gap-2">
                {user.verificationStatus !== 'approved' && (
                  <button
                    onClick={() => updateVerification.mutate('approved')}
                    disabled={updateVerification.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {updateVerification.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <CheckCircle className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                )}
                {user.verificationStatus !== 'rejected' && (
                  <button
                    onClick={() => updateVerification.mutate('rejected')}
                    disabled={updateVerification.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {updateVerification.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <XCircle className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                )}
                {user.verificationStatus !== 'pending' && (
                  <button
                    onClick={() => updateVerification.mutate('pending')}
                    disabled={updateVerification.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {updateVerification.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : null}
                    Reset to Pending
                  </button>
                )}
              </div>
              {verifyLabel && (
                <span className={`text-xs font-medium ${verifyLabel.startsWith('Failed') ? 'text-red-600' : 'text-green-700'}`}>
                  {verifyLabel}
                </span>
              )}
            </div>
          </div>

          {/* Vehicles & Documents */}
          {vehicles.length > 0 && (
            <div className="border-b border-gray-100">
              {vehicles.map((v: any) => (
                <div key={v.vehicleId} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Car className="h-4 w-4 text-gray-400" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {v.vehicleDetails?.brand} {v.vehicleDetails?.model}
                      <span className="ml-2 font-mono text-gray-300">{v.vehicleDetails?.registrationNumber}</span>
                    </p>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium capitalize
                      ${v.documentStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        v.documentStatus === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        v.documentStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'}`}>
                      {v.documentStatus ?? 'pending'}
                    </span>
                  </div>
                  <DocumentViewer documents={v.documents} />
                </div>
              ))}
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
