# Plume Notes (Angular 20) — versão 100% local

Gerenciador de notas, em português do Brasil, com cadastro, login, CRUD, busca, tags, arquivamento, imagens com recorte e tema claro/escuro.
**Não usa backend nem API externa**: tudo fica no navegador (localStorage + IndexedDB).

## Como executar

Requisitos: Node.js 20+ e npm.

```bash
npm ci        # instala exatamente o que está no package-lock.json
npm start     # = ng serve → abra http://localhost:4200
```

Abra por **localhost** (ou https): o login usa a Web Crypto API, que o navegador só libera nesses contextos.

Outros comandos: `npm run build` (produção, saída em `dist/`) e `npm test` (Karma + Chrome).

Telas testadas em 360×800, 390×844, 768×1024, 1366×768, 1920×1080 e 2560×1080, nos temas claro e escuro.

## Como os dados são guardados

| O quê | Onde | Chave / banco |
|---|---|---|
| Usuários (senha como hash PBKDF2-SHA256 + salt) | localStorage | `plume-notes:usuarios` |
| Sessão (id do usuário logado) | localStorage | `plume-notes:sessao` |
| Notas de todos os usuários (cada uma com `usuarioId`) | localStorage | `plume-notes:notas` |
| Tema | localStorage | `plume-notes:tema` |
| Imagens (original + recorte, como Blob) | IndexedDB | banco `plume-notes`, store `imagens` |

Para "zerar" o app: DevTools → Application → Clear site data.

> A autenticação é **demonstrativa**: roda no navegador e qualquer pessoa com DevTools pode alterar os dados.
> Ela não guarda senha em texto puro e separa as contas, mas não é um sistema seguro de produção.

## Estrutura

```
src/app/
├── models/models.ts            interfaces (IUsuario, INota, IImagemRef...)
├── services/
│   ├── auth.service.ts         cadastro, login, logout, sessão (hash com Web Crypto)
│   ├── notas.service.ts        CRUD de notas; toda operação é restrita ao usuário atual
│   ├── imagens.service.ts      IndexedDB: salva/lê/remove imagens; respeita o dono
│   ├── theme.service.ts        único estado claro/escuro (classe dark-mode no <body>)
│   └── armazenamento.ts        helpers de localStorage + gerador de id
├── guards/auth.guard.ts        authGuard (rotas privadas) e guestGuard (login/cadastro)
├── shared/
│   ├── theme-toggle.ts         botão de tema (login e cadastro)
│   └── imagem.utils.ts         validação de arquivo (tipo/tamanho) e proporção
├── user-module/
│   ├── tela-login-notes/       tela de login
│   ├── new-user-notes/         tela de cadastro
│   └── all-notes/              painel: lista, busca, tags, formulário, cropper
├── testing/helpers.ts          apoio aos testes
└── app.routes.ts / app.config.ts / app.ts
```

Rotas: `/login` · `/new-user-notes` (cadastro) · `/all-notes` (protegida). Qualquer outra rota volta para `/login`;
quem já está logado é levado direto para `/all-notes`.

## Imagens

1. O usuário escolhe um arquivo (JPG, PNG, WEBP ou GIF, até 5 MB) — ou cola uma URL, que é baixada e tratada como arquivo local.
2. O `ngx-image-cropper` mostra o recorte; ao salvar a nota, o app guarda no IndexedDB a **imagem original** e o **recorte final** (JPEG, até 1280 px de largura).
3. As telas exibem o recorte em um `<img>` com `object-fit: cover`; a nota guarda só `{ id, ar }` (id da imagem e proporção).
4. Ao editar, dá para **Ajustar recorte** (reabre o original), **Substituir** ou **Remover** a imagem.

URLs de sites que não liberam CORS não podem ser baixadas pelo navegador (restrição de segurança que o front-end não contorna); nesse caso o app explica, oferece abrir a imagem em outra aba e sugere salvá-la e escolhê-la do computador. O app confere o conteúdo real do arquivo (não só a extensão).

## Tema e layout

- Cores de login/cadastro: variáveis `--auth-*` em `src/styles.css` (claro em `:root`, escuro em `body.dark-mode`). O `ThemeService` só liga/desliga a classe `dark-mode` no `<body>`.
- Painel: no desktop ocupa a janela inteira e só as colunas rolam; no tablet/celular vira uma coluna com barra inferior, botão flutuante e editor em tela cheia.
- Orçamento de CSS por componente em `angular.json`: aviso 30 kB / erro 50 kB (o `all-notes.css` tem ≈21 kB). Se uma folha de estilo passar do limite, é só aumentar `anyComponentStyle` ali.

Mais detalhes (testes, roteiro de apresentação, requisitos do professor): [docs/RELATORIO.md](docs/RELATORIO.md) · capturas em [docs/capturas](docs/capturas) · testes de navegador em [docs/testes-no-navegador](docs/testes-no-navegador).
