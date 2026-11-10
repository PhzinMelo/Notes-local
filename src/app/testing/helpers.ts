import { AuthService } from '../services/auth.service';

let contador = 0;

/** Cadastra e autentica um usuário novo (e-mail único por chamada). Devolve o e-mail usado. */
export async function cadastrarEEntrar(auth: AuthService, nome = 'Maria Teste', senha = 'senha123'): Promise<string> {
  const email = `usuario${++contador}-${Date.now()}@teste.com`;
  const cadastro = await auth.cadastrar(nome, email, senha);
  if (!cadastro.ok) throw new Error(cadastro.erro);
  const login = await auth.entrar(email, senha);
  if (!login.ok) throw new Error(login.erro);
  return email;
}
