import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { ContentShell } from '@/features/content/ContentShell';

export default function ContentPage() {
  return (
    <AdminShell title="Content" subtitle="Banners, promo codes and offers" currentPath="/admin/content">
      <ContentShell />
    </AdminShell>
  );
}
