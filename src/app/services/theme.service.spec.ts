import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CHAVES } from './armazenamento';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  function novoServico(): ThemeService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => { localStorage.clear(); document.body.classList.remove('dark-mode'); });
  afterEach(() => document.body.classList.remove('dark-mode'));

  it('começa no tema claro', () => {
    const tema = novoServico();
    expect(tema.escuro()).toBe(false);
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });

  it('alterna, aplica a classe no body e grava uma única chave', () => {
    const tema = novoServico();
    tema.alternar();
    expect(tema.escuro()).toBe(true);
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    expect(localStorage.getItem(CHAVES.tema)).toBe('dark');

    tema.alternar();
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    expect(localStorage.getItem(CHAVES.tema)).toBe('light');
  });

  it('lembra o tema depois de recarregar', () => {
    novoServico().alternar();
    document.body.classList.remove('dark-mode');
    const depois = novoServico();
    expect(depois.escuro()).toBe(true);
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });

  it('migra a preferência das chaves antigas (theme / darkMode / darkmode)', () => {
    localStorage.setItem('darkMode', 'true');
    const tema = novoServico();
    expect(tema.escuro()).toBe(true);
    expect(localStorage.getItem('darkMode')).toBeNull();
    expect(localStorage.getItem(CHAVES.tema)).toBe('dark');
  });
});
