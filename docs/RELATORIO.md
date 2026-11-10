# Relatório — Plume Notes

Capturas de tela em [`capturas/`](capturas/). Scripts dos testes de navegador em [`testes-no-navegador/`](testes-no-navegador/).

## 0. Rodada 3: interface 100% em português e novo ícone de senha

**Idioma:** todos os textos visíveis (HTML e mensagens geradas no TypeScript) estão em pt-BR: login, cadastro, painel, sidebar, barra inferior, formulário de nota, estados vazios, toasts, confirmações, tooltips, `aria-label`, placeholders e `<html lang="pt-BR">`.
Exemplos: *All Notes → Todas as notas*, *Archived Notes → Notas arquivadas*, *Create New Note → Nova nota*, *Save Changes → Salvar alterações*, *Login → Entrar*, *Sign up → Cadastrar*, *Forgot → Esqueci a senha*, *Last edited → Última edição*, *✓ Note created successfully! → ✓ Nota criada com sucesso!*, *Failed to save note → Não foi possível salvar a nota*, "Deseja **deletar**…" → "Deseja **excluir**…".
Um estado vazio novo: quando há pesquisa/filtro sem resultado aparece "Nenhuma nota encontrada…" (antes mostrava o texto de "você ainda não tem notas").
**Mantidos de propósito:** a marca "Plume Notes"; "Tags" e "login" (empréstimos usuais em pt-BR); siglas técnicas (URL, CORS, HTTP, JPG, PNG, WEBP, GIF, Web Crypto); identificadores internos (`viewMode: 'archived'`, `archived`, `isLoading`, rotas `/login`, `/all-notes`, `/new-user-notes`, nomes de classes, métodos e propriedades de dados).

**Ícone de senha:** o emoji (cadastro) e os SVGs desenhados à mão (login) deram lugar ao Font Awesome já instalado: `faEye` com a senha oculta, `faEyeSlash` com a senha visível, nas duas telas (não há campo de confirmação de senha). É um `<button type="button">` com `aria-label` ("Mostrar senha"/"Ocultar senha"), `aria-pressed` e `title`; área de toque de 40×40 px; cor pela variável `--auth-icon` (escurecida no tema claro para atingir 3:1 de contraste).

## 1. Causas identificadas

| Problema | Causa real |
|---|---|
| Botão de tema não mudava as cores do login/cadastro | O Angular escopa **cada** parte do seletor: `body.dark-mode .fundo` vira `body.dark-mode[_ngcontent-x] .fundo[_ngcontent-x]`, e o `<body>` nunca tem esse atributo. Foi uma **regressão minha** da rodada anterior: ao tirar o `ViewEncapsulation.None` do login eu supus que esse seletor continuaria valendo. Medido antes da correção: `<body>` com `dark-mode`, mas fundo/cartão/input/título do login continuavam claros; no cadastro só fundo, cartão e título mudavam (inputs brancos). |
| Página inteira rolando no notebook (1366×768) | `min-height: 100dvh` deixava o grid crescer com a coluna mais alta (medido: `scrollHeight` 780 > 768, e crescia com o número de notas). |
| Salvar coberto no celular | No formulário aberto, a barra inferior (z-index 500) e o FAB (510) ficavam **por cima** do painel (300). Medido: FAB em y=662–722 sobre o botão Salvar (y=701–741). |
| Filtro por tags inacessível no mobile/tablet | A sidebar some nessas larguras e o botão "Tags" só ligava uma classe: não existia painel de tags. |
| Desktop grande: colunas e formulário esticados | Colunas `1fr` sem limite (1150 px cada em 2560 px de largura). |
| URL de imagem falhando (`i.pinimg.com`) | `fetch(url)` depende de CORS e o servidor de origem não autoriza. O front-end **não consegue** contornar isso; o app agora explica e oferece o caminho manual. |
| Build de produção quebrando | Estouro do orçamento de CSS do componente (limite de erro de 20 kB): o painel responsivo + tema escuro passou disso. |

