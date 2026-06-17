import { format, formatDistanceToNow } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import type { BookingStatus } from '@/lib/types';

export function toDate(ts: Timestamp | undefined): Date | undefined {
  return ts?.toDate();
}

export function formatDate(ts: Timestamp | undefined, pattern = 'dd MMM yyyy'): string {
  const d = toDate(ts);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(ts: Timestamp | undefined): string {
  const d = toDate(ts);
  return d ? format(d, 'dd MMM yyyy, hh:mm a') : '—';
}

export function timeAgo(ts: Timestamp | undefined): string {
  const d = toDate(ts);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—';
}

export function formatCurrency(amount: number | undefined): string {
  if (amount == null) return '—';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  driverArriving: 'Driver Arriving',
  arrived: 'Arrived',
  inProgress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  driverArriving: 'bg-sky-100 text-sky-800',
  arrived: 'bg-cyan-100 text-cyan-800',
  inProgress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-rose-100 text-rose-800',
  expired: 'bg-gray-100 text-gray-600',
};

export const VERIFICATION_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};
