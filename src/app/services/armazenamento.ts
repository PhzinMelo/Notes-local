/** Funções pequenas para ler/gravar JSON no localStorage (todas as chaves usam o prefixo do app). */
export const CHAVES = {
  usuarios: 'plume-notes:usuarios',
  sessao: 'plume-notes:sessao',
  notas: 'plume-notes:notas',
  tema: 'plume-notes:tema',
} as const;

export function lerJson<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto === null ? padrao : (JSON.parse(bruto) as T);
  } catch (erro) {
    console.error(`Não foi possível ler "${chave}" do localStorage.`, erro);
    return padrao;
  }
}

/** Grava e lança erro se o navegador recusar (armazenamento cheio ou bloqueado). */
export function gravarJson(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    throw new Error('Não foi possível salvar no navegador (armazenamento cheio ou bloqueado).');
  }
}

export function novoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