## 2. Arquivos modificados

- `src/styles.css`: variáveis `--auth-*` (tema claro/escuro das telas de autenticação).
- `tela-login-notes.css`, `new-user-notes.css`: reescritos usando as variáveis; `100dvh` com fallback `100vh`; margens/padding; telas baixas.
- `all-notes.css`: layout (grid com `minmax`, rolagem por coluna), cabeçalho que quebra linha, mobile/tablet, barra de ações fixa, imagens, tema escuro.
- `all-notes.html`: painel de tags (mobile), FAB oculto com o editor aberto, link "abrir imagem em nova aba".
- `all-notes.ts`: URL de imagem (erros específicos, timeout, validação do conteúdo), classe de tema no host.
- `shared/imagem.utils.ts`: validação pela assinatura real do arquivo (não pela extensão/Content-Type).
- `index.html`: `viewport-fit=cover` (área segura de celulares com notch).
- `angular.json`: orçamento de CSS por componente (aviso 10→30 kB, erro 20→50 kB). O limite de 20 kB era o padrão do template do Angular. O `all-notes.css` compila hoje em ≈21 kB. O bundle inicial continua pequeno (261 kB, limite de aviso 500 kB).
- Specs: `imagem.utils.spec.ts` e `all-notes.spec.ts` (66 testes no total).
- **Não alterados:** `imagens.service.ts`, `notas.service.ts`, `auth.service.ts`, `theme.service.ts`, guards.

## 3. Como o tema foi corrigido

Opção preferencial, sem `::ng-deep` e sem mudar o encapsulamento: as cores das telas de login/cadastro viraram **variáveis CSS globais** em `src/styles.css`
(`:root` = claro; `body.dark-mode` = escuro) e os CSS dos componentes só usam `var(--auth-*)`.
O `ThemeService` continua sendo o único dono do estado e o `ThemeToggle` o único botão. No painel, o mesmo `ThemeService` liga a classe `tema-escuro` no host do componente
(`:host(.tema-escuro) ...`); isso eliminou todos os `::ng-deep` do projeto. Contrastes de texto no escuro ≥ 4,5:1 (link `#818cf8`, erro `#f87171`).

## 4. Como o layout foi reorganizado

- **Desktop (>1024 px):** `.app-wrapper` com `height: 100dvh` e `overflow: hidden`; grid `minmax(200px,260px) minmax(0,1fr) minmax(0,1fr)` com **uma linha `minmax(0,1fr)`**; as três colunas com `min-width/min-height: 0` e `overflow-y: auto`. Cabeçalho com `flex-wrap` (o título fica em cima e a busca embaixo quando falta espaço). Painel limitado a 1920 px e centralizado em monitores ultrawide; conteúdo do editor limitado a 760 px.
- **Tablet (601–1024 px):** uma coluna, cartões em grade (`auto-fill, minmax(300px,1fr)`), cabeçalho com busca fixo no topo, barra inferior e FAB.
- **Celular (≤600 px):** cartões horizontais com miniatura quadrada; painel de tags pelo botão "Tags".
- **Editor no mobile/tablet:** tela cheia sobreposta (z-index acima da barra inferior), botão Voltar, FAB oculto, rolagem própria.

## 5. Rolagem

- **Desktop:** a página não rola (`scrollHeight == innerHeight`, medido de 1366×768 a 2560×1080). Rolam por conta própria: a lista, o editor (com a barra Salvar/Cancelar **fixa** no fim da coluna, `position: sticky`) e a sidebar.
- **Mobile/tablet:** rolagem natural da página (cabeçalho e barra inferior fixos); o editor rola dentro do overlay, também com a barra de ações fixa.
- Login/cadastro: `min-height` (nunca `height`), então o cartão cresce e a página rola; centralizado quando cabe.

