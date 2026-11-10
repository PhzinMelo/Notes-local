import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./user-module/tela-login-notes/tela-login-notes').then(m => m.TelaLoginNotes),
  },

  {
    path: 'new-user-notes',
    canActivate: [guestGuard],
    loadComponent: () => import('./user-module/new-user-notes/new-user-notes').then(m => m.NewUserNotes),
  },

  {
    path: 'all-notes',
    canActivate: [authGuard],
    loadComponent: () => import('./user-module/all-notes/all-notes').then(m => m.AllNotes),
  },

  { path: '**', redirectTo: 'login' },
];
