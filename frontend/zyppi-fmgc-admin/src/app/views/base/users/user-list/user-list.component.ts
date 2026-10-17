import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardBodyComponent, CardComponent, CardHeaderComponent, ColComponent, RowComponent, TableDirective } from '@coreui/angular';
import { AdminUser, UsersService } from '../../../../core/services/users.service';

@Component({
  selector: 'app-user-list',
  imports: [DatePipe, RouterLink, RowComponent, ColComponent, CardComponent, CardHeaderComponent, CardBodyComponent, TableDirective],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private usersService: UsersService) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.users.set(await this.usersService.list());
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load users.');
    } finally {
      this.loading.set(false);
    }
  }
}
