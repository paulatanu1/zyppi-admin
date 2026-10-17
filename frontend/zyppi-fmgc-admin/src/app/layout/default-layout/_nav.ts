import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' },
  },
  {
    name: 'Products',
    url: '/base',
    iconComponent: { name: 'cil-puzzle' },
    children: [
      {
        name: 'Add Product',
        url: '/base/add-product',
        icon: 'nav-icon-bullet',
      },
      {
        name: 'Products',
        url: '/base/view-products',
        icon: 'nav-icon-bullet',
      },
      {
        name: 'Categories',
        url: '/base/categories',
        icon: 'nav-icon-bullet',
      },
    ],
  },
  {
    name: 'Orders',
    url: '/base/orders',
    iconComponent: { name: 'cil-list' },
  },
  {
    name: 'Users',
    url: '/base/users',
    iconComponent: { name: 'cil-people' },
  },
  {
    name: 'Settings',
    url: '/base/settings',
    iconComponent: { name: 'cil-settings' },
    children: [
      {
        name: 'Stores & Areas',
        url: '/base/stores',
        icon: 'nav-icon-bullet',
      },
      {
        name: 'Delivery Slots',
        url: '/base/delivery-slots',
        icon: 'nav-icon-bullet',
      },
      {
        name: 'Coupons',
        url: '/base/coupons',
        icon: 'nav-icon-bullet',
      },
    ],
  },
];
