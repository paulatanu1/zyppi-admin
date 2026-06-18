import React from 'react';
import { useAdminSettings, type AdminSettings } from '@/lib/context/AdminSettingsContext';
import { cn } from '@/lib/utils/cn';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none',
        checked ? 'bg-indigo-600' : 'bg-gray-200',
      )}
      role="switch"
      aria-checked={checked}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-6' : 'translate-x-1',
      )} />
    </button>
  );
}

type Impact = 'high' | 'medium' | 'low';

const IMPACT_STYLES: Record<Impact, string> = {
  high: 'bg-red-50 text-red-700 border border-red-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-green-50 text-green-700 border border-green-200',
};

const IMPACT_LABELS: Record<Impact, string> = {
  high: '🔴 High cost',
  medium: '🟡 Medium cost',
  low: '🟢 Low cost',
};

interface SettingRowProps {
  label: string;
  description: string;
  note: string;
  impact: Impact;
  checked: boolean;
  onChange: () => void;
}

function SettingRow({ label, description, note, impact, checked, onChange }: SettingRowProps) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors',
      checked ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50',
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', IMPACT_STYLES[impact])}>
            {IMPACT_LABELS[impact]}
          </span>
          {!checked && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              Paused
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        <p className="mt-1.5 text-[11px] text-gray-400 italic">{note}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

export function SettingsShell() {
  const { settings, update, reset } = useAdminSettings();

  function toggle(key: keyof AdminSettings) {
    update(key, !settings[key] as any);
  }

  return (
    <div className="max-w-2xl space-y-8">

      {/* Billing summary banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">💡 Firebase Billing Guide</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Every Firestore read costs money beyond the free tier (50,000 reads/day).
          <strong> Real-time listeners (onSnapshot)</strong> bill 1 read per document on connect, then 1 read
          per changed document. <strong>One-shot fetches (getDocs)</strong> bill 1 read per document each time
          you load the page. Disable sections you don't check often to reduce reads.
        </p>
      </div>

      {/* ── Real-time listeners ─────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Real-time listeners"
          subtitle="These hold a persistent WebSocket connection to Firestore and charge for every document change."
        />

        <SettingRow
          label="Live Driver Tracking"
          description="Opens a continuous Firestore listener on the vehicles collection. Every time any driver's location, status or booking changes, Firestore bills 1 read."
          note="Tip: if drivers update GPS every 2–3 seconds and you have 10 active drivers, that's ~3,600–18,000 reads/hour from this one listener alone."
          impact="high"
          checked={settings.liveDriverTracking}
          onChange={() => toggle('liveDriverTracking')}
        />
      </div>

      {/* ── One-shot data fetches ───────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Section data fetching"
          subtitle="These fetch once when you open the page. Each document in the collection counts as 1 read."
        />

        <SettingRow
          label="Dashboard Stats"
          description="Reads from users, bookings and vehicles collections to compute KPIs, trend charts and city distribution. Runs every time you open the dashboard."
          note="Reads all documents in 3–4 collections at once. With large data this is the heaviest one-shot operation."
          impact="medium"
          checked={settings.fetchDashboard}
          onChange={() => toggle('fetchDashboard')}
        />

        <SettingRow
          label="Bookings"
          description="Fetches all booking documents from Firestore. Also queries per-user bookings when you open a user detail panel."
          note="Cost scales with total number of bookings. Older, large datasets can generate many reads per visit."
          impact="medium"
          checked={settings.fetchBookings}
          onChange={() => toggle('fetchBookings')}
        />

        <SettingRow
          label="Users"
          description="Fetches all user documents. Opening a user's detail panel also queries their vehicles and bookings (3 separate reads per user opened)."
          note="Low individual cost but multiplies if you open many user detail panels."
          impact="medium"
          checked={settings.fetchUsers}
          onChange={() => toggle('fetchUsers')}
        />

        <SettingRow
          label="Vehicles"
          description="Fetches all vehicle documents. Opening a vehicle detail panel reads documents but stays within the same collection."
          note="Usually a small collection — low read count unless you have hundreds of vehicles."
          impact="low"
          checked={settings.fetchVehicles}
          onChange={() => toggle('fetchVehicles')}
        />

        <SettingRow
          label="Support (Complaints & Feedback)"
          description="Fetches the complaints and feedbacks collections. Two separate getDocs calls each time the Support page loads."
          note="Low cost unless you have thousands of complaints. Safe to leave on."
          impact="low"
          checked={settings.fetchSupport}
          onChange={() => toggle('fetchSupport')}
        />

        <SettingRow
          label="Content (Banners & Offers)"
          description="Fetches banners, promo codes and offer banners from Firestore. Small collections — low read count."
          note="Typically the cheapest section. Can always stay on."
          impact="low"
          checked={settings.fetchContent}
          onChange={() => toggle('fetchContent')}
        />
      </div>

      {/* ── Behaviour ──────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Fetch behaviour"
          subtitle="Controls when React Query automatically re-runs queries."
        />

        <SettingRow
          label="Refetch on Window Focus"
          description="When you switch to another browser tab and come back, React Query re-fetches all active queries. Disable to stop background reads when you alt-tab."
          note="Can cause surprising read spikes if you leave the admin panel open and switch tabs frequently."
          impact="medium"
          checked={settings.refetchOnWindowFocus}
          onChange={() => toggle('refetchOnWindowFocus')}
        />
      </div>

      {/* Reset */}
      <div className="border-t border-gray-100 pt-6">
        <button
          onClick={() => { if (confirm('Reset all settings to defaults?')) reset(); }}
          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Reset all to defaults
        </button>
        <p className="mt-2 text-[11px] text-gray-400">Settings are saved in your browser — each admin user can have their own preferences.</p>
      </div>

    </div>
  );
}
