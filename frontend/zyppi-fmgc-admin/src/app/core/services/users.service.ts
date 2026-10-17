import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { OrderSummary } from './orders.service';

export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  created_at: string;
}

export interface UserAddress {
  id: string;
  label: string;
  line1: string;
  area: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private supabase: SupabaseService) {}

  async list(): Promise<AdminUser[]> {
    const { data, error } = await this.supabase.client.rpc('admin_list_users');
    if (error) throw error;
    return data;
  }

  async getAddresses(userId: string): Promise<UserAddress[]> {
    const { data, error } = await this.supabase.client
      .from('addresses')
      .select('id, label, line1, area, city, state, postal_code, is_default')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  async getRecentOrders(userId: string, limit = 10): Promise<OrderSummary[]> {
    const { data, error } = await this.supabase.client
      .from('orders')
      .select('id, status, payment_method, total_paise, placed_at, user_id')
      .eq('user_id', userId)
      .order('placed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }
}
