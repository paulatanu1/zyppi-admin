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

type Impact = 'high' | 'medium' | 'low' | 'always';

const IMPACT_STYLES: Record<Impact, string> = {
  high:   'bg-red-50 text-red-700 border border-red-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  low:    'bg-green-50 text-green-700 border border-green-200',
  always: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const IMPACT_LABELS: Record<Impact, string> = {
  high:   '🔴 High cost',
  medium: '🟡 Medium cost',
  low:    '🟢 Low cost',
  always: '🔒 Always on',
};

interface SettingRowProps {
  label: string;
  description: string;
  note: string;
  impact: Impact;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function SettingRow({ label, description, note, impact, checked, onChange, disabled }: SettingRowProps) {
  return (
    <div className={cn(
      'flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors',
      disabled ? 'border-gray-100 bg-gray-50 opacity-70' :
      checked   ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50',
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', IMPACT_STYLES[impact])}>
            {IMPACT_LABELS[impact]}
          </span>
          {!disabled && !checked && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Paused</span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        <p className="mt-1.5 text-[11px] text-gray-400 italic">{note}</p>
      </div>
      <Toggle checked={disabled ? true : checked} onChange={disabled ? () => {} : onChange} />
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pt-2 pb-1">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

function AlwaysOnRow({ label, description, note, impact }: { label: string; description: string; note: string; impact: Impact }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-70">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', IMPACT_STYLES[impact])}>
            {IMPACT_LABELS[impact]}
          </span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        <p className="mt-1.5 text-[11px] text-gray-400 italic">{note}</p>
      </div>
      <div className="shrink-0 rounded-full bg-gray-200 px-2.5 py-1 text-[10px] text-gray-500 font-medium">Cannot disable</div>
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

      {/* Billing summary */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">💡 Firebase Billing — How reads are charged</p>
        <ul className="text-xs text-amber-700 leading-relaxed space-y-1 mt-2">
          <li>• <strong>Free tier:</strong> 50,000 reads/day · 20,000 writes/day · 1 GB storage — free forever</li>
          <li>• <strong>onSnapshot (real-time):</strong> 1 read per document on connect, then 1 read per changed document</li>
          <li>• <strong>getDocs (one-shot):</strong> 1 read per document, charged each time the query runs</li>
          <li>• <strong>getDoc (single doc):</strong> 1 read per call — login does this every page load</li>
          <li>• <strong>Writes:</strong> approve/reject/edit actions each cost 1 write — usually negligible</li>
          <li>• <strong>Storage downloads:</strong> document images loaded in the browser cost Firebase Storage bandwidth (₹0.12/GB)</li>
          <li>• <strong>Google Maps API:</strong> separate billing — free up to 28,000 map loads/month</li>
        </ul>
      </div>

      {/* ── Real-time listeners ─────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Real-time listeners (onSnapshot)"
          subtitle="Hold a persistent WebSocket to Firestore. Billed on connect + every document change."
        />

        <SettingRow
          label="Live Driver Tracking"
          description="onSnapshot on the entire vehicles collection. Every location update, status change or booking assignment on any vehicle triggers a Firestore read."
          note="Most expensive item. 10 drivers updating GPS every 3s = ~12,000 reads/hour. Disable when you're not actively watching the map."
          impact="high"
          checked={settings.liveDriverTracking}
          onChange={() => toggle('liveDriverTracking')}
        />
      </div>

      {/* ── One-shot section fetches ────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Section data fetching (getDocs)"
          subtitle="Reads all documents in that collection when you open the page. 1 read per document."
        />

        <SettingRow
          label="Dashboard Stats"
          description="Reads users + bookings + vehicles (×2) — 4 parallel getDocs — every time you open the dashboard. Computes KPIs, trend charts and city distribution."
          note="Cost = total users + total bookings + (total vehicles × 2). Grows with your data. Heaviest one-shot load."
          impact="medium"
          checked={settings.fetchDashboard}
          onChange={() => toggle('fetchDashboard')}
        />

        <SettingRow
          label="Bookings List"
          description="getDocs on the bookings collection. Every booking document is one read. Used for the bookings table and status filters."
          note="Grows with your booking volume. 1,000 bookings = 1,000 reads per visit to the Bookings page."
          impact="medium"
          checked={settings.fetchBookings}
          onChange={() => toggle('fetchBookings')}
        />

        <SettingRow
          label="Users List"
          description="getDocs on the users collection. Every user document is one read."
          note="1,000 users = 1,000 reads per visit. Also controls the mobile-uniqueness check when editing a user's phone number (extra getDocs on save)."
          impact="medium"
          checked={settings.fetchUsers}
          onChange={() => toggle('fetchUsers')}
        />

        <SettingRow
          label="User Detail Panel (vehicles + bookings)"
          description="When you click on a user, two extra getDocs fire: one for their vehicles (filtered by userId) and one for their last 10 bookings (filtered by userId). This is separate from the user list fetch above."
          note="Each panel open = 2 extra queries. Open 20 users = 40 extra reads. Disable if you only need the user list without drilling into individual profiles."
          impact="medium"
          checked={settings.fetchUserDetails}
          onChange={() => toggle('fetchUserDetails')}
        />

        <SettingRow
          label="Vehicles List"
          description="getDocs on the vehicles collection. Each vehicle document is one read."
          note="Usually small collection. Low read count unless you have hundreds of vehicles."
          impact="low"
          checked={settings.fetchVehicles}
          onChange={() => toggle('fetchVehicles')}
        />

        <SettingRow
          label="Support (Complaints & Feedback)"
          description="Two getDocs calls each time the Support page loads — one for complaints, one for feedbacks."
          note="Low cost unless you accumulate thousands of support tickets."
          impact="low"
          checked={settings.fetchSupport}
          onChange={() => toggle('fetchSupport')}
        />

        <SettingRow
          label="Content (Banners & Offers)"
          description="getDocs on banners and offers collections when the Content page loads."
          note="Typically tiny collections. Cheapest section — safe to leave on always."
          impact="low"
          checked={settings.fetchContent}
          onChange={() => toggle('fetchContent')}
        />
      </div>

      {/* ── Behaviour ──────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Fetch behaviour"
          subtitle="Controls when React Query automatically re-runs queries in the background."
        />

        <SettingRow
          label="Refetch on Window Focus"
          description="When you switch to another browser tab and come back, React Query silently re-fetches every active query. This can fire all the getDocs above at once without you clicking anything."
          note="Disable this if you leave the admin tab open while doing other work. Saves a full set of reads every time you alt-tab back."
          impact="medium"
          checked={settings.refetchOnWindowFocus}
          onChange={() => toggle('refetchOnWindowFocus')}
        />
      </div>

      {/* ── Always-on (cannot disable) ──────────────────────── */}
      <div className="space-y-3">
        <SectionHeader
          title="Always active — cannot be disabled"
          subtitle="These are required for the admin panel to function. They run on every page load."
        />

        <AlwaysOnRow
          label="Firebase Auth — onAuthStateChanged"
          description="A persistent listener that fires every time your login session changes. On each fire, it also runs getDoc on users/{uid} to verify your isAdmin flag. This is 1 Firestore read per page load."
          note="~30 reads/day if you navigate between pages frequently. Cannot be disabled — it's the login guard."
          impact="always"
        />

        <AlwaysOnRow
          label="Firebase Auth — Login getDoc"
          description="On the login page, after you sign in, the app reads your user document once to confirm isAdmin: true. This is 1 Firestore read per login."
          note="Only fires on sign-in. Negligible cost."
          impact="always"
        />

        <AlwaysOnRow
          label="Firebase Storage — Document image downloads"
          description="When you open a vehicle or user detail panel, uploaded documents (RC, licence, insurance, PUC) are loaded as images from Firebase Storage. The Firebase Storage SDK is not called directly — images are fetched as plain HTTP requests from the Storage URL."
          note="Billed as Firebase Storage bandwidth: ~₹0.12/GB. Typically very low unless you view many high-resolution documents."
          impact="always"
        />

        <AlwaysOnRow
          label="Google Maps JavaScript API"
          description="The Live Drivers map loads the Google Maps JS library when you enable Live Driver Tracking. This is separate from Firebase — it's a Google Cloud API with its own billing."
          note="Free up to 28,000 map loads/month. Beyond that: ~$7/1,000 loads. For an admin panel this limit is unlikely to be hit."
          impact="always"
        />
      </div>

      {/* Reset */}
      <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => { if (confirm('Reset all settings to defaults?')) reset(); }}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Reset all to defaults
          </button>
          <p className="mt-1.5 text-[11px] text-gray-400">Settings are saved in your browser — each admin user can have their own preferences.</p>
        </div>
        <div className="text-right text-[11px] text-gray-400 space-y-0.5">
          <p>Controllable toggles: <strong className="text-gray-600">8</strong></p>
          <p>Always-on items: <strong className="text-gray-600">4</strong></p>
          <p>Firebase services used: <strong className="text-gray-600">Auth · Firestore · Storage</strong></p>
        </div>
      </div>

    </div>
  );
}