## 6. Imagens por URL

Fluxo: URL → `fetch` (timeout de 15 s) → **verifica o conteúdo real** (assinatura de JPG/PNG/WEBP/GIF; HTML com extensão `.jpg` ou `Content-Type` falso é recusado; `octet-stream` com imagem de verdade é aceito) → máximo 5 MB → cropper → IndexedDB.
Mensagens específicas: URL inválida (inclui `javascript:`), HTTP 404, timeout, sem conexão, não é imagem, muito grande, e falha de rede/CORS (cita o domínio, explica que é limitação do servidor de origem e oferece **"Abrir a imagem em uma nova aba"**, com `rel="noopener noreferrer"`).
"Escolher do computador" continua independente de qualquer URL, e uma falha de URL não impede salvar a nota.

## 7. O que continua sujeito a CORS

Qualquer URL cujo servidor não envie `Access-Control-Allow-Origin` (o caso do `i.pinimg.com`). É uma restrição do navegador que o front-end não pode (e não deve) contornar.
O app **não distingue** CORS de "endereço inacessível" (o `fetch` devolve o mesmo erro nos dois casos), por isso a mensagem cita as duas possibilidades. Para a apresentação, use "Escolher do computador".

## 8. Resultados dos testes

Executei os testes em um Chromium real (HeadlessChrome 153, via `@sparticuz/chromium`, instalado **fora** do projeto, em /tmp), com a segurança web ativa. Nada disso foi testado em celular físico nem em outros navegadores (Firefox/Safari).

| Teste | Resultado | Observações |
|---|---|---|
| `npm ci`, `ng build` de produção | ✅ executado | sem erros e sem avisos |
| `tsc` do app e dos specs | ✅ executado | |
| 69 testes unitários (11 arquivos) | ✅ executado em jsdom + Vitest | **não** executados no Karma/Chrome (`npm test`) |
| Tema: 9 passos pedidos (login, cadastro, painel, F5, logout), cores e contraste | ✅ Chromium | uma única chave `plume-notes:tema` |
| Login/cadastro em 360×800, 390×844, 768×1024, 1366×768, 1920×1080 × claro/escuro | ✅ Chromium | sem rolagem horizontal, cartão ≤440 px, centralizado, botão de tema sem sobrepor; cadastro cabe em 768 px |
| Painel nas 5 resoluções + 2560×1080 × claro/escuro (6 a 18 notas, formulário longo) | ✅ Chromium | página não rola no desktop; Salvar visível e clicável; sem estouro horizontal; FAB e barra inferior sem cobrir o Salvar |
| Imagens: criar, recortar (arrastando), salvar, F5, editar só o título, ajustar recorte, substituir, remover, arquivos inválidos/grandes | ✅ Chromium (IndexedDB real) | recorte antigo nunca reaproveitado; sem registros órfãos |
| URLs: com CORS, sem CORS, HTML disfarçado, `octet-stream`, 404, inválida, `javascript:`, >5 MB, timeout | ✅ Chromium | servidores locais com e sem CORS |
| Mobile: cropper, miniatura, detalhe com Voltar, painel de tags, busca, arquivar, isolamento entre 2 usuários | ✅ Chromium | |
| Aparência geral (capturas revisadas por mim) | ✅ olhei as imagens | revisão visual **minha**, não de um designer |
| Teste em celular/tablet físicos, Firefox, Safari | ⚠️ NÃO feito | |
| Rodada 3: botão de senha (login e cadastro × desktop/celular × claro/escuro: alternar, texto preservado, sem enviar o formulário, toque no celular, contraste do ícone ≥3:1) | ✅ Chromium | 8 cenários |
| Rodada 3: varredura de inglês em 24 telas/estados (+ leitura manual da lista de 100 textos únicos) | ✅ Chromium | só sobraram os termos mantidos de propósito |
| Karma/Chrome (`npm test`) | ⚠️ NÃO feito | |

