import { Component } from '@angular/core';
import { ColComponent, RowComponent } from '@coreui/angular';

@Component({
  selector: 'app-add-product',
  imports: [RowComponent, ColComponent],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.scss',
})
export class AddProductComponent {}
