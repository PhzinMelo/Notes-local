import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { cadastrarEEntrar } from '../../testing/helpers';
import { AuthService } from '../../services/auth.service';
import { ImagensService } from '../../services/imagens.service';
import { NotasService } from '../../services/notas.service';
import { AllNotes } from './all-notes';

describe('AllNotes (painel)', () => {
  let fixture: ComponentFixture<AllNotes>;
  let component: AllNotes;
  let auth: AuthService;
  let notasService: NotasService;
  let imagens: ImagensService;
  let destinos: string[];
  const confirmOriginal = window.confirm;

  /** Monta o painel já com um usuário logado. */
  async function abrirPainel(nome = 'Maria Teste'): Promise<void> {
    await cadastrarEEntrar(auth, nome);
    fixture = TestBed.createComponent(AllNotes);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function criarNotaPelaTela(titulo: string, conteudo: string, tags: string): Promise<void> {
    component.criarNovaNota();
    component.tituloControl.setValue(titulo);
    component.conteudoControl.setValue(conteudo);
    component.tagsControl.setValue(tags);
    await component.salvarNota();
  }

  beforeEach(async () => {
    localStorage.clear();
    window.confirm = () => true;
    await TestBed.configureTestingModule({
      imports: [AllNotes],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    destinos = [];
    TestBed.inject(Router).navigate = (async (c: unknown[]) => { destinos.push(String(c[0])); return true; }) as Router['navigate'];
    auth = TestBed.inject(AuthService);
    notasService = TestBed.inject(NotasService);
    imagens = TestBed.inject(ImagensService);
  });

  afterEach(() => {
    window.confirm = confirmOriginal;
    fixture?.destroy();
  });

  it('should create e começa sem notas (nada de dados falsos)', async () => {
    await abrirPainel();
    expect(component).toBeTruthy();
    expect(component.notasFiltradas.length).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Você ainda não tem notas');
  });

  it('cria uma nota pela tela, mostra na lista e fecha o formulário', async () => {
    await abrirPainel();
    await criarNotaPelaTela('Minha nota', 'Texto da nota', 'Dev, React');
    fixture.detectChanges();

    expect(component.notasFiltradas.length).toBe(1);
    expect(component.notasFiltradas[0].tags).toEqual(['dev', 'react']);
    expect(component.modoCriacao).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.note-card').length).toBe(1);
  });

  it('exige título e conteúdo', async () => {
    await abrirPainel();
    await criarNotaPelaTela('', 'só conteúdo', '');
    expect(component.toastMessage).toContain('obrigatórios');
    expect(component.toastType).toBe('warning');
    expect(component.notasFiltradas.length).toBe(0);
  });

  it('edita uma nota existente', async () => {
    await abrirPainel();
    await criarNotaPelaTela('Antes', 'conteúdo', 'a');
    component.onNoteClick(component.notasFiltradas[0]);
    component.entrarModoEdicao();
    expect(component.tituloControl.value).toBe('Antes');
    component.tituloControl.setValue('Depois');
    await component.salvarNota();
    expect(component.notasFiltradas[0].titulo).toBe('Depois');
    expect(component.notasFiltradas.length).toBe(1);
  });

  it('arquiva, lista nas arquivadas e restaura', async () => {
    await abrirPainel();
    await criarNotaPelaTela('Arquivável', 'conteúdo', '');
    component.onNoteClick(component.notasFiltradas[0]);
    component.arquivarNota();
    expect(component.notasFiltradas.length).toBe(0);

    component.irParaArquivadas();
    expect(component.notasFiltradas.length).toBe(1);
    component.onNoteClick(component.notasFiltradas[0]);
    component.arquivarNota(); // restaurar
    expect(component.notasFiltradas.length).toBe(0);
    component.irParaLista();
    expect(component.notasFiltradas.length).toBe(1);
  });

  it('exclui somente a nota selecionada', async () => {
    await abrirPainel();
    await criarNotaPelaTela('Fica', 'conteúdo', '');
    await criarNotaPelaTela('Sai', 'conteúdo', '');
    component.onNoteClick(component.notasFiltradas.find(n => n.titulo === 'Sai')!);
    await component.deletarNota();
    expect(component.notasFiltradas.map(n => n.titulo)).toEqual(['Fica']);
  });

  it('pesquisa por título, conteúdo e tag; filtra por várias tags', async () => {
    await abrirPainel();
    await criarNotaPelaTela('Receita de bolo', 'farinha e ovos', 'cozinha, doce');
    await criarNotaPelaTela('Estudar Angular', 'signals e rotas', 'dev, estudo');
    await criarNotaPelaTela('Estudar receitas', 'massas', 'cozinha, estudo');

    component.termoBusca.setValue('angular');
    expect(component.notasFiltradas.map(n => n.titulo)).toEqual(['Estudar Angular']);
    component.termoBusca.setValue('farinha');
    expect(component.notasFiltradas.map(n => n.titulo)).toEqual(['Receita de bolo']);
    component.termoBusca.setValue('doce');
    expect(component.notasFiltradas.map(n => n.titulo)).toEqual(['Receita de bolo']);

    component.termoBusca.setValue('');
    component.toggleTagFilter('cozinha');
    expect(component.notasFiltradas.length).toBe(2);
    component.toggleTagFilter('estudo'); // precisa ter as duas tags
    expect(component.notasFiltradas.map(n => n.titulo)).toEqual(['Estudar receitas']);
    component.toggleTagFilter('cozinha');
    component.toggleTagFilter('estudo');
    expect(component.notasFiltradas.length).toBe(3);
  });

  it('o segundo usuário não vê nem altera as notas do primeiro', async () => {
    await abrirPainel('Primeiro');
    await criarNotaPelaTela('Privada', 'conteúdo', 'segredo');
    const idAlheio = component.notasFiltradas[0].id;
    component.logout();
    fixture.destroy();
    expect(destinos).toEqual(['/login']);

    await abrirPainel('Segundo');
    expect(component.notasFiltradas.length).toBe(0);
    expect(component.todasTags.length).toBe(0);
    expect(notasService.excluir(idAlheio)).toBeUndefined();
  });

  it('rejeita arquivo que não é imagem e arquivo muito grande, sem abrir o cropper', async () => {
    await abrirPainel();
    component.criarNovaNota();
    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const enviar = async (arquivo: File) => {
      const alvo = { files: [arquivo], value: 'C:\\fakepath\\arquivo' };
      await component.onArquivoEscolhido({ target: alvo } as unknown as Event);
      expect(alvo.value).toBe(''); // limpa o input para permitir escolher o mesmo arquivo de novo
    };

    await enviar(new File(['texto'], 'nota.txt', { type: 'text/plain' }));
    expect(component.imagemErroMsg).toContain('inválido');
    expect(component.arquivoParaRecorte).toBeNull();

    // extensão e MIME de imagem, mas o conteúdo é texto: também é recusado
    await enviar(new File(['isto é texto'], 'falso.png', { type: 'image/png' }));
    expect(component.imagemErroMsg).toContain('inválido');
    expect(component.arquivoParaRecorte).toBeNull();

    await enviar(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }));
    expect(component.imagemErroMsg).toContain('muito grande');
    expect(component.arquivoParaRecorte).toBeNull();

    await enviar(new File([PNG], 'ok.png', { type: 'image/png' }));
    expect(component.imagemErroMsg).toBe('');
    expect(component.arquivoParaRecorte).toBeTruthy();
  });

  it('seleção cancelada não altera nada', async () => {
    await abrirPainel();
    component.criarNovaNota();
    await component.onArquivoEscolhido({ target: { files: [], value: '' } } as unknown as Event);
    expect(component.arquivoParaRecorte).toBeNull();
    expect(component.imagemErroMsg).toBe('');
  });

  it('URL inválida mostra mensagem e não tenta baixar nada', async () => {
    await abrirPainel();
    component.criarNovaNota();
    component.imageUrlControl.setValue('isso nao e url');
    await component.carregarDaUrl();
    expect(component.imagemErroMsg).toContain('http ou https');
    component.imageUrlControl.setValue('javascript:alert(1)');
    await component.carregarDaUrl();
    expect(component.imagemErroMsg).toContain('http ou https');
    expect(component.arquivoParaRecorte).toBeNull();
  });

  it('falha de rede/CORS na URL explica a limitação, oferece abrir a imagem e não trava o formulário', async () => {
    await abrirPainel();
    component.criarNovaNota();
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    try {
      component.imageUrlControl.setValue('https://i.pinimg.com/originals/foto.jpg');
      await component.carregarDaUrl();
    } finally {
      globalThis.fetch = fetchOriginal;
    }
    expect(component.imagemErroMsg).toContain('i.pinimg.com');
    expect(component.imagemErroMsg).toContain('CORS');
    expect(component.imagemErroMsg).toContain('Escolher do computador');
    expect(component.urlParaAbrir).toBe('https://i.pinimg.com/originals/foto.jpg');
    expect(component.carregandoImagem).toBe(false);

    // a nota continua podendo ser criada sem imagem
    component.tituloControl.setValue('Sem imagem mesmo assim');
    component.conteudoControl.setValue('conteúdo');
    await component.salvarNota();
    expect(component.notasFiltradas.some(n => n.titulo === 'Sem imagem mesmo assim')).toBe(true);
  });

  it('o painel de tags (mobile) lista as tags do usuário e filtra ao clicar', async () => {
    await abrirPainel();
    await criarNotaPelaTela('A', 'x', 'viagem, foto');
    await criarNotaPelaTela('B', 'y', 'viagem');
    const raiz = fixture.nativeElement as HTMLElement;
    const clicar = async (el: Element | undefined) => { (el as HTMLElement).click(); await fixture.whenStable(); };

    const botaoTags = Array.from(raiz.querySelectorAll('.bottom-nav-item')).find(b => b.textContent?.includes('Tags'));
    await clicar(botaoTags);
    const chips = Array.from(raiz.querySelectorAll('.tag-chip'));
    expect(chips.map(c => c.textContent?.trim())).toEqual(['foto', 'viagem']);

    await clicar(chips[0]); // "foto"
    expect(component.notasFiltradas.map(n => n.titulo)).toEqual(['A']);
    expect(raiz.querySelectorAll('.tag-chip.active').length).toBe(1);
  });

  it('remove a imagem de uma nota e apaga o arquivo do IndexedDB; nota sem imagem não dá erro', async () => {
    await abrirPainel();
    const png = new Blob(['img'], { type: 'image/png' });
    const imagemId = await imagens.salvar(png, png);
    notasService.criar({ titulo: 'Com imagem', descricao: 'x', tags: [], imagem: { id: imagemId, ar: 1.5 } });
    notasService.criar({ titulo: 'Sem imagem', descricao: 'y', tags: [] });
    await component.carregarUrlsImagens();
    fixture.detectChanges();

    const comImagem = component.notasFiltradas.find(n => n.titulo === 'Com imagem')!;
    const semImagem = component.notasFiltradas.find(n => n.titulo === 'Sem imagem')!;
    expect(typeof component.urlImagem(comImagem)).toBe('string');
    expect(component.urlImagem(semImagem)).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.note-card-banner-frame').length).toBe(1);

    component.onNoteClick(comImagem);
    component.entrarModoEdicao();
    expect(component.imagemAtual?.id).toBe(imagemId);
    component.removerImagem();
    await component.salvarNota();

    expect(notasService.notas().find(n => n.titulo === 'Com imagem')?.imagem).toBeUndefined();
    expect(await imagens.obterOriginal(imagemId)).toBeUndefined();
  });

  it('excluir uma nota apaga também a imagem dela', async () => {
    await abrirPainel();
    const png = new Blob(['img'], { type: 'image/png' });
    const imagemId = await imagens.salvar(png, png);
    notasService.criar({ titulo: 'Com imagem', descricao: 'x', tags: [], imagem: { id: imagemId, ar: 1 } });
    component.onNoteClick(component.notasFiltradas[0]);
    await component.deletarNota();
    expect(await imagens.obterOriginal(imagemId)).toBeUndefined();
  });

  it('logout encerra a sessão e leva para /login', async () => {
    await abrirPainel();
    component.logout();
    expect(auth.estaAutenticado()).toBe(false);
    expect(destinos).toEqual(['/login']);
  });
});
