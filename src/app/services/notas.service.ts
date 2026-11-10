import { Injectable, computed, inject, signal } from '@angular/core';
import { IDadosNota, INota } from '../models/models';
import { AuthService } from './auth.service';
import { CHAVES, gravarJson, lerJson, novoId } from './armazenamento';

/**
 * CRUD de notas no localStorage. Todas as notas de todos os usuários ficam numa lista só,
 * mas TODA operação passa pelo usuário atual: ele só lê, altera ou apaga o que é dele.
 */
@Injectable({ providedIn: 'root' })
export class NotasService {
  private readonly auth = inject(AuthService);
  private readonly todas = signal<INota[]>(this.carregar());

  /** Notas do usuário autenticado (vazio se ninguém estiver logado). */
  readonly notas = computed(() => {
    const usuarioId = this.auth.usuarioAtual()?.id;
    return usuarioId ? this.todas().filter(n => n.usuarioId === usuarioId) : [];
  });

  /** Tags únicas das notas do usuário, em ordem alfabética. */
  readonly tags = computed(() => {
    const unicas = new Set<string>();
    this.notas().forEach(n => n.tags.forEach(t => unicas.add(t)));
    return Array.from(unicas).sort();
  });

  criar(dados: IDadosNota): INota {
    const nota: INota = {
      ...dados,
      id: novoId(),
      usuarioId: this.exigirUsuario(),
      dataEdicao: new Date().toISOString(),
      archived: false,
    };
    this.persistir([nota, ...this.todas()]);
    return nota;
  }

  atualizar(id: string, dados: IDadosNota): INota | undefined {
    return this.alterar(id, nota => ({ ...nota, ...dados, dataEdicao: new Date().toISOString() }));
  }

  /** Arquiva se estiver ativa; restaura se estiver arquivada. */
  alternarArquivada(id: string): INota | undefined {
    return this.alterar(id, nota => ({ ...nota, archived: !nota.archived }));
  }

  /** Devolve a nota removida (útil para apagar a imagem dela), ou undefined se não for do usuário. */
  excluir(id: string): INota | undefined {
    const usuarioId = this.exigirUsuario();
    const alvo = this.todas().find(n => n.id === id && n.usuarioId === usuarioId);
    if (!alvo) return undefined;
    this.persistir(this.todas().filter(n => n !== alvo));
    return alvo;
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  private alterar(id: string, transformar: (nota: INota) => INota): INota | undefined {
    const usuarioId = this.exigirUsuario();
    let resultado: INota | undefined;
    const lista = this.todas().map(n => {
      if (n.id !== id || n.usuarioId !== usuarioId) return n;
      resultado = transformar(n);
      return resultado;
    });
    if (resultado) this.persistir(lista);
    return resultado;
  }

  /** Grava primeiro; só atualiza a tela se a gravação funcionou. */
  private persistir(lista: INota[]): void {
    gravarJson(CHAVES.notas, lista);
    this.todas.set(lista);
  }

  private exigirUsuario(): string {
    const id = this.auth.usuarioAtual()?.id;
    if (!id) throw new Error('Nenhum usuário autenticado.');
    return id;
  }

  private carregar(): INota[] {
    const lista = lerJson<unknown>(CHAVES.notas, []);
    return Array.isArray(lista) ? (lista as INota[]) : [];
  }
}
