import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TelaLoginNotes } from './tela-login-notes';

describe('TelaLoginNotes', () => {
  let fixture: ComponentFixture<TelaLoginNotes>;
  let component: TelaLoginNotes;
  let auth: AuthService;
  let destinos: string[];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TelaLoginNotes],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    destinos = [];
    const router = TestBed.inject(Router);
    router.navigate = (async (comandos: unknown[]) => { destinos.push(String(comandos[0])); return true; }) as Router['navigate'];

    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(TelaLoginNotes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const preencher = (email: string, password: string) => component.loginForm.setValue({ email, password });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exige e-mail e senha', async () => {
    preencher('', '');
    await component.onLoginClick();
    expect(component.emailErrorMessage).toContain('obrigatório');
    expect(component.passwordErrorMessage).toContain('obrigatório');
    expect(destinos.length).toBe(0);
  });

  it('recusa e-mail mal formatado', async () => {
    preencher('isso-nao-e-email', 'abc123');
    await component.onLoginClick();
    expect(component.emailErrorMessage).toContain('válido');
  });

  it('mostra erro para credenciais incorretas e não navega', async () => {
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');
    preencher('ana@teste.com', 'senha-errada');
    await component.onLoginClick();
    expect(component.incorretoErrorMessage).toBe('E-mail ou senha incorretos.');
    expect(destinos.length).toBe(0);
    expect(auth.estaAutenticado()).toBe(false);
  });

  it('faz login e vai para /all-notes', async () => {
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');
    preencher('ana@teste.com', 'abc123');
    await component.onLoginClick();
    expect(component.sucessoErrorMessage).toContain('sucesso');
    expect(destinos).toEqual(['/all-notes']);
    expect(auth.estaAutenticado()).toBe(true);
  });

  it('não permite enviar duas vezes ao mesmo tempo', async () => {
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');
    preencher('ana@teste.com', 'abc123');
    await Promise.all([component.onLoginClick(), component.onLoginClick()]);
    expect(destinos.length).toBe(1);
  });

  it('mostra e oculta a senha com o botão de olho, sem perder o texto nem enviar o formulário', async () => {
    const raiz = fixture.nativeElement as HTMLElement;
    preencher('ana@teste.com', 'abc123');
    fixture.detectChanges();
    const campo = raiz.querySelector('#password') as HTMLInputElement;
    const botao = raiz.querySelector('.password-toggle') as HTMLButtonElement;

    expect(botao.getAttribute('type')).toBe('button');
    expect(campo.type).toBe('password');
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(botao.getAttribute('aria-label')).toBe('Mostrar senha');
    expect(raiz.querySelector('.password-toggle svg')?.getAttribute('data-icon')).toBe('eye');

    botao.click();
    fixture.detectChanges();
    expect(campo.type).toBe('text');
    expect(campo.value).toBe('abc123');
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(botao.getAttribute('aria-label')).toBe('Ocultar senha');
    expect(raiz.querySelector('.password-toggle svg')?.getAttribute('data-icon')).toBe('eye-slash');

    botao.click();
    fixture.detectChanges();
    expect(campo.type).toBe('password');
    expect(campo.value).toBe('abc123');
    expect(destinos.length).toBe(0); // clicar no olho não envia o formulário
    expect(auth.estaAutenticado()).toBe(false);
  });
});
