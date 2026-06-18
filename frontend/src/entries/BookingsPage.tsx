import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { BookingsShell } from '@/features/bookings/BookingsShell';

export default function BookingsPage() {
  return (
    <AdminShell title="Bookings" subtitle="All ride bookings and history" currentPath="/admin/bookings">
      <BookingsShell />
    </AdminShell>
  );
}
