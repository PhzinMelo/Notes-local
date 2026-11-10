import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { CHAVES } from './armazenamento';

/** Chaves usadas antigamente pelas telas (cada uma tinha a sua). */
const CHAVES_ANTIGAS = ['theme', 'darkMode', 'darkmode'];

/**
 * Único dono do estado claro/escuro. As telas só leem `escuro()` e chamam `alternar()`;
 * o CSS reage à classe `dark-mode` no <body>.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly body = inject(DOCUMENT).body;

  readonly escuro = signal(this.lerPreferencia());

  constructor() {
    this.aplicar();
  }

  alternar(): void {
    this.escuro.update(atual => !atual);
    this.aplicar();
    try {
      localStorage.setItem(CHAVES.tema, this.escuro() ? 'dark' : 'light');
    } catch { /* sem armazenamento: o tema só vale nesta sessão */ }
  }

  private aplicar(): void {
    this.body.classList.toggle('dark-mode', this.escuro());
  }

  private lerPreferencia(): boolean {
    try {
      const salvo = localStorage.getItem(CHAVES.tema);
      if (salvo) return salvo === 'dark';

      // Migração única: aproveita a preferência gravada pelas versões antigas.
      const antigoEscuro = CHAVES_ANTIGAS.some(k => {
        const v = localStorage.getItem(k);
        return v === 'dark' || v === 'true';
      });
      CHAVES_ANTIGAS.forEach(k => localStorage.removeItem(k));
      if (antigoEscuro) localStorage.setItem(CHAVES.tema, 'dark');
      return antigoEscuro;
    } catch {
      return false;
    }
  }
}
