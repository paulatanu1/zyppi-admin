import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/lib/hooks/useAuth';
import { AdminSettingsProvider, useAdminSettings } from '@/lib/context/AdminSettingsContext';

function makeQueryClient(refetchOnWindowFocus: boolean) {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus } },
  });
}

// Single instance per page — recreated only when refetchOnWindowFocus changes
let queryClient = makeQueryClient(false);

interface AdminShellProps {
  title: string;
  subtitle?: string;
  currentPath: string;
  children: React.ReactNode;
}

function ShellInner({ title, subtitle, currentPath, children }: AdminShellProps) {
  const { user, loading, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      window.location.href = '/admin/login';
    }
  }, [user, loading, isAdmin]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath={currentPath} onSignOut={signOut} userName={user.displayName ?? user.email ?? 'Admin'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function ShellWithSettings(props: AdminShellProps) {
  const { settings } = useAdminSettings();
  // Recreate QueryClient if window-focus refetch setting changes
  React.useEffect(() => {
    queryClient = makeQueryClient(settings.refetchOnWindowFocus);
  }, [settings.refetchOnWindowFocus]);

  return (
    <QueryClientProvider client={queryClient}>
      <ShellInner {...props} />
    </QueryClientProvider>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <AdminSettingsProvider>
      <ShellWithSettings {...props} />
    </AdminSettingsProvider>
  );
}
