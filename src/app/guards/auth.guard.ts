import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Rotas privadas: sem login, volta para /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estaAutenticado() ? true : inject(Router).parseUrl('/login');
};

/** Login e cadastro: quem já está autenticado vai direto para as notas. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estaAutenticado() ? inject(Router).parseUrl('/all-notes') : true;
};
