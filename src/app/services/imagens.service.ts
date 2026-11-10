import { Injectable, inject } from '@angular/core';
import { IImagemSalva } from '../models/models';
import { AuthService } from './auth.service';
import { novoId } from './armazenamento';

const NOME_BANCO = 'plume-notes';
const STORE = 'imagens';

/**
 * Guarda as imagens (Blob) no IndexedDB, que comporta arquivos grandes, ao contrário do localStorage.
 * Cada registro pertence a um usuário e só é devolvido a ele.
 */
@Injectable({ providedIn: 'root' })
export class ImagensService {
  private readonly auth = inject(AuthService);
  private banco?: Promise<IDBDatabase>;
  /** Cache de URLs temporárias (createObjectURL). Elas valem só enquanto a página estiver aberta. */
  private readonly urls = new Map<string, string>();

  async salvar(original: Blob, recortada: Blob): Promise<string> {
    const registro: IImagemSalva = { id: novoId(), usuarioId: this.exigirUsuario(), original, recortada };
    await this.executar('readwrite', store => store.put(registro));
    return registro.id;
  }

  async obterOriginal(id: string): Promise<Blob | undefined> {
    return (await this.buscar(id))?.original;
  }

  /** URL temporária da imagem recortada, pronta para <img [src]>. */
  async urlRecortada(id: string): Promise<string | undefined> {
    const existente = this.urls.get(id);
    if (existente) return existente;

    const registro = await this.buscar(id);
    if (!registro) return undefined;
    const url = URL.createObjectURL(registro.recortada);
    this.urls.set(id, url);
    return url;
  }

  async remover(id: string): Promise<void> {
    if (!(await this.buscar(id))) return; // inexistente ou de outro usuário
    await this.executar('readwrite', store => store.delete(id));
    this.liberarUrl(id);
  }

  /** Libera as URLs temporárias (ex.: ao fazer logout). Os dados continuam no IndexedDB. */
  liberarTodasUrls(): void {
    this.urls.forEach(url => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  private liberarUrl(id: string): void {
    const url = this.urls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(id);
  }

  private async buscar(id: string): Promise<IImagemSalva | undefined> {
    const registro = await this.executar<IImagemSalva | undefined>('readonly', store => store.get(id));
    return registro && registro.usuarioId === this.auth.usuarioAtual()?.id ? registro : undefined;
  }

  private exigirUsuario(): string {
    const id = this.auth.usuarioAtual()?.id;
    if (!id) throw new Error('Nenhum usuário autenticado.');
    return id;
  }

  private abrirBanco(): Promise<IDBDatabase> {
    this.banco ??= new Promise((resolve, reject) => {
      const pedido = indexedDB.open(NOME_BANCO, 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore(STORE, { keyPath: 'id' });
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => { this.banco = undefined; reject(pedido.error); };
    });
    return this.banco;
  }

  private async executar<T>(modo: IDBTransactionMode, operacao: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const banco = await this.abrirBanco();
    return new Promise<T>((resolve, reject) => {
      const transacao = banco.transaction(STORE, modo);
      const pedido = operacao(transacao.objectStore(STORE));
      transacao.oncomplete = () => resolve(pedido.result);
      transacao.onerror = () => reject(transacao.error);
      transacao.onabort = () => reject(transacao.error);
    });
  }
}
