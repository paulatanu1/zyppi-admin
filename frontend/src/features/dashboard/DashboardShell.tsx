import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminSettings } from '@/lib/context/AdminSettingsContext';
import { FetchPaused } from '@/components/shared/FetchPaused';
import {
  collection, getDocs, query, where, orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { StatCard } from '@/components/shared/StatCard';
import { BookingsTrendChart } from '@/components/charts/BookingsTrend';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { StatusDonut } from '@/components/charts/StatusDonut';
import { CityBarChart } from '@/components/charts/CityBar';
import { Users, CalendarCheck, Car, IndianRupee } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

async function fetchDashboardStats() {
  const [usersSnap, bookingsSnap, vehiclesSnap, driversSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.users)),
    getDocs(collection(db, COLLECTIONS.bookings)),
    getDocs(collection(db, COLLECTIONS.vehicles)),
    getDocs(query(collection(db, COLLECTIONS.vehicles), where('isOnline', '==', true))),
  ]);

  const bookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const completed = bookings.filter((b: any) => b.status === 'completed');
  const revenue = completed.reduce((sum: number, b: any) => sum + (b.fareDetails?.totalFare ?? 0), 0);

  // Group bookings by day (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyMap: Record<string, { date: string; bookings: number; revenue: number }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { date: key.slice(5), bookings: 0, revenue: 0 };
  }

  bookings.forEach((b: any) => {
    const ts: Timestamp | undefined = b.createdAt;
    if (!ts) return;
    const d = ts.toDate();
    if (d < thirtyDaysAgo) return;
    const key = d.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].bookings++;
      if (b.status === 'completed') dailyMap[key].revenue += b.fareDetails?.totalFare ?? 0;
    }
  });

  // Status distribution
  const statusCounts: Record<string, number> = {};
  bookings.forEach((b: any) => {
    statusCounts[b.status ?? 'unknown'] = (statusCounts[b.status ?? 'unknown'] ?? 0) + 1;
  });

  // City distribution
  const cityCounts: Record<string, number> = {};
  bookings.forEach((b: any) => {
    const city = b.pickupLocation?.city ?? b.vehicle?.city ?? 'Unknown';
    cityCounts[city] = (cityCounts[city] ?? 0) + 1;
  });
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([city, count]) => ({ city, count }));

  return {
    totalUsers: usersSnap.size,
    totalBookings: bookings.length,
    totalVehicles: vehiclesSnap.size,
    activeDrivers: driversSnap.size,
    totalRevenue: revenue,
    trend: Object.values(dailyMap),
    statusDistribution: Object.entries(statusCounts).map(([status, value]) => ({ status, value })),
    topCities,
  };
}

export function DashboardShell() {
  const { settings, update } = useAdminSettings();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    enabled: settings.fetchDashboard,
  });

  if (!settings.fetchDashboard) {
    return <FetchPaused onEnable={() => update('fetchDashboard', true)} />;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Users" value={data?.totalUsers ?? 0} icon={Users} color="indigo" trend={12} loading={isLoading} />
        <StatCard title="Total Bookings" value={data?.totalBookings ?? 0} icon={CalendarCheck} color="green" trend={8} loading={isLoading} />
        <StatCard title="Active Drivers" value={data?.activeDrivers ?? 0} icon={Car} color="amber" loading={isLoading} />
        <StatCard title="Total Revenue" value={formatCurrency(data?.totalRevenue)} icon={IndianRupee} color="rose" trend={15} loading={isLoading} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Bookings — Last 30 Days</h3>
          <BookingsTrendChart data={data?.trend ?? []} loading={isLoading} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Booking Status</h3>
          <StatusDonut data={data?.statusDistribution ?? []} loading={isLoading} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue — Last 30 Days</h3>
          <RevenueChart data={data?.trend ?? []} loading={isLoading} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Cities by Bookings</h3>
          <CityBarChart data={data?.topCities ?? []} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
