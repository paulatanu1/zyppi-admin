import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BadgeComponent, CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, RowComponent, TableDirective } from '@coreui/angular';
import { OrderStatus, OrderSummary } from '../../../../core/services/orders.service';
import { UserAddress, UsersService } from '../../../../core/services/users.service';

const STATUS_COLORS: Record<OrderStatus, string> = {
  placed: 'info',
  packed: 'primary',
  out_for_delivery: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};

@Component({
  selector: 'app-user-detail',
  imports: [DatePipe, RouterLink, RowComponent, ColComponent, CardComponent, CardHeaderComponent, CardBodyComponent, TableDirective, BadgeComponent],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements OnInit {
  readonly addresses = signal<UserAddress[]>([]);
  readonly orders = signal<OrderSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private usersService: UsersService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  async load(userId: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [addresses, orders] = await Promise.all([
        this.usersService.getAddresses(userId),
        this.usersService.getRecentOrders(userId),
      ]);
      this.addresses.set(addresses);
      this.orders.set(orders);
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load user.');
    } finally {
      this.loading.set(false);
    }
  }

  statusColor(status: OrderStatus): string {
    return STATUS_COLORS[status];
  }
}
