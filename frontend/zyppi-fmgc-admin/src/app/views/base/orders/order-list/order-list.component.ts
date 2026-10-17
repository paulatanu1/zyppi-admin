import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BadgeComponent,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormSelectDirective,
  RowComponent,
  TableDirective,
} from '@coreui/angular';
import { OrderStatus, OrderSummary, OrdersService } from '../../../../core/services/orders.service';

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'info',
  packed: 'primary',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};

@Component({
  selector: 'app-order-list',
  imports: [
    DatePipe,
    RouterLink,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    TableDirective,
    BadgeComponent,
    FormSelectDirective,
  ],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss',
})
export class OrderListComponent implements OnInit {
  readonly orders = signal<OrderSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<OrderStatus | ''>('');

  readonly statuses: OrderStatus[] = ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];

  constructor(private ordersService: OrdersService) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const filters = this.statusFilter() ? { status: this.statusFilter() as OrderStatus } : {};
      this.orders.set(await this.ordersService.list(filters));
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load orders.');
    } finally {
      this.loading.set(false);
    }
  }

  onStatusFilterChange(event: Event) {
    this.statusFilter.set((event.target as HTMLSelectElement).value as OrderStatus | '');
    this.load();
  }

  statusColor(status: OrderStatus): string {
    return STATUS_COLORS[status];
  }
}
