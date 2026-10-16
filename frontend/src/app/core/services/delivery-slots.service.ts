import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface DeliverySlot {
  id: string;
  label: string;
  eta_minutes: number;
  is_express: boolean;
  is_active: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class DeliverySlotsService {
  constructor(private supabase: SupabaseService) {}

  async list(): Promise<DeliverySlot[]> {
    const { data, error } = await this.supabase.client
      .from('delivery_slots')
      .select('*')
      .order('eta_minutes');
    if (error) throw error;
    return data;
  }

  async create(slot: Omit<DeliverySlot, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.supabase.client.from('delivery_slots').insert(slot);
    if (error) throw error;
  }

  async update(id: string, slot: Partial<Omit<DeliverySlot, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await this.supabase.client.from('delivery_slots').update(slot).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('delivery_slots').delete().eq('id', id);
    if (error) throw error;
  }
}
