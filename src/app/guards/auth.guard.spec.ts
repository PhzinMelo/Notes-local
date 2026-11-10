import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { cadastrarEEntrar } from '../testing/helpers';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('guards', () => {
  let auth: AuthService;

  const executar = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    auth = TestBed.inject(AuthService);
  });

  it('authGuard redireciona para /login quando não há sessão', () => {
    const resultado = executar(authGuard);
    expect(resultado instanceof UrlTree).toBe(true);
    expect(String(resultado)).toBe('/login');
  });

  it('authGuard libera a rota quando há sessão', async () => {
    await cadastrarEEntrar(auth);
    expect(executar(authGuard)).toBe(true);
  });

  it('guestGuard manda quem já está logado para /all-notes e libera os demais', async () => {
    expect(executar(guestGuard)).toBe(true);
    await cadastrarEEntrar(auth);
    expect(String(executar(guestGuard))).toBe('/all-notes');
  });
});
