import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertComponent,
  BadgeComponent,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormSelectDirective,
  RowComponent,
  TableDirective,
} from '@coreui/angular';
import { OrderDetail, OrderStatus, OrdersService } from '../../../../core/services/orders.service';

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

@Component({
  selector: 'app-order-detail',
  imports: [
    DatePipe,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    TableDirective,
    ButtonDirective,
    BadgeComponent,
    FormSelectDirective,
    AlertComponent,
  ],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent implements OnInit {
  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(false);
  readonly updating = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedStatus = signal<OrderStatus | ''>('');

  constructor(
    private route: ActivatedRoute,
    private ordersService: OrdersService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  async load(id: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.order.set(await this.ordersService.getById(id));
      this.selectedStatus.set('');
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load order.');
    } finally {
      this.loading.set(false);
    }
  }

  nextStatuses(): OrderStatus[] {
    const order = this.order();
    return order ? NEXT_STATUS[order.status] : [];
  }

  onStatusChange(event: Event) {
    this.selectedStatus.set((event.target as HTMLSelectElement).value as OrderStatus | '');
  }

  async updateStatus() {
    const order = this.order();
    const newStatus = this.selectedStatus();
    if (!order || !newStatus) return;

    this.updating.set(true);
    this.error.set(null);
    try {
      await this.ordersService.updateStatus(order.id, newStatus);
      await this.load(order.id);
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to update status.');
    } finally {
      this.updating.set(false);
    }
  }
}
