import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/game-shell/game-shell.component').then(m => m.GameShellComponent),
    pathMatch: 'full'
  }
];
