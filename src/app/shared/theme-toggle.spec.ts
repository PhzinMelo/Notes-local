import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../services/theme.service';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.body.classList.remove('dark-mode');
    await TestBed.configureTestingModule({
      imports: [ThemeToggle],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });
  afterEach(() => document.body.classList.remove('dark-mode'));

  it('mostra o ícone/rótulo do tema atual e alterna ao clicar', async () => {
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const botao = el.querySelector('button') as HTMLButtonElement;

    expect(botao.textContent).toContain('Modo escuro');
    expect(el.querySelector('svg')).toBeTruthy(); // ícone do Font Awesome, não emoji

    botao.click();
    await fixture.whenStable();
    expect(TestBed.inject(ThemeService).escuro()).toBe(true);
    expect(botao.textContent).toContain('Modo claro');
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });
});
