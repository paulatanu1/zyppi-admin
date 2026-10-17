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
import { DeliverySlot, DeliverySlotsService } from '../../../core/services/delivery-slots.service';

@Component({
  selector: 'app-delivery-slots',
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
  ],
  templateUrl: './delivery-slots.component.html',
})
export class DeliverySlotsComponent implements OnInit {
  readonly slots = signal<DeliverySlot[]>([]);
  readonly loading = signal(true);
  readonly modalVisible = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  editingId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    label: ['', Validators.required],
    eta_minutes: [30, Validators.required],
    is_express: [false],
    is_active: [true],
  });

  constructor(
    private fb: FormBuilder,
    private slotsService: DeliverySlotsService,
  ) {}

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    try {
      this.slots.set(await this.slotsService.list());
    } finally {
      this.loading.set(false);
    }
  }

  openAdd() {
    this.editingId = null;
    this.form.reset({ label: '', eta_minutes: 30, is_express: false, is_active: true });
    this.error.set(null);
    this.modalVisible.set(true);
  }

  openEdit(slot: DeliverySlot) {
    this.editingId = slot.id;
    this.form.reset({
      label: slot.label,
      eta_minutes: slot.eta_minutes,
      is_express: slot.is_express,
      is_active: slot.is_active,
    });
    this.error.set(null);
    this.modalVisible.set(true);
  }

  async save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const value = this.form.getRawValue();
      if (this.editingId) {
        await this.slotsService.update(this.editingId, value);
      } else {
        await this.slotsService.create(value);
      }
      this.modalVisible.set(false);
      await this.refresh();
    } catch (err: any) {
      this.error.set(err.message ?? 'Something went wrong.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(slot: DeliverySlot) {
    if (!confirm(`Delete delivery slot "${slot.label}"?`)) return;
    await this.slotsService.delete(slot.id);
    await this.refresh();
  }
}
