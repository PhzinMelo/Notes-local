import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { CHAVES } from './armazenamento';

describe('AuthService', () => {
  function novoServico(): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());

  it('cadastra um usuário e permite o login', async () => {
    const auth = novoServico();
    expect((await auth.cadastrar('Ana Souza', 'ana@teste.com', 'abc123')).ok).toBe(true);
    expect(auth.estaAutenticado()).toBe(false); // cadastro não loga automaticamente

    expect((await auth.entrar('ana@teste.com', 'abc123')).ok).toBe(true);
    expect(auth.estaAutenticado()).toBe(true);
    expect(auth.usuarioAtual()?.nome).toBe('Ana Souza');
  });

  it('não guarda a senha em texto puro', async () => {
    const auth = novoServico();
    await auth.cadastrar('Ana Souza', 'ana@teste.com', 'abc123');
    const gravado = localStorage.getItem(CHAVES.usuarios) ?? '';
    expect(gravado.includes('abc123')).toBe(false);
    expect(gravado.includes('senhaHash')).toBe(true);
    expect(gravado.includes('salt')).toBe(true);
  });

  it('recusa e-mail já cadastrado (ignorando maiúsculas e espaços)', async () => {
    const auth = novoServico();
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');
    const repetido = await auth.cadastrar('Outra Ana', '  ANA@Teste.com ', 'xyz789');
    expect(repetido.ok).toBe(false);
  });

  it('recusa senha incorreta e e-mail desconhecido com a mesma mensagem', async () => {
    const auth = novoServico();
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');

    const senhaErrada = await auth.entrar('ana@teste.com', 'errada');
    const emailInexistente = await auth.entrar('ninguem@teste.com', 'abc123');
    expect(senhaErrada.ok).toBe(false);
    expect(emailInexistente.ok).toBe(false);
    if (!senhaErrada.ok && !emailInexistente.ok) expect(senhaErrada.erro).toBe(emailInexistente.erro);
    expect(auth.estaAutenticado()).toBe(false);
  });

  it('encerra a sessão ao sair', async () => {
    const auth = novoServico();
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');
    await auth.entrar('ana@teste.com', 'abc123');
    auth.sair();
    expect(auth.estaAutenticado()).toBe(false);
    expect(localStorage.getItem(CHAVES.sessao)).toBeNull();
  });

  it('mantém a sessão depois de "atualizar a página" (novo serviço lendo o localStorage)', async () => {
    const auth = novoServico();
    await auth.cadastrar('Ana', 'ana@teste.com', 'abc123');
    await auth.entrar('ana@teste.com', 'abc123');

    const aposRecarregar = novoServico();
    expect(aposRecarregar.estaAutenticado()).toBe(true);
    expect(aposRecarregar.usuarioAtual()?.email).toBe('ana@teste.com');
  });

  it('ignora sessão que aponta para um usuário que não existe', () => {
    localStorage.setItem(CHAVES.sessao, JSON.stringify('id-inexistente'));
    expect(novoServico().estaAutenticado()).toBe(false);
  });
});
