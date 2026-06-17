import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { SupportShell } from '@/features/support/SupportShell';

export default function SupportPage() {
  return (
    <AdminShell title="Support Center" subtitle="Complaints and user feedback" currentPath="/support">
      <SupportShell />
    </AdminShell>
  );
}
