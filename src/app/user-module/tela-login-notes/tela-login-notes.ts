import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';
import { ThemeToggle } from '../../shared/theme-toggle';

@Component({
  selector: 'app-tela-login-notes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ThemeToggle, FaIconComponent],
  templateUrl: './tela-login-notes.html',
  styleUrls: ['./tela-login-notes.css'],
})
export class TelaLoginNotes {
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  loginForm: FormGroup;
  emailErrorMessage = '';
  passwordErrorMessage = '';
  sucessoErrorMessage = '';
  incorretoErrorMessage = '';
  passwordVisible = false;
  isLoading = false;

  constructor(private fb: FormBuilder, private router: Router, private auth: AuthService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  togglePassword(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  async onLoginClick(): Promise<void> {
    if (this.isLoading) return; // evita envio duplicado

    this.sucessoErrorMessage = '';
    this.incorretoErrorMessage = '';

    const email = (this.loginForm.value.email ?? '').trim();
    const password: string = this.loginForm.value.password ?? '';

    // Validação campo a campo, com mensagens específicas
    this.emailErrorMessage = '';
    this.passwordErrorMessage = '';
    if (!email) this.emailErrorMessage = 'O campo de e-mail é obrigatório.';
    else if (this.loginForm.get('email')?.invalid) this.emailErrorMessage = 'Informe um e-mail válido.';
    if (!password) this.passwordErrorMessage = 'O campo de senha é obrigatório.';
    if (this.emailErrorMessage || this.passwordErrorMessage) return;

    this.isLoading = true;
    const resultado = await this.auth.entrar(email, password);
    this.isLoading = false;

    if (resultado.ok) {
      this.sucessoErrorMessage = 'Login realizado com sucesso!';
      void this.router.navigate(['/all-notes']);
    } else {
      this.incorretoErrorMessage = resultado.erro;
    }
  }

  goToRegister(): void {
    void this.router.navigate(['/new-user-notes']);
  }
}
