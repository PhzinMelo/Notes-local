import { TAMANHO_MAXIMO_IMAGEM, detectarTipoImagem, limitarProporcao, prepararImagem } from './imagem.utils';

/** Primeiros bytes reais de cada formato (suficientes para a verificação da assinatura). */
const ASSINATURAS: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 0],
  'image/gif': [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0],
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};
const imagem = (tipo: string, declarado = tipo) => new Blob([new Uint8Array(ASSINATURAS[tipo])], { type: declarado });

describe('imagem.utils', () => {
  it('reconhece JPG, PNG, WEBP e GIF pelo conteúdo', async () => {
    for (const tipo of Object.keys(ASSINATURAS)) {
      expect(await detectarTipoImagem(imagem(tipo))).toBe(tipo);
    }
  });

  it('aceita imagem válida e corrige o MIME type quando o declarado está errado', async () => {
    const resultado = await prepararImagem(imagem('image/png', 'application/octet-stream'));
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.imagem.type).toBe('image/png');
  });

  it('recusa HTML ou texto, mesmo declarando Content-Type de imagem', async () => {
    const html = new Blob(['<html><body>não sou imagem</body></html>'], { type: 'image/png' });
    const texto = new Blob(['texto qualquer'], { type: 'image/jpeg' });
    for (const falso of [html, texto]) {
      const r = await prepararImagem(falso);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toContain('inválido');
    }
  });

  it('recusa PDF e SVG', async () => {
    expect((await prepararImagem(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))).ok).toBe(false);
    expect((await prepararImagem(new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' }))).ok).toBe(false);
  });

  it('recusa imagem acima de 5 MB', async () => {
    const grande = new Blob([new Uint8Array(TAMANHO_MAXIMO_IMAGEM + 1)], { type: 'image/png' });
    const r = await prepararImagem(grande);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain('muito grande');
  });

  it('recusa arquivo vazio', async () => {
    const r = await prepararImagem(new Blob([], { type: 'image/png' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain('vazio');
  });

  it('limita a proporção a uma faixa razoável', () => {
    expect(limitarProporcao(10)).toBe(3);
    expect(limitarProporcao(0.1)).toBe(0.6);
    expect(limitarProporcao(1.5)).toBe(1.5);
    expect(limitarProporcao(undefined)).toBeGreaterThan(0);
    expect(limitarProporcao(NaN)).toBeGreaterThan(0);
  });
});
