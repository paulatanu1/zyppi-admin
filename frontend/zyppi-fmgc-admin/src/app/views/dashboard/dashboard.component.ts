import { Component, OnInit, signal } from '@angular/core';
import { CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, RowComponent, WidgetStatAComponent } from '@coreui/angular';
import { DashboardService, DashboardSummary } from '../../core/services/dashboard.service';

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss'],
  imports: [RowComponent, ColComponent, WidgetStatAComponent, CardComponent, CardHeaderComponent, CardBodyComponent],
})
export class DashboardComponent implements OnInit {
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.summary.set(await this.dashboardService.getSummary());
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  revenueDisplay(): string {
    const summary = this.summary();
    if (!summary) return '—';
    return `₹${(summary.revenueTodayPaise / 100).toFixed(2)}`;
  }

  statusCount(status: string): number {
    return this.summary()?.ordersByStatus[status] ?? 0;
  }
}
