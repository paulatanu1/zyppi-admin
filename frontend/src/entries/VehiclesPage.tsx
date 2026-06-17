import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { VehiclesShell } from '@/features/vehicles/VehiclesShell';

export default function VehiclesPage() {
  return (
    <AdminShell title="Vehicles" subtitle="Vehicle approvals and management" currentPath="/vehicles">
      <VehiclesShell />
    </AdminShell>
  );
}
