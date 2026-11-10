import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NewUserNotes } from './new-user-notes';

describe('NewUserNotes (cadastro)', () => {
  let fixture: ComponentFixture<NewUserNotes>;
  let component: NewUserNotes;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NewUserNotes],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    const router = TestBed.inject(Router);
    router.navigate = (async () => true) as Router['navigate'];
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(NewUserNotes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  const preencher = (nome: string, email: string, password: string) =>
    component.signupForm.setValue({ nome, email, password });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exige todos os campos', async () => {
    preencher('', '', '');
    await component.onSubmitReactive();
    expect(component.nomeErrorMessage).toContain('obrigatório');
    expect(component.emailErrorMessage).toContain('obrigatório');
    expect(component.passwordErrorMessage).toContain('obrigatório');
  });

  it('recusa nome curto, e-mail inválido e senha com menos de 6 caracteres', async () => {
    preencher('Al', 'sem-arroba', '123');
    await component.onSubmitReactive();
    expect(component.nomeErrorMessage).toContain('3 caracteres');
    expect(component.emailErrorMessage).toContain('válido');
    expect(component.passwordErrorMessage).toContain('6 caracteres');
    expect(localStorage.getItem('plume-notes:usuarios')).toBeNull(); // nada foi cadastrado
  });

  it('cadastra o usuário com sucesso', async () => {
    preencher('Ana Souza', 'ana@teste.com', 'abc123');
    await component.onSubmitReactive();
    expect(component.sucessLogin).toContain('sucesso');
    expect((await auth.entrar('ana@teste.com', 'abc123')).ok).toBe(true);
  });

  it('recusa e-mail já cadastrado', async () => {
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');
    preencher('Outra Ana', 'ana@teste.com', 'xyz789');
    await component.onSubmitReactive();
    expect(component.errorLogin).toContain('já está cadastrado');
    expect(component.sucessLogin).toBe('');
  });

  it('não escreve a senha no console', async () => {
    const original = console.log;
    const chamadas: unknown[][] = [];
    console.log = (...args: unknown[]) => { chamadas.push(args); };
    try {
      preencher('Ana Souza', 'ana@teste.com', 'abc123');
      await component.onSubmitReactive();
    } finally {
      console.log = original;
    }
    expect(JSON.stringify(chamadas).includes('abc123')).toBe(false);
  });

  it('mostra e oculta a senha com o botão de olho, sem perder o texto nem cadastrar', async () => {
    const raiz = fixture.nativeElement as HTMLElement;
    preencher('Ana Souza', 'ana@teste.com', 'abc123');
    fixture.detectChanges();
    const campo = raiz.querySelector('#password') as HTMLInputElement;
    const botao = raiz.querySelector('.password-toggle') as HTMLButtonElement;

    expect(botao.getAttribute('type')).toBe('button');
    expect(campo.type).toBe('password');
    expect(raiz.querySelector('.password-toggle svg')?.getAttribute('data-icon')).toBe('eye');
    expect(raiz.querySelector('.password-toggle')?.textContent?.trim()).toBe(''); // nada de emoji

    botao.click();
    fixture.detectChanges();
    expect(campo.type).toBe('text');
    expect(campo.value).toBe('abc123');
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(raiz.querySelector('.password-toggle svg')?.getAttribute('data-icon')).toBe('eye-slash');

    botao.click();
    fixture.detectChanges();
    expect(campo.type).toBe('password');
    expect(localStorage.getItem('plume-notes:usuarios')).toBeNull(); // nenhum cadastro foi enviado
  });

  it('textos da tela em português', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const trecho of ['Crie sua conta', 'Pelo menos 6 caracteres', 'Cadastrar', 'Já tem uma conta?']) {
      expect(texto).toContain(trecho);
    }
    expect(texto).not.toContain('Sign up');
  });
});
