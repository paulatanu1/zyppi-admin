import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { UsersShell } from '@/features/users/UsersShell';

export default function UsersPage() {
  return (
    <AdminShell title="Users" subtitle="Manage riders and drivers" currentPath="/users">
      <UsersShell />
    </AdminShell>
  );
}
