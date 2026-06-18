import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { DriversMapShell } from '@/features/drivers/DriversMapShell';

export default function DriversPage() {
  return (
    <AdminShell title="Live Drivers" subtitle="Real-time driver locations" currentPath="/admin/drivers">
      <DriversMapShell />
    </AdminShell>
  );
}
