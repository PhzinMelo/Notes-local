import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { ThemeService } from '../services/theme.service';

/** Botão de tema usado no login e no cadastro (o painel usa o mesmo ThemeService). */
@Component({
  selector: 'app-theme-toggle',
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="theme-toggle" (click)="theme.alternar()"
            [attr.aria-label]="theme.escuro() ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'"
            [attr.aria-pressed]="theme.escuro()">
      <fa-icon [icon]="theme.escuro() ? faSun : faMoon" />
      <span class="label">{{ theme.escuro() ? 'Modo claro' : 'Modo escuro' }}</span>
    </button>
  `,
  styles: `
    .theme-toggle {
      display: flex; align-items: center; gap: 8px;
      background: #f0f0f0; color: #333; border: none; border-radius: 25px;
      padding: 8px 14px; font-size: 14px; font-weight: 500; font-family: inherit;
      cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }
    .theme-toggle:hover { background: #ddd; transform: scale(1.05); }
    .theme-toggle:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }
    :host-context(body.dark-mode) .theme-toggle { background: #333; color: #f5f5f5; }
    :host-context(body.dark-mode) .theme-toggle:hover { background: #444; }
    @media (max-width: 480px) {
      .theme-toggle { padding: 6px 10px; font-size: 12px; }
    }
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly faMoon = faMoon;
  protected readonly faSun = faSun;
}
