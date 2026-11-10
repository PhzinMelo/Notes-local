import { Injectable, computed, signal } from '@angular/core';
import { IUsuario, IUsuarioArmazenado, ResultadoAuth } from '../models/models';
import { CHAVES, gravarJson, lerJson, novoId } from './armazenamento';

const ITERACOES_PBKDF2 = 100_000;

/**
 * Autenticação DEMONSTRATIVA, 100% local: não é segura para produção.
 * Os dados ficam no navegador, então qualquer pessoa com acesso ao DevTools pode alterá-los.
 * O que ela faz bem: não guarda senha em texto puro (PBKDF2-SHA256 + salt) e mantém
 * cada conta separada.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _usuarioAtual = signal<IUsuario | null>(this.restaurarSessao());

  readonly usuarioAtual = this._usuarioAtual.asReadonly();
  readonly estaAutenticado = computed(() => this._usuarioAtual() !== null);

  async cadastrar(nome: string, email: string, senha: string): Promise<ResultadoAuth> {
    const emailNormalizado = this.normalizarEmail(email);
    const usuarios = this.lerUsuarios();

    if (usuarios.some(u => u.email === emailNormalizado)) {
      return { ok: false, erro: 'Este e-mail já está cadastrado. Tente fazer login.' };
    }

    try {
      const salt = this.gerarSalt();
      const novo: IUsuarioArmazenado = {
        id: novoId(),
        nome: nome.trim(),
        email: emailNormalizado,
        salt,
        senhaHash: await this.gerarHash(senha, salt),
      };
      gravarJson(CHAVES.usuarios, [...usuarios, novo]);
      return { ok: true };
    } catch (erro) {
      return { ok: false, erro: this.mensagemDeErro(erro) };
    }
  }

  async entrar(email: string, senha: string): Promise<ResultadoAuth> {
    const emailNormalizado = this.normalizarEmail(email);
    const usuario = this.lerUsuarios().find(u => u.email === emailNormalizado);
    const erroGenerico: ResultadoAuth = { ok: false, erro: 'E-mail ou senha incorretos.' };
    if (!usuario) return erroGenerico;

    try {
      const hash = await this.gerarHash(senha, usuario.salt);
      if (hash !== usuario.senhaHash) return erroGenerico;

      gravarJson(CHAVES.sessao, usuario.id);
      this._usuarioAtual.set({ id: usuario.id, nome: usuario.nome, email: usuario.email });
      return { ok: true };
    } catch (erro) {
      return { ok: false, erro: this.mensagemDeErro(erro) };
    }
  }

  sair(): void {
    localStorage.removeItem(CHAVES.sessao);
    this._usuarioAtual.set(null);
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  private restaurarSessao(): IUsuario | null {
    const id = lerJson<string | null>(CHAVES.sessao, null);
    const usuario = id ? this.lerUsuarios().find(u => u.id === id) : undefined;
    return usuario ? { id: usuario.id, nome: usuario.nome, email: usuario.email } : null;
  }

  private lerUsuarios(): IUsuarioArmazenado[] {
    const lista = lerJson<unknown>(CHAVES.usuarios, []);
    return Array.isArray(lista) ? (lista as IUsuarioArmazenado[]) : [];
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private gerarSalt(): string {
    return this.paraBase64(crypto.getRandomValues(new Uint8Array(16)));
  }

  /** PBKDF2 com a Web Crypto API (só existe em https ou em localhost). */
  private async gerarHash(senha: string, saltBase64: string): Promise<string> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error('Este navegador não oferece a Web Crypto API. Abra o app por localhost ou https.');
    }
    const chave = await subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: this.deBase64(saltBase64), iterations: ITERACOES_PBKDF2 },
      chave,
      256,
    );
    return this.paraBase64(new Uint8Array(bits));
  }

  private paraBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private deBase64(texto: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(texto), c => c.charCodeAt(0));
  }

  private mensagemDeErro(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Erro inesperado. Tente novamente.';
  }
}
