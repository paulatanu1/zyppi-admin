import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface DashboardSummary {
  ordersToday: number;
  ordersByStatus: Record<string, number>;
  lowStockCount: number;
  revenueTodayPaise: number;
}

const LOW_STOCK_THRESHOLD = 5;

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private supabase: SupabaseService) {}

  async getSummary(): Promise<DashboardSummary> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const since = startOfToday.toISOString();

    const [ordersTodayResult, revenueResult, lowStockResult] = await Promise.all([
      this.supabase.client
        .from('orders')
        .select('status', { count: 'exact' })
        .gte('placed_at', since),
      this.supabase.client
        .from('orders')
        .select('total_paise')
        .gte('placed_at', since)
        .neq('status', 'cancelled'),
      this.supabase.client
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .lt('quantity', LOW_STOCK_THRESHOLD),
    ]);

    if (ordersTodayResult.error) throw ordersTodayResult.error;
    if (revenueResult.error) throw revenueResult.error;
    if (lowStockResult.error) throw lowStockResult.error;

    const ordersByStatus: Record<string, number> = {};
    for (const row of ordersTodayResult.data ?? []) {
      ordersByStatus[row.status] = (ordersByStatus[row.status] ?? 0) + 1;
    }

    const revenueTodayPaise = (revenueResult.data ?? []).reduce(
      (sum, row) => sum + row.total_paise,
      0,
    );

    return {
      ordersToday: ordersTodayResult.count ?? 0,
      ordersByStatus,
      lowStockCount: lowStockResult.count ?? 0,
      revenueTodayPaise,
    };
  }
}
