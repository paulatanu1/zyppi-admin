import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { NotificationsShell } from '@/features/notifications/NotificationsShell';

export default function NotificationsPage() {
  return (
    <AdminShell title="Push Notifications" subtitle="Send FCM messages to users with templates" currentPath="/admin/notifications">
      <NotificationsShell />
    </AdminShell>
  );
}
