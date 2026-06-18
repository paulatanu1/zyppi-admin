import React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard, Users, CalendarCheck, Car, MapPin,
  Image, HeadphonesIcon, LogOut, Zap, ChevronRight, Settings, Bell,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard',      href: '/admin',               icon: LayoutDashboard },
  { label: 'Users',          href: '/admin/users',          icon: Users },
  { label: 'Bookings',       href: '/admin/bookings',       icon: CalendarCheck },
  { label: 'Vehicles',       href: '/admin/vehicles',       icon: Car },
  { label: 'Live Drivers',   href: '/admin/drivers',        icon: MapPin },
  { label: 'Content',        href: '/admin/content',        icon: Image },
  { label: 'Support',        href: '/admin/support',        icon: HeadphonesIcon },
  { label: 'Notifications',  href: '/admin/notifications',  icon: Bell },
  { label: 'Settings',       href: '/admin/settings',       icon: Settings },
];

interface SidebarProps {
  currentPath: string;
  onSignOut: () => void;
  userName?: string;
}

export function Sidebar({ currentPath, onSignOut, userName }: SidebarProps) {
  const isActive = (href: string) =>
    href === '/admin' ? currentPath === '/admin' : currentPath.startsWith(href);

  return (
    <aside className="flex h-screen w-64 flex-col" style={{ background: 'hsl(243 75% 28%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-wide">ZYPPI</p>
          <p className="text-[11px] text-white/50 uppercase tracking-widest">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <a
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group',
                active
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-white/50 group-hover:text-white')} />
              {label}
              {active && <ChevronRight className="ml-auto h-3 w-3 text-white/50" />}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold">
            {userName?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName ?? 'Admin'}</p>
            <p className="text-[10px] text-white/40">Administrator</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
