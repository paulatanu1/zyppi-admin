import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { DashboardShell } from '@/features/dashboard/DashboardShell';

export default function DashboardPage() {
  return (
    <AdminShell title="Dashboard" subtitle="Overview of Zyppi Ride operations" currentPath="/">
      <DashboardShell />
    </AdminShell>
  );
}
