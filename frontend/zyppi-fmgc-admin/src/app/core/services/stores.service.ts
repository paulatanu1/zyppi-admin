import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface ServiceArea {
  id: string;
  name: string;
  is_active: boolean;
  center_lat: number | null;
  center_lng: number | null;
  radius_meters: number | null;
  created_at: string;
}

export interface Store {
  id: string;
  service_area_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class StoresService {
  constructor(private supabase: SupabaseService) {}

  async listServiceAreas(): Promise<ServiceArea[]> {
    const { data, error } = await this.supabase.client
      .from('service_areas')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  }

  async createServiceArea(area: Omit<ServiceArea, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.supabase.client.from('service_areas').insert(area);
    if (error) throw error;
  }

  async updateServiceArea(id: string, area: Partial<Omit<ServiceArea, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await this.supabase.client.from('service_areas').update(area).eq('id', id);
    if (error) throw error;
  }

  async deleteServiceArea(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('service_areas').delete().eq('id', id);
    if (error) throw error;
  }

  async listStores(): Promise<Store[]> {
    const { data, error } = await this.supabase.client.from('stores').select('*').order('name');
    if (error) throw error;
    return data;
  }

  async createStore(store: Omit<Store, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.supabase.client.from('stores').insert(store);
    if (error) throw error;
  }

  async updateStore(id: string, store: Partial<Omit<Store, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await this.supabase.client.from('stores').update(store).eq('id', id);
    if (error) throw error;
  }

  async deleteStore(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('stores').delete().eq('id', id);
    if (error) throw error;
  }
}
