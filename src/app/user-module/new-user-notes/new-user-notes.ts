import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';
import { ThemeToggle } from '../../shared/theme-toggle';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-new-user-screem',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, ThemeToggle, FaIconComponent],
  templateUrl: './new-user-notes.html',
  styleUrl: './new-user-notes.css'
})
export class NewUserNotes implements OnDestroy {
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  signupForm: FormGroup;
  nomeErrorMessage = '';
  emailErrorMessage = '';
  passwordErrorMessage = '';
  sucessLogin = '';
  errorLogin = '';
  passwordVisible = false;
  passwordValid = false;
  isLoading = false;

  private redirectTimer?: ReturnType<typeof setTimeout>;

  constructor(private fb: FormBuilder, private router: Router, private auth: AuthService) {
    this.signupForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.pattern(REGEX_EMAIL)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.redirectTimer);
  }

  togglePassword(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  /** Atualiza o indicador "pelo menos 6 caracteres" enquanto o usuário digita. */
  onPasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.passwordValid = input.value.length >= 6;
  }

  /** Devolve a primeira mensagem de erro encontrada (nome → e-mail → senha) ou '' se tudo estiver certo. */
  private validarCampos(nome: string, email: string, password: string): boolean {
    this.nomeErrorMessage = '';
    this.emailErrorMessage = '';
    this.passwordErrorMessage = '';

    if (!nome.trim()) this.nomeErrorMessage = 'O campo de nome é obrigatório';
    else if (nome.trim().length < 3) this.nomeErrorMessage = 'O nome deve ter pelo menos 3 caracteres';

    if (!email.trim()) this.emailErrorMessage = 'O campo de e-mail é obrigatório';
    else if (!REGEX_EMAIL.test(email.trim())) this.emailErrorMessage = 'Informe um e-mail válido (ex.: nome@dominio.com)';

    if (!password) this.passwordErrorMessage = 'O campo de senha é obrigatório';
    else if (password.length < 6) this.passwordErrorMessage = 'A senha deve ter pelo menos 6 caracteres';

    return !this.nomeErrorMessage && !this.emailErrorMessage && !this.passwordErrorMessage;
  }

  async onSubmitReactive(): Promise<void> {
    if (this.isLoading) return; // evita envio duplicado

    this.sucessLogin = '';
    this.errorLogin = '';

    const { nome, email, password } = this.signupForm.value as { nome: string; email: string; password: string };
    if (!this.validarCampos(nome ?? '', email ?? '', password ?? '')) return;

    this.isLoading = true;
    const resultado = await this.auth.cadastrar(nome, email, password);
    this.isLoading = false;

    if (!resultado.ok) {
      this.errorLogin = resultado.erro;
      return;
    }

    this.sucessLogin = 'Usuário criado com sucesso! Redirecionando para o login...';
    this.signupForm.reset();
    this.passwordValid = false;
    this.redirectTimer = setTimeout(() => void this.router.navigate(['/login']), 1500);
  }
}
