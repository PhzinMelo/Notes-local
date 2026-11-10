export const TIPOS_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024; // 5 MB

export type ResultadoImagem = { ok: true; imagem: Blob } | { ok: false; erro: string };

/**
 * Descobre o tipo REAL da imagem pelos primeiros bytes ("assinatura" do arquivo).
 * Não confia na extensão (.jpg) nem no Content-Type: uma página HTML ou um .txt renomeado
 * para .png não passam.
 */
export async function detectarTipoImagem(arquivo: Blob): Promise<string | null> {
  const b = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer());
  const ascii = (inicio: number, fim: number) => String.fromCharCode(...b.slice(inicio, fim));

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Valida (tamanho + conteúdo real) e devolve o Blob já com o MIME type correto,
 * ou a mensagem de erro para mostrar ao usuário.
 */
export async function prepararImagem(arquivo: Blob): Promise<ResultadoImagem> {
  if (arquivo.size === 0) return { ok: false, erro: 'O arquivo está vazio.' };
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) return { ok: false, erro: 'Imagem muito grande. O tamanho máximo é 5 MB.' };

  const tipo = await detectarTipoImagem(arquivo);
  if (!tipo) return { ok: false, erro: 'Arquivo inválido. Use uma imagem JPG, PNG, WEBP ou GIF.' };

  return { ok: true, imagem: arquivo.type === tipo ? arquivo : new Blob([arquivo], { type: tipo }) };
}

/** Garante que a razão largura/altura usada no layout fique em uma faixa razoável. */
export function limitarProporcao(ar: number | undefined): number {
  return Number.isFinite(ar) && ar! > 0 ? Math.min(3, Math.max(0.6, ar!)) : 1.78;
}
