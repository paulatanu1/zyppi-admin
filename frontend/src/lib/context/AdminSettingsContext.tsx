import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AdminSettings {
  liveDriverTracking: boolean;   // onSnapshot listener on vehicles
  fetchDashboard: boolean;
  fetchUsers: boolean;
  fetchUserDetails: boolean;     // sub-queries when opening a user panel
  fetchBookings: boolean;
  fetchVehicles: boolean;
  fetchSupport: boolean;
  fetchContent: boolean;
  refetchOnWindowFocus: boolean; // React Query window-focus refetch
}

const STORAGE_KEY = 'zyppi_admin_settings';

const DEFAULTS: AdminSettings = {
  liveDriverTracking: true,
  fetchDashboard: true,
  fetchUsers: true,
  fetchUserDetails: true,
  fetchBookings: true,
  fetchVehicles: true,
  fetchSupport: true,
  fetchContent: true,
  refetchOnWindowFocus: false,
};

function load(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

interface Ctx {
  settings: AdminSettings;
  update: <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => void;
  reset: () => void;
}

const AdminSettingsContext = createContext<Ctx>({
  settings: DEFAULTS,
  update: () => {},
  reset: () => {},
});

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(load);

  const update = useCallback(<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULTS);
  }, []);

  return (
    <AdminSettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings() {
  return useContext(AdminSettingsContext);
}
