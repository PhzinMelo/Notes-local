import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { cadastrarEEntrar } from '../testing/helpers';
import { AuthService } from './auth.service';
import { NotasService } from './notas.service';

describe('NotasService', () => {
  let auth: AuthService;
  let notas: NotasService;

  function iniciar(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    auth = TestBed.inject(AuthService);
    notas = TestBed.inject(NotasService);
  }

  const dados = (titulo: string, tags: string[] = []) => ({ titulo, descricao: `conteúdo de ${titulo}`, tags });

  beforeEach(() => { localStorage.clear(); iniciar(); });

  it('não deixa operar sem usuário autenticado', () => {
    expect(() => notas.criar(dados('x'))).toThrow();
    expect(notas.notas().length).toBe(0);
  });

  it('cria uma nota associada ao usuário atual', async () => {
    await cadastrarEEntrar(auth);
    const nota = notas.criar(dados('Primeira', ['dev']));
    expect(nota.usuarioId).toBe(auth.usuarioAtual()?.id ?? '');
    expect(nota.archived).toBe(false);
    expect(notas.notas().length).toBe(1);
  });

  it('edita título, conteúdo e tags e atualiza a data', async () => {
    await cadastrarEEntrar(auth);
    const nota = notas.criar(dados('Antes'));
    const editada = notas.atualizar(nota.id, { titulo: 'Depois', descricao: 'novo', tags: ['a'] });
    expect(editada?.titulo).toBe('Depois');
    expect(editada?.tags).toEqual(['a']);
    expect(notas.notas()[0].titulo).toBe('Depois');
  });

  it('arquiva e restaura sem excluir', async () => {
    await cadastrarEEntrar(auth);
    const nota = notas.criar(dados('Arquivável'));
    expect(notas.alternarArquivada(nota.id)?.archived).toBe(true);
    expect(notas.notas().length).toBe(1);
    expect(notas.alternarArquivada(nota.id)?.archived).toBe(false);
  });

  it('exclui somente a nota escolhida', async () => {
    await cadastrarEEntrar(auth);
    const a = notas.criar(dados('A'));
    notas.criar(dados('B'));
    expect(notas.excluir(a.id)?.id).toBe(a.id);
    expect(notas.notas().map(n => n.titulo)).toEqual(['B']);
  });

  it('lista as tags únicas em ordem alfabética', async () => {
    await cadastrarEEntrar(auth);
    notas.criar(dados('1', ['react', 'dev']));
    notas.criar(dados('2', ['dev', 'casa']));
    expect(notas.tags()).toEqual(['casa', 'dev', 'react']);
  });

  it('persiste depois de "atualizar a página"', async () => {
    await cadastrarEEntrar(auth);
    notas.criar(dados('Persistente'));
    iniciar(); // novos serviços, mesmo localStorage; a sessão também é restaurada
    expect(auth.estaAutenticado()).toBe(true);
    expect(notas.notas().map(n => n.titulo)).toEqual(['Persistente']);
  });

  describe('isolamento entre usuários', () => {
    it('o segundo usuário não vê as notas do primeiro', async () => {
      await cadastrarEEntrar(auth, 'Primeiro');
      notas.criar(dados('Segredo do primeiro'));
      auth.sair();
      expect(notas.notas().length).toBe(0);

      await cadastrarEEntrar(auth, 'Segundo');
      expect(notas.notas().length).toBe(0);
      expect(notas.tags().length).toBe(0);
    });

    it('o segundo usuário não consegue editar, arquivar nem excluir notas do primeiro', async () => {
      await cadastrarEEntrar(auth, 'Primeiro');
      const alheia = notas.criar(dados('Do primeiro', ['x']));
      auth.sair();
      await cadastrarEEntrar(auth, 'Segundo');

      expect(notas.atualizar(alheia.id, dados('Invadida'))).toBeUndefined();
      expect(notas.alternarArquivada(alheia.id)).toBeUndefined();
      expect(notas.excluir(alheia.id)).toBeUndefined();

      // o dono ainda enxerga a nota intacta
      auth.sair();
      iniciar();
      expect(notas.notas().length).toBe(0); // sem sessão não há notas
    });

    it('a nota continua intacta para o dono depois da tentativa de invasão', async () => {
      const emailPrimeiro = await cadastrarEEntrar(auth, 'Primeiro', 'senha111');
      const alheia = notas.criar(dados('Do primeiro'));
      auth.sair();
      await cadastrarEEntrar(auth, 'Segundo');
      notas.excluir(alheia.id);
      notas.atualizar(alheia.id, dados('Invadida'));
      auth.sair();

      await auth.entrar(emailPrimeiro, 'senha111');
      expect(notas.notas().map(n => n.titulo)).toEqual(['Do primeiro']);
    });
  });
});
