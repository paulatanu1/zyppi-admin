import React from 'react';
import { cn } from '@/lib/utils/cn';
import { STATUS_COLORS, STATUS_LABELS, VERIFICATION_COLORS } from '@/lib/utils/formatters';
import type { BookingStatus } from '@/lib/types';

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function VerificationBadge({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', VERIFICATION_COLORS[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

export function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
