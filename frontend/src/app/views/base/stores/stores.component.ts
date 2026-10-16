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
  FormSelectDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective,
  RowComponent,
  TableDirective,
} from '@coreui/angular';
import { ServiceArea, Store, StoresService } from '../../../core/services/stores.service';

@Component({
  selector: 'app-stores',
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
    FormSelectDirective,
    FormCheckInputDirective,
    FormCheckLabelDirective,
  ],
  templateUrl: './stores.component.html',
})
export class StoresComponent implements OnInit {
  readonly serviceAreas = signal<ServiceArea[]>([]);
  readonly stores = signal<Store[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly areaModalVisible = signal(false);
  editingAreaId: string | null = null;
  readonly areaForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    is_active: [true],
    center_lat: [0, Validators.required],
    center_lng: [0, Validators.required],
    radius_meters: [5000, Validators.required],
  });

  readonly storeModalVisible = signal(false);
  editingStoreId: string | null = null;
  readonly storeForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    service_area_id: ['', Validators.required],
    is_active: [true],
  });

  constructor(
    private fb: FormBuilder,
    private storesService: StoresService,
  ) {}

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    try {
      const [areas, stores] = await Promise.all([
        this.storesService.listServiceAreas(),
        this.storesService.listStores(),
      ]);
      this.serviceAreas.set(areas);
      this.stores.set(stores);
    } finally {
      this.loading.set(false);
    }
  }

  areaName(serviceAreaId: string): string {
    return this.serviceAreas().find((a) => a.id === serviceAreaId)?.name ?? '—';
  }

  openAddArea() {
    this.editingAreaId = null;
    this.areaForm.reset({ name: '', is_active: true, center_lat: 0, center_lng: 0, radius_meters: 5000 });
    this.error.set(null);
    this.areaModalVisible.set(true);
  }

  openEditArea(area: ServiceArea) {
    this.editingAreaId = area.id;
    this.areaForm.reset({
      name: area.name,
      is_active: area.is_active,
      center_lat: area.center_lat ?? 0,
      center_lng: area.center_lng ?? 0,
      radius_meters: area.radius_meters ?? 5000,
    });
    this.error.set(null);
    this.areaModalVisible.set(true);
  }

  async saveArea() {
    if (this.areaForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const value = this.areaForm.getRawValue();
      if (this.editingAreaId) {
        await this.storesService.updateServiceArea(this.editingAreaId, value);
      } else {
        await this.storesService.createServiceArea(value);
      }
      this.areaModalVisible.set(false);
      await this.refresh();
    } catch (err: any) {
      this.error.set(err.message ?? 'Something went wrong.');
    } finally {
      this.saving.set(false);
    }
  }

  async removeArea(area: ServiceArea) {
    if (!confirm(`Delete service area "${area.name}"? This also removes its stores.`)) return;
    await this.storesService.deleteServiceArea(area.id);
    await this.refresh();
  }

  openAddStore() {
    this.editingStoreId = null;
    this.storeForm.reset({ name: '', service_area_id: this.serviceAreas()[0]?.id ?? '', is_active: true });
    this.error.set(null);
    this.storeModalVisible.set(true);
  }

  openEditStore(store: Store) {
    this.editingStoreId = store.id;
    this.storeForm.reset({
      name: store.name,
      service_area_id: store.service_area_id,
      is_active: store.is_active,
    });
    this.error.set(null);
    this.storeModalVisible.set(true);
  }

  async saveStore() {
    if (this.storeForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const value = this.storeForm.getRawValue();
      if (this.editingStoreId) {
        await this.storesService.updateStore(this.editingStoreId, value);
      } else {
        await this.storesService.createStore(value);
      }
      this.storeModalVisible.set(false);
      await this.refresh();
    } catch (err: any) {
      this.error.set(err.message ?? 'Something went wrong.');
    } finally {
      this.saving.set(false);
    }
  }

  async removeStore(store: Store) {
    if (!confirm(`Delete store "${store.name}"?`)) return;
    await this.storesService.deleteStore(store.id);
    await this.refresh();
  }
}
