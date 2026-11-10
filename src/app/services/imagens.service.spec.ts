import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { cadastrarEEntrar } from '../testing/helpers';
import { AuthService } from './auth.service';
import { ImagensService } from './imagens.service';

describe('ImagensService (IndexedDB)', () => {
  let auth: AuthService;
  let imagens: ImagensService;

  const blob = (conteudo: string) => new Blob([conteudo], { type: 'image/png' });

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    auth = TestBed.inject(AuthService);
    imagens = TestBed.inject(ImagensService);
  });

  it('salva e recupera o original e o recorte', async () => {
    await cadastrarEEntrar(auth);
    const id = await imagens.salvar(blob('original'), blob('recorte'));
    const original = await imagens.obterOriginal(id);
    expect(original?.size).toBe(8);
    expect(typeof (await imagens.urlRecortada(id))).toBe('string');
  });

  it('remove a imagem', async () => {
    await cadastrarEEntrar(auth);
    const id = await imagens.salvar(blob('a'), blob('b'));
    await imagens.remover(id);
    expect(await imagens.obterOriginal(id)).toBeUndefined();
    expect(await imagens.urlRecortada(id)).toBeUndefined();
  });

  it('não entrega a imagem de um usuário para outro', async () => {
    await cadastrarEEntrar(auth, 'Primeiro');
    const id = await imagens.salvar(blob('privada'), blob('privada'));
    auth.sair();
    imagens.liberarTodasUrls();

    await cadastrarEEntrar(auth, 'Segundo');
    expect(await imagens.obterOriginal(id)).toBeUndefined();
    expect(await imagens.urlRecortada(id)).toBeUndefined();
    await imagens.remover(id); // não pode apagar a imagem alheia

    auth.sair();
    expect(await imagens.obterOriginal(id)).toBeUndefined(); // sem sessão, nada
  });

  it('recusa gravar sem usuário autenticado', async () => {
    let falhou = false;
    try { await imagens.salvar(blob('a'), blob('b')); } catch { falhou = true; }
    expect(falhou).toBe(true);
  });
});
