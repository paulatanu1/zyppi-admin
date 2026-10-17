import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
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
import { CategoriesService, Category } from '../../../core/services/categories.service';

@Component({
  selector: 'app-categories',
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
  ],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly modalVisible = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  editingId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    color_hex: ['#E6F3E4', Validators.required],
    border_color_hex: ['#2F7D32', Validators.required],
    sort_order: [0, Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    private categoriesService: CategoriesService,
  ) {}

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    try {
      this.categories.set(await this.categoriesService.list());
    } finally {
      this.loading.set(false);
    }
  }

  openAdd() {
    this.editingId = null;
    this.form.reset({ name: '', color_hex: '#E6F3E4', border_color_hex: '#2F7D32', sort_order: 0 });
    this.error.set(null);
    this.modalVisible.set(true);
  }

  openEdit(category: Category) {
    this.editingId = category.id;
    this.form.reset({
      name: category.name,
      color_hex: category.color_hex,
      border_color_hex: category.border_color_hex,
      sort_order: category.sort_order,
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
        await this.categoriesService.update(this.editingId, value);
      } else {
        await this.categoriesService.create({ ...value, image: null });
      }
      this.modalVisible.set(false);
      await this.refresh();
    } catch (err: any) {
      this.error.set(err.message ?? 'Something went wrong.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(category: Category) {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    await this.categoriesService.delete(category.id);
    await this.refresh();
  }
}
