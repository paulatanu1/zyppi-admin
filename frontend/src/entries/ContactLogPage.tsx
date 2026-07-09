import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { ContactLogShell } from '@/features/contact/ContactLogShell';

export default function ContactLogPage() {
  return (
    <AdminShell title="Contact Email Log" subtitle="Website contact form submissions" currentPath="/admin/contact-email-log">
      <ContactLogShell />
    </AdminShell>
  );
}
