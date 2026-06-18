import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { SettingsShell } from '@/features/settings/SettingsShell';

export default function SettingsPage() {
  return (
    <AdminShell title="Settings" subtitle="Firebase data fetching & billing controls" currentPath="/admin/settings">
      <SettingsShell />
    </AdminShell>
  );
}
