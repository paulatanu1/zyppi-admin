import { SlicePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckInputDirective,
  FormCheckLabelDirective,
  FormControlDirective,
  FormLabelDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective,
  RowComponent,
  TableDirective,
} from '@coreui/angular';
import { Coupon, CouponsService } from '../../../core/services/coupons.service';

@Component({
  selector: 'app-coupons',
  imports: [
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    TableDirective,
    ButtonDirective,
    ButtonCloseDirective,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective,
    FormControlDirective,
    FormLabelDirective,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    SlicePipe,
  ],
  templateUrl: './coupons.component.html',
})
export class CouponsComponent implements OnInit {
  readonly coupons = signal<Coupon[]>([]);
  readonly loading = signal(true);
  readonly modalVisible = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  editingId: string | null = null;

  // Form fields hold rupees (what an admin naturally types); converted
  // to/from paise at the service boundary, same as everywhere else money
  // is stored in this schema.
  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    description: [''],
    discount_rupees: [0, Validators.required],
    min_order_rupees: [0, Validators.required],
    is_active: [true],
    expires_at: [''],
  });

  constructor(
    private fb: FormBuilder,
    private couponsService: CouponsService,
  ) {}

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    try {
      this.coupons.set(await this.couponsService.list());
    } finally {
      this.loading.set(false);
    }
  }

  openAdd() {
    this.editingId = null;
    this.form.reset({ code: '', description: '', discount_rupees: 0, min_order_rupees: 0, is_active: true, expires_at: '' });
    this.error.set(null);
    this.modalVisible.set(true);
  }

  openEdit(coupon: Coupon) {
    this.editingId = coupon.id;
    this.form.reset({
      code: coupon.code,
      description: coupon.description ?? '',
      discount_rupees: coupon.discount_paise / 100,
      min_order_rupees: coupon.min_order_paise / 100,
      is_active: coupon.is_active,
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
    });
    this.error.set(null);
    this.modalVisible.set(true);
  }

  async save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const raw = this.form.getRawValue();
      const value = {
        code: raw.code,
        description: raw.description || null,
        discount_paise: Math.round(raw.discount_rupees * 100),
        min_order_paise: Math.round(raw.min_order_rupees * 100),
        is_active: raw.is_active,
        expires_at: raw.expires_at ? new Date(raw.expires_at).toISOString() : null,
      };
      if (this.editingId) {
        await this.couponsService.update(this.editingId, value);
      } else {
        await this.couponsService.create(value);
      }
      this.modalVisible.set(false);
      await this.refresh();
    } catch (err: any) {
      this.error.set(err.message ?? 'Something went wrong.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(coupon: Coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
    await this.couponsService.delete(coupon.id);
    await this.refresh();
  }
}
