import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_paise: number;
  min_order_paise: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CouponsService {
  constructor(private supabase: SupabaseService) {}

  async list(): Promise<Coupon[]> {
    const { data, error } = await this.supabase.client
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async create(coupon: Omit<Coupon, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.supabase.client
      .from('coupons')
      .insert({ ...coupon, code: coupon.code.toUpperCase() });
    if (error) throw error;
  }

  async update(id: string, coupon: Partial<Omit<Coupon, 'id' | 'created_at'>>): Promise<void> {
    const payload = coupon.code ? { ...coupon, code: coupon.code.toUpperCase() } : coupon;
    const { error } = await this.supabase.client.from('coupons').update(payload).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('coupons').delete().eq('id', id);
    if (error) throw error;
  }
}