Falhas **que encontrei e corrigi durante os testes** (em vez de esconder): `--disable-web-security` ligado por padrão no binário de teste (invalidava o teste de CORS; removido); um tema vazando entre páginas no meu próprio teste; e checagens com critério errado (ex.: triplo clique que não seleciona texto no headless).

## 9. Pendências

- Validar manualmente em um celular real (toque no cropper, teclado virtual sobre o formulário, barra de endereço do navegador).
- A coluna da direita fica vazia quando nenhuma nota está aberta (comportamento original, mantido).
- Botão de mostrar senha: SVG no login e emoji no cadastro; botão fechar (✖) do editor também é emoji; link "Forgot" continua só visual.
- Os 28 `*ngIf/*ngFor` do `all-notes.html` seguem o estilo original do projeto (não migrei para `@if/@for`).

## 10. Roteiro de apresentação (≈5 min)

1. `/new-user-notes`: cadastre “Ana” — mostre as validações (vazio, senha curta, e-mail repetido).
2. Entre em `/login` (mostre erro com senha errada primeiro).
3. **Create New Note** → título, conteúdo, tags `dev, aula`.
4. Em outra nota: **Anexar Imagem → Escolher do computador**, ajuste o recorte, veja o *Preview*, salve.
5. Abra a nota → editor → **Ajustar recorte** / **Substituir** / **Remover**.
6. Busque por uma palavra; clique em tags na lateral (várias ao mesmo tempo).
7. Arquive uma nota → aba **Archived Notes** → restaure.
8. Exclua uma nota (confirmação).
9. Alterne o tema em login, cadastro e painel (o estado é o mesmo).
10. Atualize a página (F5): tudo persiste. **Logout**, cadastre “Bia”: painel vazio (isolamento). Volte com “Ana”: as notas estão lá.

Dica: DevTools → Application → Local Storage / IndexedDB mostra onde cada dado fica (e que a senha é hash).

## 11. Requisitos do professor

| Requisito | Onde | Trecho / como mostrar |
|---|---|---|
| Página inicial | `app.routes.ts` | `''` → `login`; `guestGuard` leva logado ao painel |
| HTML | `*/*.html` | templates das 3 telas |
| CSS | `*/*.css` | responsividade (`@media`), tema escuro (`body.dark-mode`) |
| JavaScript externo | `*.ts` (compilados em `.js` no build) | `services/` concentram a lógica |
| Manipulação do DOM | templates; `theme.service.ts` | `*ngIf`/`*ngFor`, `[class.show]`, `[style.--ar]`; `body.classList.toggle('dark-mode')` |
| Eventos | templates | `(click)`, `(ngSubmit)`, `(change)` no input de arquivo, `(keydown.enter)` |
| Variáveis e tipos | `models/models.ts` | `INota`, `IUsuario`, tipos `string/number/boolean/Blob/File` |
| Condicionais | `new-user-notes.ts → validarCampos`, `auth.guard.ts`, `all-notes.ts → salvarNota` | `if/else`, ternários |
| Repetição | `all-notes.ts → notasFiltradas`; `notas.service.ts → tags`; `*ngFor` | `filter`, `map`, `forEach`, `every`, `some` |
| Funções | `services/*` | funções pequenas e nomeadas (`criar`, `atualizar`, `excluir`...) |
| Arrays e objetos | `notasFiltradas`, `urlsImagens`, `INota` | lista de objetos filtrada e ordenada; mapa id → URL |
| Formulários | login, cadastro, editor de nota | Reactive Forms (`FormBuilder`, `FormControl`) |
| Validação | `validarCampos`, `validarImagem` | mensagens por campo; tipo/tamanho de imagem |
| Conteúdo dinâmico | painel | lista atualiza ao criar/editar/buscar; toasts |
| Interação | todo o painel | criar, editar, arquivar, filtrar, recortar, tema |

