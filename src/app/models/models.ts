/** Usuário como é exposto para a interface (nunca inclui hash/salt). */
export interface IUsuario {
  id: string;
  nome: string;
  email: string;
}

/** Usuário como é gravado no navegador: a senha vira hash + salt. */
export interface IUsuarioArmazenado extends IUsuario {
  senhaHash: string;
  salt: string;
}

/** Referência (guardada na nota) para uma imagem salva no IndexedDB. */
export interface IImagemRef {
  id: string;
  /** largura / altura da imagem recortada; usada para reservar o espaço no layout. */
  ar: number;
}

export interface INota {
  id: string;
  usuarioId: string;
  titulo: string;
  descricao: string;
  tags: string[];
  imagem?: IImagemRef;
  dataEdicao: string; // ISO 8601
  archived: boolean;
}

/** Campos que o usuário edita; id, dono, data e arquivamento são controlados pelo serviço. */
export type IDadosNota = Pick<INota, 'titulo' | 'descricao' | 'tags' | 'imagem'>;

/** Registro do IndexedDB: guarda a imagem original e o resultado do recorte. */
export interface IImagemSalva {
  id: string;
  usuarioId: string;
  original: Blob;
  recortada: Blob;
}

export type ResultadoAuth = { ok: true } | { ok: false; erro: string };
