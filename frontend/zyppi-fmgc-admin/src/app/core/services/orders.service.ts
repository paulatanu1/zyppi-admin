import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export type OrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  payment_method: string;
  total_paise: number;
  placed_at: string;
  user_id: string;
}

export interface OrderItem {
  id: string;
  product_variant_id: string;
  name: string;
  unit: string;
  quantity: number;
  price_paise: number;
}

export interface OrderAddress {
  label: string;
  line1: string;
  area: string;
  city: string;
  state: string;
  postal_code: string;
  landmark: string | null;
}

export interface OrderPayment {
  method: string;
  amount_paise: number;
  status: string;
  provider_reference: string | null;
}

export interface OrderDetail extends OrderSummary {
  item_total_paise: number;
  delivery_fee_paise: number;
  handling_fee_paise: number;
  tip_paise: number;
  discount_paise: number;
  order_items: OrderItem[];
  addresses: OrderAddress;
  payments: OrderPayment[];
}

export interface OrderFilters {
  status?: OrderStatus;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  constructor(private supabase: SupabaseService) {}

  async list(filters: OrderFilters = {}): Promise<OrderSummary[]> {
    let query = this.supabase.client
      .from('orders')
      .select('id, status, payment_method, total_paise, placed_at, user_id')
      .order('placed_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getById(id: string): Promise<OrderDetail> {
    const { data, error } = await this.supabase.client
      .from('orders')
      .select(
        `id, status, payment_method, total_paise, placed_at, user_id,
         item_total_paise, delivery_fee_paise, handling_fee_paise, tip_paise, discount_paise,
         order_items (id, product_variant_id, name, unit, quantity, price_paise),
         addresses (label, line1, area, city, state, postal_code, landmark),
         payments (method, amount_paise, status, provider_reference)`,
      )
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as OrderDetail;
  }

  async updateStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
    const { error } = await this.supabase.client.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });
    if (error) throw error;
  }
}
