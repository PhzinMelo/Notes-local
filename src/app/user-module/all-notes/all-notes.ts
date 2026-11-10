import { Component, ChangeDetectorRef, ElementRef, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrash, faBox, faPenToSquare, faHouse, faRightFromBracket, faMoon, faSun, faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import { ImageCropperComponent } from 'ngx-image-cropper';
import type { ImageCroppedEvent } from 'ngx-image-cropper';
import { IDadosNota, IImagemRef, INota } from '../../models/models';
import { AuthService } from '../../services/auth.service';
import { ImagensService } from '../../services/imagens.service';
import { NotasService } from '../../services/notas.service';
import { ThemeService } from '../../services/theme.service';
import { limitarProporcao, prepararImagem } from '../../shared/imagem.utils';

type TipoToast = 'success' | 'error' | 'warning';

@Component({
  selector: 'app-all-notes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, ImageCropperComponent],
  templateUrl: './all-notes.html',
  styleUrls: ['./all-notes.css'],
  // Mesmo ThemeService das outras telas: a classe no host liga as regras escuras deste componente.
  host: { '[class.tema-escuro]': 'theme.escuro()' },
})
export class AllNotes implements OnInit, OnDestroy {
  faTrash = faTrash; faBox = faBox; faPenToSquare = faPenToSquare;
  faHouse = faHouse; faRightFromBracket = faRightFromBracket; faMoon = faMoon; faSun = faSun;
  faMagnifyingGlass = faMagnifyingGlass;

  private readonly notasService = inject(NotasService);
  private readonly imagensService = inject(ImagensService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cd = inject(ChangeDetectorRef);
  readonly theme = inject(ThemeService);

  private readonly cropper = viewChild(ImageCropperComponent);
  private readonly campoBusca = viewChild<ElementRef<HTMLInputElement>>('campoBusca');

  /** As notas vêm direto do serviço, já filtradas pelo usuário logado. */
  get notas(): INota[] { return this.notasService.notas(); }
  get todasTags(): string[] { return this.notasService.tags(); }
  get nomeUsuario(): string { return this.auth.usuarioAtual()?.nome ?? ''; }

  notaSelecionada: INota | null = null;
  modoEdicao = false;
  modoCriacao = false;
  salvando = false;

  tituloControl   = new FormControl('');
  conteudoControl = new FormControl('');
  tagsControl     = new FormControl('');
  imageUrlControl = new FormControl('');
  termoBusca      = new FormControl('');

  // ── Estado da imagem do formulário ──
  mostrarAnexoImagem = false;
  /** Imagem já salva da nota em edição. */
  imagemAtual: IImagemRef | null = null;
  removerImagemAtual = false;
  /** Imagem que está sendo recortada agora (escolhida do computador, baixada de uma URL ou o original reaberto). */
  arquivoParaRecorte: File | null = null;
  previewRecorteUrl: string | null = null;
  previewRecorteAr = 1;
  imagemErroMsg = '';
  /** Preenchido quando a URL não pôde ser baixada: permite abrir a imagem em outra aba para salvá-la. */
  urlParaAbrir = '';
  carregandoImagem = false;

  /** id da imagem → URL temporária para o <img>. É recriada a cada abertura da página. */
  urlsImagens: Record<string, string> = {};

  tagsFiltradas: string[] = [];
  viewMode: 'list' | 'archived' = 'list';

  // ── TOAST ──
  toastMessage = '';
  toastType: TipoToast = 'success';
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ── MOBILE NAV STATES ──
  mobileSearchActive = false;
  mobileTagsActive   = false;

  // ── LIFECYCLE ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    void this.carregarUrlsImagens();
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
    this.limparPreview();
    this.imagensService.liberarTodasUrls();
  }

  // ── TOAST ──────────────────────────────────────────────────────────────────

  showToast(message: string, type: TipoToast = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.cd.detectChanges();
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.cd.detectChanges();
    }, 3000);
  }

  // ── MOBILE NAV ─────────────────────────────────────────────────────────────

  irParaLista(): void {
    this.viewMode = 'list';
    this.fecharDetalhe();
    this.mobileSearchActive = false;
    this.mobileTagsActive   = false;
  }

  irParaArquivadas(): void {
    this.viewMode = 'archived';
    this.fecharDetalhe();
    this.mobileSearchActive = false;
  }

  toggleMobileSearch(): void {
    this.mobileSearchActive = !this.mobileSearchActive;
    if (this.mobileSearchActive && !this.termoBusca.value)
      setTimeout(() => this.campoBusca()?.nativeElement.focus(), 100);
  }

  toggleMobileTags(): void {
    this.mobileTagsActive = !this.mobileTagsActive;
  }

  /** Fecha o painel de detalhe (botão "Voltar" no mobile). */
  fecharDetalhe(): void {
    this.notaSelecionada = null;
    this.modoCriacao = false;
    this.modoEdicao = false;
    this.resetAnexoState();
  }

  // ── IMAGENS ────────────────────────────────────────────────────────────────

  /** URL da imagem recortada de uma nota (undefined se a nota não tem imagem ou ela não foi encontrada). */
  urlImagem(nota: INota | null | undefined): string | undefined {
    return nota?.imagem ? this.urlsImagens[nota.imagem.id] : undefined;
  }

  /** Busca no IndexedDB as imagens que ainda não têm URL temporária. */
  async carregarUrlsImagens(): Promise<void> {
    const faltantes = this.notas
      .map(n => n.imagem?.id)
      .filter((id): id is string => !!id && !this.urlsImagens[id]);

    await Promise.all(faltantes.map(async id => {
      try {
        const url = await this.imagensService.urlRecortada(id);
        if (url) this.urlsImagens = { ...this.urlsImagens, [id]: url };
      } catch (erro) {
        console.error('Erro ao carregar imagem da nota:', erro);
      }
    }));
    this.cd.detectChanges();
  }

  /** Usuário escolheu um arquivo no computador. */
  async onArquivoEscolhido(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return; // seleção cancelada
    this.urlParaAbrir = '';
    await this.iniciarRecorte(arquivo);
  }

  /**
   * Baixa a imagem de uma URL e a trata como se fosse um arquivo local.
   * O navegador só entrega o conteúdo de outro site se esse site autorizar (CORS);
   * o front-end não tem como contornar isso, então nesse caso explicamos e sugerimos o caminho manual.
   */
  async carregarDaUrl(): Promise<void> {
    if (this.carregandoImagem) return;
    const url = this.imageUrlControl.value?.trim() || '';
    this.imagemErroMsg = '';
    this.urlParaAbrir = '';

    if (!this.pareceUrlHttp(url)) {
      this.imagemErroMsg = 'Informe um endereço http ou https válido (ex.: https://site.com/foto.jpg).';
      return;
    }

    this.carregandoImagem = true;
    this.cd.detectChanges();
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 15000);
    try {
      const resposta = await fetch(url, { signal: controle.signal });
      if (!resposta.ok) {
        this.imagemErroMsg = `O servidor da imagem respondeu com erro (HTTP ${resposta.status}). Confira o endereço.`;
        return;
      }
      // iniciarRecorte confere o conteúdo real do arquivo (HTML ou outro tipo é recusado, mesmo que a URL termine em .jpg)
      if (await this.iniciarRecorte(await resposta.blob())) this.imageUrlControl.setValue('');
      else if (!this.imagemErroMsg.includes('muito grande')) this.imagemErroMsg = 'O endereço não aponta para uma imagem JPG, PNG, WEBP ou GIF (pode ser uma página da web).';
    } catch (erro) {
      const abortou = erro instanceof DOMException && erro.name === 'AbortError';
      const host = new URL(url).hostname;
      if (abortou) {
        this.imagemErroMsg = `A imagem de ${host} demorou demais para responder. Tente novamente ou use "Escolher do computador".`;
      } else if (!navigator.onLine) {
        this.imagemErroMsg = 'Sem conexão com a internet. Você ainda pode usar "Escolher do computador".';
      } else {
        // O fetch não diferencia "CORS bloqueado" de "endereço inacessível": os dois viram o mesmo erro de rede.
        this.imagemErroMsg =
          `Não foi possível baixar a imagem de ${host}. Normalmente isso acontece porque o servidor que hospeda a imagem ` +
          'não autoriza outros sites a lerem o arquivo (bloqueio de CORS, feito pelo navegador por segurança, e não um erro do Plume Notes); ' +
          'também pode ser um endereço inacessível. Abra a imagem em outra aba, salve no computador e use "Escolher do computador".';
        this.urlParaAbrir = url;
      }
    } finally {
      clearTimeout(limite);
      this.carregandoImagem = false;
      this.cd.detectChanges();
    }
  }

  /** Valida o conteúdo real da imagem e a entrega ao cropper. Devolve true se foi aceita. */
  private async iniciarRecorte(imagem: Blob): Promise<boolean> {
    const resultado = await prepararImagem(imagem);
    if (!resultado.ok) {
      this.imagemErroMsg = resultado.erro;
      this.cd.detectChanges();
      return false;
    }
    this.imagemErroMsg = '';
    this.removerImagemAtual = false;
    this.limparPreview();
    this.arquivoParaRecorte = new File([resultado.imagem], 'imagem', { type: resultado.imagem.type });
    this.cd.detectChanges();
    return true;
  }

  /** Emitido pelo cropper a cada recorte (autoCrop): só atualiza a pré-visualização. */
  onImageCropped(evento: ImageCroppedEvent): void {
    if (evento.objectUrl) URL.revokeObjectURL(evento.objectUrl); // o cropper não libera essa URL
    if (!evento.blob) return;
    this.limparPreview();
    this.previewRecorteUrl = URL.createObjectURL(evento.blob);
    this.previewRecorteAr = limitarProporcao(evento.width / evento.height);
    this.cd.detectChanges();
  }

  onImagemFalhou(): void {
    this.arquivoParaRecorte = null;
    this.limparPreview();
    this.imagemErroMsg = 'Não foi possível carregar esta imagem. Tente outro arquivo.';
    this.cd.detectChanges();
  }

  /** Reabre a imagem ORIGINAL da nota no cropper para escolher outro recorte. */
  async ajustarRecorte(): Promise<void> {
    if (!this.imagemAtual) return;
    const original = await this.imagensService.obterOriginal(this.imagemAtual.id);
    if (original) await this.iniciarRecorte(original);
    else this.imagemErroMsg = 'A imagem original não foi encontrada.';
    this.cd.detectChanges();
  }

  removerImagem(): void {
    this.removerImagemAtual = true;
    this.cancelarRecorte();
  }

  cancelarRecorte(): void {
    this.arquivoParaRecorte = null;
    this.imagemErroMsg = '';
    this.urlParaAbrir = '';
    this.limparPreview();
  }

  private limparPreview(): void {
    if (this.previewRecorteUrl) URL.revokeObjectURL(this.previewRecorteUrl);
    this.previewRecorteUrl = null;
  }

  private pareceUrlHttp(texto: string): boolean {
    try { const u = new URL(texto); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
  }

  /**
   * Decide qual imagem a nota terá ao salvar:
   * - há recorte em andamento → gera o recorte final e grava original + recorte no IndexedDB;
   * - usuário removeu a imagem → nenhuma;
   * - senão → mantém a imagem que a nota já tinha.
   */
  private async resolverImagem(): Promise<IImagemRef | undefined> {
    if (this.arquivoParaRecorte) {
      const recorte = await this.cropper()?.crop('blob');
      if (!recorte?.blob) {
        throw new Error('A imagem ainda não terminou de carregar. Aguarde um instante e tente de novo.');
      }
      if (recorte.objectUrl) URL.revokeObjectURL(recorte.objectUrl);
      const id = await this.imagensService.salvar(this.arquivoParaRecorte, recorte.blob);
      return { id, ar: limitarProporcao(recorte.width / recorte.height) };
    }
    return this.removerImagemAtual ? undefined : (this.imagemAtual ?? undefined);
  }

  // ── NOTAS ──────────────────────────────────────────────────────────────────

  criarNovaNota(): void {
    this.modoCriacao = true; this.modoEdicao = false; this.notaSelecionada = null;
    this.tituloControl.setValue(''); this.conteudoControl.setValue('');
    this.tagsControl.setValue(''); this.imageUrlControl.setValue('');
    this.resetAnexoState();
  }

  private resetAnexoState(): void {
    this.cancelarRecorte();
    this.imagemAtual = null;
    this.removerImagemAtual = false;
    this.mostrarAnexoImagem = false;
    this.carregandoImagem = false;
    this.imageUrlControl.setValue('');
  }

  cancelar(): void {
    this.modoCriacao = false; this.modoEdicao = false;
    if (this.notaSelecionada) this.onNoteClick(this.notaSelecionada);
    else this.resetAnexoState();
  }

  onNoteClick(nota: INota): void {
    this.notaSelecionada = nota;
    this.modoCriacao = false; this.modoEdicao = false;
    this.tituloControl.setValue(nota.titulo);
    this.conteudoControl.setValue(nota.descricao);
    this.tagsControl.setValue(nota.tags.join(', '));
    this.resetAnexoState();
    this.cd.detectChanges();
  }

  entrarModoEdicao(): void {
    this.modoEdicao = true;
    if (!this.notaSelecionada) return;
    this.resetAnexoState();
    this.imagemAtual = this.notaSelecionada.imagem ? { ...this.notaSelecionada.imagem } : null;
    this.mostrarAnexoImagem = !!this.imagemAtual;
  }

  revelarAnexoImagem(): void { this.mostrarAnexoImagem = true; }
  getDescricao(): string { return this.notaSelecionada?.descricao || ''; }

  async salvarNota(): Promise<void> {
    if (this.salvando) return; // evita envio duplicado

    const titulo    = this.tituloControl.value?.trim() || '';
    const descricao = this.conteudoControl.value?.trim() || '';
    const tags = this.tagsControl.value?.split(',').map(t => t.trim().toLowerCase()).filter(t => t) || [];

    if (!titulo || !descricao) {
      this.showToast('Título e conteúdo são obrigatórios', 'warning');
      return;
    }

    this.salvando = true;
    let imagemNovaId: string | undefined;
    try {
      const imagem = await this.resolverImagem();
      if (imagem && imagem.id !== this.imagemAtual?.id) imagemNovaId = imagem.id;

      const dados: IDadosNota = { titulo, descricao, tags, imagem };
      const imagemAntigaId = this.notaSelecionada?.imagem?.id;

      if (this.modoCriacao) {
        this.notasService.criar(dados);
        this.showToast('✓ Nota criada com sucesso!', 'success');
      } else if (this.notaSelecionada) {
        if (!this.notasService.atualizar(this.notaSelecionada.id, dados)) throw new Error('Nota não encontrada.');
        if (imagemAntigaId && imagemAntigaId !== imagem?.id) await this.imagensService.remover(imagemAntigaId);
        this.showToast('✓ Nota salva com sucesso!', 'success');
      }

      this.fecharDetalhe();
      await this.carregarUrlsImagens();
    } catch (erro) {
      console.error('Erro ao salvar nota:', erro);
      // Se a nota não foi gravada, não deixa a imagem nova órfã no IndexedDB.
      if (imagemNovaId) await this.imagensService.remover(imagemNovaId).catch(() => undefined);
      this.showToast(erro instanceof Error ? erro.message : 'Não foi possível salvar a nota. Tente novamente.', 'error');
    } finally {
      this.salvando = false;
      this.cd.detectChanges();
    }
  }

  async deletarNota(): Promise<void> {
    if (!this.notaSelecionada) return;
    if (!confirm(`Deseja excluir a nota "${this.notaSelecionada.titulo}"?`)) return;
    try {
      const removida = this.notasService.excluir(this.notaSelecionada.id);
      if (removida?.imagem) await this.imagensService.remover(removida.imagem.id);
      this.showToast('✓ Nota excluída com sucesso!', 'success');
      this.fecharDetalhe();
    } catch (erro) {
      console.error('Erro ao deletar nota:', erro);
      this.showToast('Não foi possível excluir a nota.', 'error');
    }
  }

  /** Arquiva a nota selecionada, ou a restaura se já estiver arquivada. */
  arquivarNota(): void {
    if (!this.notaSelecionada) return;

    const jaArquivada = this.notaSelecionada.archived;
    const mensagem = jaArquivada
      ? `Deseja restaurar a nota "${this.notaSelecionada.titulo}"?`
      : `Deseja arquivar a nota "${this.notaSelecionada.titulo}"?`;
    if (!confirm(mensagem)) return;

    try {
      this.notasService.alternarArquivada(this.notaSelecionada.id);
      this.showToast(jaArquivada ? '✓ Nota restaurada com sucesso!' : '✓ Nota arquivada com sucesso!', 'success');
      this.fecharDetalhe();
    } catch (erro) {
      console.error('Erro ao arquivar/restaurar nota:', erro);
      this.showToast('Não foi possível arquivar ou restaurar a nota.', 'error');
    }
  }

  // ── FILTROS ────────────────────────────────────────────────────────────────

  /** Há pesquisa ou tags selecionadas? (muda a mensagem do estado vazio) */
  get temFiltroAtivo(): boolean {
    return !!this.termoBusca.value?.trim() || this.tagsFiltradas.length > 0;
  }

  get notasFiltradas(): INota[] {
    // 1) aba atual: normais ou arquivadas
    let lista = this.notas.filter(n => this.viewMode === 'archived' ? n.archived : !n.archived);

    // 2) busca por título, conteúdo ou tag
    const termo = this.termoBusca.value?.trim().toLowerCase();
    if (termo)
      lista = lista.filter(n =>
        n.titulo.toLowerCase().includes(termo) ||
        n.descricao.toLowerCase().includes(termo) ||
        n.tags.some(t => t.toLowerCase().includes(termo)));

    // 3) filtro por tags: a nota precisa ter TODAS as tags selecionadas
    if (this.tagsFiltradas.length)
      lista = lista.filter(n => this.tagsFiltradas.every(tag => n.tags.includes(tag)));

    // 4) mais recentes primeiro
    return [...lista].sort((a, b) => new Date(b.dataEdicao).getTime() - new Date(a.dataEdicao).getTime());
  }

  toggleTagFilter(tag: string): void {
    const i = this.tagsFiltradas.indexOf(tag);
    if (i > -1) this.tagsFiltradas.splice(i, 1); else this.tagsFiltradas.push(tag);
  }

  // ── UTILS ──────────────────────────────────────────────────────────────────

  formatarData(data?: string): string {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  ligarDesligarDarkMode(): void {
    this.theme.alternar();
  }

  logout(): void {
    this.auth.sair();
    this.imagensService.liberarTodasUrls();
    void this.router.navigate(['/login']);
  }
}
