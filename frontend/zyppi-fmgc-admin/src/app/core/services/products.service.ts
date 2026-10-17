import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string;
  price_paise: number;
  mrp_paise: number | null;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  image: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductWithVariants extends Product {
  product_variants: ProductVariant[];
}

export interface ProductListRow extends Product {
  categories: { name: string } | null;
  product_variants: { price_paise: number }[];
}

const PAGE_SIZE = 25;

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(private supabase: SupabaseService) {}

  async list(page = 0): Promise<{ rows: ProductListRow[]; count: number }> {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await this.supabase.client
      .from('products')
      .select('*, categories (name), product_variants (price_paise)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: data as unknown as ProductListRow[], count: count ?? 0 };
  }

  async getById(id: string): Promise<ProductWithVariants> {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*, product_variants (*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as ProductWithVariants;
  }

  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('products')
      .insert(product)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async update(id: string, product: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<void> {
    const { error } = await this.supabase.client.from('products').update(product).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async createVariant(variant: Omit<ProductVariant, 'id'>): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('product_variants')
      .insert(variant)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async updateVariant(id: string, variant: Partial<Omit<ProductVariant, 'id' | 'product_id'>>): Promise<void> {
    const { error } = await this.supabase.client.from('product_variants').update(variant).eq('id', id);
    if (error) throw error;
  }

  async deleteVariant(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('product_variants').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadImage(file: File): Promise<string> {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await this.supabase.client.storage.from('catalog-images').upload(path, file);
    if (error) throw error;
    return path;
  }

  getPublicUrl(path: string | null): string | null {
    if (!path) return null;
    return this.supabase.client.storage.from('catalog-images').getPublicUrl(path).data.publicUrl;
  }
}
