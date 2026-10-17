import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface Category {
  id: string;
  name: string;
  image: string | null;
  color_hex: string;
  border_color_hex: string;
  sort_order: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private supabase: SupabaseService) {}

  async list(): Promise<Category[]> {
    const { data, error } = await this.supabase.client
      .from('categories')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data;
  }

  async create(category: Omit<Category, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.supabase.client.from('categories').insert(category);
    if (error) throw error;
  }

  async update(id: string, category: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await this.supabase.client.from('categories').update(category).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('categories').delete().eq('id', id);
    if (error) throw error;
  }
}
