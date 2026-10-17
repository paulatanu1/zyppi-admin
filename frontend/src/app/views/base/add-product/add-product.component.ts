import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertComponent,
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
  RowComponent,
  TableDirective,
} from '@coreui/angular';
import { CategoriesService, Category } from '../../../core/services/categories.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProductsService } from '../../../core/services/products.service';
import { Store, StoresService } from '../../../core/services/stores.service';

@Component({
  selector: 'app-add-product',
  imports: [
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    TableDirective,
    ButtonDirective,
    FormControlDirective,
    FormLabelDirective,
    FormSelectDirective,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    AlertComponent,
  ],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.scss',
})
export class AddProductComponent implements OnInit {
  readonly categories = signal<Category[]>([]);
  readonly stores = signal<Store[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly imagePreview = signal<string | null>(null);

  productId: string | null = null;
  private imageFile: File | null = null;
  private existingVariantIds = new Set<string>();

  readonly form = this.fb.nonNullable.group({
    category_id: ['', Validators.required],
    name: ['', Validators.required],
    is_active: [true],
    variants: this.fb.array([this.makeVariantGroup()]),
    inventory: this.fb.array<ReturnType<typeof this.makeInventoryGroup>>([]),
  });

  get variants() {
    return this.form.controls.variants;
  }

  get inventoryRows() {
    return this.form.controls.inventory;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private categoriesService: CategoriesService,
    private storesService: StoresService,
    private productsService: ProductsService,
    private inventoryService: InventoryService,
  ) {}

  async ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');

    const [categories, stores] = await Promise.all([
      this.categoriesService.list(),
      this.storesService.listStores(),
    ]);
    this.categories.set(categories);
    this.stores.set(stores);

    for (const store of stores) {
      this.inventoryRows.push(this.makeInventoryGroup(store.id, store.name));
    }

    if (this.productId) {
      await this.loadExisting(this.productId);
    }
  }

  private makeVariantGroup(id: string | null = null) {
    return this.fb.nonNullable.group({
      id: [id],
      label: ['', Validators.required],
      price_rupees: [0, Validators.required],
      mrp_rupees: [0],
    });
  }

  private makeInventoryGroup(storeId: string, storeName: string) {
    return this.fb.nonNullable.group({
      store_id: [storeId],
      store_name: [storeName],
      quantity: [0],
    });
  }

  addVariant() {
    this.variants.push(this.makeVariantGroup());
  }

  removeVariant(index: number) {
    if (this.variants.length <= 1) return;
    const removed = this.variants.at(index).getRawValue();
    if (removed.id) this.existingVariantIds.delete(removed.id);
    this.variants.removeAt(index);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.imageFile = file;
    this.imagePreview.set(URL.createObjectURL(file));
  }

  private async loadExisting(id: string) {
    this.loading.set(true);
    try {
      const product = await this.productsService.getById(id);
      this.form.patchValue({
        category_id: product.category_id,
        name: product.name,
        is_active: product.is_active,
      });
      if (product.image) {
        this.imagePreview.set(this.productsService.getPublicUrl(product.image));
      }

      this.variants.clear();
      for (const variant of product.product_variants) {
        this.existingVariantIds.add(variant.id);
        const group = this.makeVariantGroup(variant.id);
        group.patchValue({
          label: variant.label,
          price_rupees: variant.price_paise / 100,
          mrp_rupees: (variant.mrp_paise ?? 0) / 100,
        });
        this.variants.push(group);
      }

      const inventoryByVariant = await Promise.all(
        product.product_variants.map((v) => this.inventoryService.getForVariant(v.id)),
      );
      // Seed the first variant's inventory into the store rows (per-store
      // quantity is tracked per variant, so editing shows the first
      // variant's stock as the starting point for all rows).
      const firstVariantRows = inventoryByVariant[0] ?? [];
      for (const row of this.inventoryRows.controls) {
        const match = firstVariantRows.find((r) => r.store_id === row.value.store_id);
        if (match) row.patchValue({ quantity: match.quantity });
      }
    } finally {
      this.loading.set(false);
    }
  }

  async submit() {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    try {
      const value = this.form.getRawValue();

      let imagePath: string | null | undefined = undefined;
      if (this.imageFile) {
        imagePath = await this.productsService.uploadImage(this.imageFile);
      }

      let productId = this.productId;
      if (productId) {
        await this.productsService.update(productId, {
          category_id: value.category_id,
          name: value.name,
          is_active: value.is_active,
          ...(imagePath !== undefined ? { image: imagePath } : {}),
        });
      } else {
        productId = await this.productsService.create({
          category_id: value.category_id,
          name: value.name,
          is_active: value.is_active,
          image: imagePath ?? null,
        });
      }

      const submittedVariantIds = new Set<string>();
      const variantIds: string[] = [];

      for (const variantValue of value.variants) {
        const payload = {
          product_id: productId,
          label: variantValue.label,
          price_paise: Math.round(variantValue.price_rupees * 100),
          mrp_paise: variantValue.mrp_rupees ? Math.round(variantValue.mrp_rupees * 100) : null,
        };

        if (variantValue.id) {
          await this.productsService.updateVariant(variantValue.id, payload);
          submittedVariantIds.add(variantValue.id);
          variantIds.push(variantValue.id);
        } else {
          const newId = await this.productsService.createVariant(payload);
          variantIds.push(newId);
        }
      }

      for (const existingId of this.existingVariantIds) {
        if (!submittedVariantIds.has(existingId)) {
          await this.productsService.deleteVariant(existingId);
        }
      }

      const inventoryRows = value.inventory.flatMap((row) =>
        variantIds.map((variantId) => ({
          store_id: row.store_id,
          product_variant_id: variantId,
          quantity: row.quantity,
        })),
      );
      if (inventoryRows.length) {
        await this.inventoryService.upsertMany(inventoryRows);
      }

      await this.router.navigateByUrl('/base/view-products');
    } catch (err: any) {
      this.error.set(err.message ?? 'Something went wrong.');
    } finally {
      this.saving.set(false);
    }
  }
}
