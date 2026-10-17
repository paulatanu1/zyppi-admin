import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface InventoryRow {
  store_id: string;
  product_variant_id: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private supabase: SupabaseService) {}

  async getForVariant(productVariantId: string): Promise<InventoryRow[]> {
    const { data, error } = await this.supabase.client
      .from('inventory')
      .select('store_id, product_variant_id, quantity')
      .eq('product_variant_id', productVariantId);
    if (error) throw error;
    return data;
  }

  /// Upserts on (store_id, product_variant_id) - that's the table's
  /// unique constraint, so this both creates new rows and updates
  /// existing ones in a single call.
  async upsertMany(rows: InventoryRow[]): Promise<void> {
    if (!rows.length) return;
    const { error } = await this.supabase.client
      .from('inventory')
      .upsert(rows, { onConflict: 'store_id,product_variant_id' });
    if (error) throw error;
  }
}
