import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'workouts',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'workouts',
    loadComponent: () => import('./features/workouts/workouts-page.component').then((m) => m.WorkoutsPageComponent),
  },
  {
    path: '**',
    redirectTo: 'workouts',
  },
];
