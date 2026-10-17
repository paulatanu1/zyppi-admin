import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  BadgeComponent,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  RowComponent,
  TableDirective,
} from '@coreui/angular';
import { ProductListRow, ProductsService } from '../../../core/services/products.service';

@Component({
  selector: 'app-view-product',
  imports: [
    RouterLink,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    TableDirective,
    ButtonDirective,
    BadgeComponent,
  ],
  templateUrl: './view-product.component.html',
  styleUrl: './view-product.component.scss',
})
export class ViewProductComponent implements OnInit {
  readonly rows = signal<ProductListRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(0);
  readonly count = signal(0);

  constructor(
    private productsService: ProductsService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { rows, count } = await this.productsService.list(this.page());
      this.rows.set(rows);
      this.count.set(count);
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load products.');
    } finally {
      this.loading.set(false);
    }
  }

  priceRange(row: ProductListRow): string {
    const prices = row.product_variants.map((v) => v.price_paise);
    if (!prices.length) return '—';
    const min = Math.min(...prices) / 100;
    const max = Math.max(...prices) / 100;
    return min === max ? `₹${min.toFixed(2)}` : `₹${min.toFixed(2)} – ₹${max.toFixed(2)}`;
  }

  imageUrl(row: ProductListRow): string | null {
    return this.productsService.getPublicUrl(row.image);
  }

  edit(row: ProductListRow) {
    this.router.navigateByUrl(`/base/products/${row.id}/edit`);
  }

  async remove(row: ProductListRow) {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await this.productsService.delete(row.id);
      await this.load();
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to delete product.');
    }
  }

  nextPage() {
    if ((this.page() + 1) * 25 >= this.count()) return;
    this.page.set(this.page() + 1);
    this.load();
  }

  prevPage() {
    if (this.page() === 0) return;
    this.page.set(this.page() - 1);
    this.load();
  }
}
