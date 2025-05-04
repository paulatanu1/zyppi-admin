import { Component } from '@angular/core';
import { FooterComponent } from '@coreui/angular';

@Component({
  selector: 'app-default-footer',
  templateUrl: './default-footer.component.html',
  styleUrls: ['./default-footer.component.scss'],
})
export class DefaultFooterComponent extends FooterComponent {
  currentYear: string;

  constructor() {
    super();
    this.currentYear = new Date().getFullYear().toString();
    console.log(this.currentYear);
  }
}
