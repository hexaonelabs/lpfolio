import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'top-pools',
    loadComponent: () =>
      import('./pages/top-pools/top-pools.component').then(
        (m) => m.TopPoolsComponent
      ),
  },
  {
    path: 'hedge-calculator', 
    loadComponent: () => import('./pages/hedge-calculator/hedge-calculator.component').then(m => m.HedgeCalculatorComponent)
  },
  {
    path: '**',
    redirectTo: '',
  },
];
