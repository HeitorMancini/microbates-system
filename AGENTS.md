# MicroSystem: contexto do projeto

Arquivo de contexto para continuar o desenvolvimento de qualquer máquina ou agente.
Leia-o inteiro antes de mexer no código.

---

## 0. Regras para agentes (obrigatório)

1. **Somente acrescentar.** Ao atualizar este arquivo, adicione apenas informações novas e verificadas
   no código. Nunca apague, reescreva nem resuma o que já está escrito.
2. **Sem conflitos.** Não acrescente nada que contradiga o que já está aqui ou o que já foi
   desenvolvido. Se uma informação nova parecer conflitar com uma existente, pare e pergunte ao
   usuário.
3. **Mudanças pedem permissão.** Se for preciso alterar algo que já existe, seja no código já
   desenvolvido, numa decisão registrada ou num texto deste arquivo, peça permissão ao usuário antes
   e explique o motivo. Só altere depois de um "sim" explícito.
4. **Registre o que mudou.** Toda atualização entra no fim, em "Registro de alterações", com data
   (AAAA-MM-DD) e um resumo curto. Quando uma mudança aprovada tornar um trecho antigo desatualizado,
   o trecho antigo continua aqui, e a entrada nova no registro explica o que vale a partir de agora.
5. **Onde acrescentar:** na seção correspondente, no fim dela, como item novo. Se não houver seção
   adequada, crie uma nova antes de "Registro de alterações".
6. Antes de dar uma tarefa por concluída: `npx tsc --noEmit` e `npm run lint` precisam passar
   (veja a seção 10).

---

## 1. Conceito

- Portfólio pessoal transmídia apresentado como um **sistema operacional no estilo Windows 98**,
  rodando no navegador, dentro de um **monitor CRT centralizado** com efeitos de tubo de imagem.
- Cada pasta do disco `C:` é uma frente de trabalho: **Audiovisual**, **Worldbuilding**, **Musica** e
  **Engenharia**. Os "programas" (Explorer, Media Player, WordPad, Gravador de Som, Prompt do
  MS-DOS, Internet Explorer...) são as formas de ver cada tipo de trabalho.
- Toda a interface está em **português do Brasil** (`lang="pt-BR"`).

## 2. Identidade e nomes

- Nome do sistema: **MicroSystem** (antes "hesmOS").
- Empresa-mãe / fabricante fictícia: **Microbates Company**.
- Assinatura completa: **"Microbates Company | Interactive & Creative Works"**. Hoje aparece só na
  linha de copyright da tela de BIOS (`src/os/power.tsx`).
- Onde o nome aparece: título da aba ("MicroSystem"), faixa do Menu Iniciar, LEIAME.TXT, itens
  "Sobre o MicroSystem" nos menus Ajuda, caixas Executar e Desligar, telas de energia, página
  inicial do Internet Explorer e banner/`VER` do Prompt do MS-DOS
  ("(C) Copyright Microbates Company 1998-2026.").
- BIOS: "Microbates BIOS v4.51PG", disco "MICROBATES HD 4.3GB". Volume do disco C no `DIR`:
  "MICROSYSTEM".
- Mantidos de propósito com o nome antigo (internos, não visíveis): as chaves de `localStorage`
  `hesmos:display` e `hesmos:perf-checked` (trocar apagaria as configurações salvas dos
  visitantes), o `name` do `package.json` ("hesmos"), o nome da pasta do repositório e o id
  `lnk-hesmos`.

## 3. Stack técnica

- **Next.js 16** (App Router, Turbopack no dev) com `output: "export"`, ou seja, site **estático**
  (build gera `out/`). `next.config.ts` também tem `agentRules: false`.
- **React 19**, **TypeScript 5** em modo `strict`; alias `@/*` → `./src/*`.
- **98.css** para o visual base do Windows 98 (botões, janelas, abas, campos). Importado em
  `src/app/layout.tsx`.
- Estilos: `src/app/globals.css` (shell, desktop, CRT, taskbar, telas de energia) e
  **CSS Modules** por app/componente.
- Lint: ESLint 9 com `eslint-config-next`. **Não há testes automatizados.**
- Deploy: **Vercel** (`vercel.json` define cache para `/icons/*` e `/media/*`).
- Fonte padrão: "Pixelated MS Sans Serif" (do 98.css). Prompt e BIOS usam
  "Lucida Console", "Courier New", monospace.
- Escala da UI via `zoom` no `html`: 1.8 por padrão, 1.35 em telas até 1280×720 e 0.9 até 720×480.
- Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.

## 4. Estrutura de pastas

```
src/
  app/            layout.tsx, page.tsx (renderiza <DesktopShell />), globals.css
  content/        content.ts (VFS e atalhos da área de trabalho), types.ts, vfs.ts (consultas)
  os/             o "sistema": shell, janelas, taskbar, CRT, energia, utilitários
    ui/           componentes Win98 reutilizáveis (MenuBar, MenuList, Popups, Toolbar, StatusBar, Inset)
  apps/           um diretório por programa + registry.ts (catálogo de apps)
public/
  icons/          ícones SVG 32×32 em pixel art (shape-rendering crispEdges)
  media/          crt/reflection.jpg, img/ (moodboards), previews/ (prints de sites)
```

## 5. Arquitetura

### 5.1 Shell e energia (`src/os/DesktopShell.tsx`, `src/os/power.tsx`)
- Árvore: `ShutDownProvider` → `WindowManagerProvider key={session}` → `PopupsProvider` → `DesktopInner`.
- `DesktopInner` renderiza `.desktop` > `.desktop-screen` > (`DesktopSurface` com as janelas,
  `Taskbar`, `PopupLayer`, `PowerScreen`) e, fora da tela, `CrtOverlay`.
- Estado de energia: `on` → `closing` → `safe` → `off` → `boot` → `on`.
  - `closing`: tela azul "Aguarde enquanto o computador é desligado." (2 s).
  - `safe`: "Agora você pode desligar o computador com segurança." em laranja. Um clique desliga.
  - `off`: o tubo colapsa (`.desktop--off`) e aparece o botão **Ligar** fora da tela.
  - `boot`: tubo acendendo (`.desktop--warmup`, só depois de desligar), BIOS com teste de memória
    (2,6 s), tela de abertura com barra colorida (2,8 s). Um clique ou tecla pula.
- Reiniciar: `closing` → `boot`. "Reiniciar em modo MS-DOS": `closing` → `on` com o Prompt maximizado.
- `shutDown(mode)` incrementa `session`, o que remonta o `WindowManagerProvider` e fecha todas as janelas.
- **A sequência de boot só aparece ao reiniciar ou religar.** O site abre direto na área de trabalho.
- Com `prefers-reduced-motion`, o boot é pulado e as animações do tubo ficam desligadas.

### 5.2 Gerenciador de janelas (`src/os/WindowManager.tsx`)
- `useReducer` com ações `open`, `close`, `focus`, `minimize`, `maximize`, `restore`,
  `toggleTaskbar`, `move`, `resize`, `setFile` e `setStartMenu`. O reducer não tem efeitos colaterais.
- Instanciação por app: `single`, `perFile` ou `multi`. Janelas abrem em cascata; apps com
  `dialog: true` abrem **centralizados**. Em telas de toque, apps redimensionáveis abrem maximizados.
- `openApp(appId, fileId?, { maximized? })`, `openFile(fileId)` (escolhe o app pelo tipo do nó).
- As animações de janela são disparadas nos callbacks do provider, antes do `dispatch`, usando um
  `stateRef` (veja 5.6).
- Arrastar e redimensionar escrevem direto no DOM e só fazem commit ao soltar, para que um
  `pointermove` não re-renderize todas as janelas (`src/os/Window.tsx`).

### 5.3 Catálogo de apps (`src/apps/registry.ts`, tipo `AppDefinition` em `src/os/types.ts`)
- Campos: `id`, `title`, `exe`, `icon`, `defaultSize`, `minSize`, `resizable`, `instancing`,
  `handles` (tipos de nó do VFS), `formats` (documento `txt`/`rtf`), `formatTitle`,
  `showInStartMenu`, `startMenuFolder` (agrupa em Programas ▸ pasta) e `dialog` (centralizado, só
  botão Fechar).
- Componentes carregados com `next/dynamic`.

### 5.4 Sistema de arquivos virtual (`src/content/`)
- `VFS: VfsNode[]` em `content.ts`; tipos `folder`, `document` (blocos), `video`, `audio` e `link`.
- Blocos de documento: `heading`, `paragraph` (com `**negrito**`/`*itálico*`), `image`, `gallery`,
  `quote`, `list` e `divider`.
- Vídeo: `youtube`, `vimeo` (embed) ou `file` (src + poster).
- Link: `url`, `description`, `stack`, `repo`, `embeddable` (iframe ou aviso), `preview` (imagem).
- `vfs.ts`: `getNode`, `getChildren` (pastas primeiro, ordem pt-BR), `getNodesByKind`, `getPath`,
  `resolvePath` (aceita `C:\`, `\`, `..`), `iconForNode`, `kindLabel` e `docToPlainText`.
- `DESKTOP_SHORTCUTS`: atalhos da área de trabalho (`{ appId }` ou `{ fileId }`).

### 5.5 Pipeline CRT (`src/os/CrtOverlay.tsx`, `CrtCursor.tsx`, `crtGeometry.ts`, `displaySettings.ts`)
- `.desktop` é o maior 4:3 que cabe na janela com 16 px de borda, centralizado em fundo preto.
- Curvatura e separação RGB são filtros SVG (`feDisplacementMap`) aplicados em `.desktop-screen`
  via `--crt-filter`. Linhas de varredura (canvas curvo), grão, faixa VHS, vinheta, reflexo do
  vidro e cintilação são camadas em `.crt` (`z-index: 99999`, `pointer-events: none`).
- O clique continua plano. `CrtCursor` esconde o cursor do sistema dentro de `.desktop` e desenha
  um cursor onde o ponto real **aparece** na tela curva.
- Configurações em `localStorage` (`hesmos:display`), editáveis no Painel de Controle. O modo
  desempenho (`lite`) é ligado sozinho em máquinas fracas (≤ 4 núcleos ou ≤ 4 GB) ou se a mediana
  de frames passar de 34 ms (medição única por navegador, `hesmos:perf-checked`).

### 5.6 Menus, tooltips e animações (`src/os/ui/`, `src/os/windowAnimation.ts`)
- `MenuList` (`ui/PopupMenu.tsx`): menu Win98 com ícone, negrito, ✓, submenus ▸ que mudam de lado
  ou sobem para caber na tela, e teclado (setas, Enter, Esc). Variante `start` para o 1º nível do
  Menu Iniciar.
- `PopupsProvider` / `PopupLayer` / `usePopups()` (`ui/Popups.tsx`):
  `openContextMenu(event, items)` e `tooltip(text, shouldShow?)`, que devolve os handlers para
  espalhar no elemento. Há um único menu de contexto e um único tooltip por vez (amarelo, 500 ms),
  renderizados por portal em `.popup-layer` (`z-index: 10002`).
- `windowMenuItems` (`os/windowMenu.ts`): Restaurar / Minimizar / Maximizar / Fechar, compartilhado
  pela barra de título e pelo botão da taskbar.
- `animateWindow` (`os/windowAnimation.ts`): retângulo azul do tamanho da barra de título que vai
  em 8 passos (220 ms) entre a janela e o botão da taskbar (minimizar/restaurar) ou a tela cheia
  (maximizar). Os botões da taskbar têm `data-taskbar-id`.
- Coordenadas: `toScreenPoint(clientX, clientY)` e `toScreenRect(el)` em `src/os/scale.ts`
  convertem para pixels da tela emulada, compensando o `zoom` do `html`.

### 5.7 Camadas (z-index dentro de `.desktop-screen`)
- Ícones `1`, caixa de seleção `1`, janelas a partir de `2`, taskbar `10000`, Menu Iniciar `10001`,
  popups/tooltips/animação `10002`, telas de energia `10003`. Acima de tudo, `.crt` `99999`.

## 6. Features implementadas

### Área de trabalho (`src/os/Desktop.tsx`)
- Atalhos em coluna com quebra. Duplo clique abre; no toque, um toque abre.
- Seleção: clique seleciona, Ctrl/⌘+clique soma, clique no fundo limpa, **caixa de seleção por
  arraste** (só mouse) e setas navegam pela grade. Enter abre os selecionados.
- Visual Win98: rótulo azul-marinho e ícone com pontilhado azul 50% (máscara do próprio ícone);
  foco com contorno pontilhado no rótulo.
- Botão direito no fundo: **Organizar ícones ▸ Por nome / Por tipo**, **Atualizar** (pisca os
  ícones) e **Propriedades** (abre o Painel de Controle).
- Botão direito no ícone: **Abrir** (negrito) e **Propriedades** (desativado para atalhos de app).

### Taskbar e Menu Iniciar (`src/os/Taskbar.tsx`, `src/os/StartMenu.tsx`)
- Botão Iniciar (tooltip "Clique aqui para começar."). Menu com faixa lateral "MicroSystem":
  - **Programas ▸**: apps com `showInStartMenu !== false`; WordPad, Bloco de Notas e Gravador de
    Som ficam em **Acessórios ▸**.
  - **Documentos ▸**: espelha o VFS a partir de `C:` (pastas viram submenus; vazias mostram "(Vazio)").
  - **Configurações ▸ Painel de Controle**, **Executar...** e **Desligar...**.
  - O menu se desenrola para cima (`clip-path` em passos).
- Botões das janelas abertas: clique alterna, botão direito abre o menu da janela, tooltip com o
  título quando o texto está cortado.
- Relógio (pt-BR) com tooltip da data por extenso.

### Janelas (`src/os/Window.tsx`)
- Arrastar, redimensionar (alça no canto), maximizar (botão ou duplo clique), minimizar e fechar.
- Tooltips em português nos botões da barra de título. Os `aria-label` continuam em inglês
  ("Minimize", "Maximize", "Restore", "Close") porque o **98.css usa esses valores para desenhar os
  ícones dos botões**.
- Diálogos (`dialog: true`) só têm o botão Fechar e não maximizam.
- Botão direito na barra de título abre o menu da janela.

### Programas (`src/apps/`)
- **Meu Computador / Explorer** (`explorer`): navegação por pastas, Voltar/Acima, modos Ícones e
  Detalhes, barra de endereço e de status, Enter/Backspace.
- **Media Player** (`video-player`): YouTube/Vimeo (nocookie) ou arquivo local, lista de
  reprodução, controles, volume, barra de status. Uma camada transparente sobre o iframe devolve o
  foco à janela.
- **WordPad** (`wordpad`, `.doc`/rtf): renderiza os blocos, com régua e barras opcionais, somente leitura.
- **Bloco de Notas** (`notepad`, `.txt`): texto puro gerado dos blocos, quebra de linha opcional.
- **Gravador de Som** (`sound-recorder`): toca as faixas de áudio com forma de onda no canvas
  (Web Audio). Os botões de gravar e efeitos são decorativos.
- **Prompt do MS-DOS** (`terminal`): `HELP`, `DIR`, `CD`, `TYPE`, `OPEN`/`START`, `PROJECTS`,
  `CLS`, `VER`, `ECHO`, `EXIT` e autocompletar.
- **Painel de Controle** (`control-panel`): abas Tela e Efeitos com todos os ajustes do CRT, prévia
  do monitor e OK/Cancelar/Aplicar. Fica só em Configurações (não aparece em Programas).
- **Internet Explorer** (`internet-explorer`): abre nós `link`, com página inicial
  "MicroSystem na Web", histórico, iframe quando `embeddable`, imagem de prévia, aviso e
  "Abrir em nova aba" quando não dá para embutir, e escolha de resolução 720p/1080p.
- **Executar** (`run`, diálogo): aceita nome de executável (`wordpad`, `COMMAND.COM`, `control`...)
  ou caminho do VFS (`C:\Musica`). Se não achar, mostra a caixa de erro do Win98. **Não aceita
  URLs** (o IE só abre links que existem no VFS).
- **Propriedades** (`properties`, diálogo por arquivo): aba Geral com nome, tipo, local,
  conteúdo (pastas), URL (links) e data de criação.
- **Desligar o MicroSystem** (`shutdown`, diálogo): Desligar, Reiniciar ou Reiniciar em modo MS-DOS.

## 7. Conteúdo atual (`src/content/content.ts`)

- `C:\LEIAME.TXT`: boas-vindas e guia rápido.
- `C:\Audiovisual`: `Curta_Metragem.avi` (YouTube, `videoId` vazio) e `Diario_de_Voz.mp4` (arquivo).
- `C:\Worldbuilding`: `Sertao_Apocaliptico.doc` (premissa, citação, moodboard, facções) e
  `Cosmologia_do_Fosso.doc`.
- `C:\Musica`: `loop_01.wav` e `experimento_01.wav`.
- `C:\Engenharia`: links **MicroSystem** (este portfólio, `https://microbates.com`, repo
  `https://github.com/TODO/hesmOS`) e **Plataforma FOB**.
- Lixeira (fora de `C:`): `ideias_descartadas.txt`.
- Atalhos na área de trabalho: Meu Computador, Lixeira, Media Player, Gravador de Som, Prompt de
  Comando, README, Painel de Controle e Plataforma FOB.
- **Pendências de conteúdo:** vários textos ainda são `TODO` (sinopses, facções, camadas do Fosso,
  notas das faixas). Os arquivos de mídia referenciados (`/media/video/diario.*`,
  `/media/audio/*.mp3`) **não existem** em `public/`.

## 8. Restrições de design (respeitar sempre)

- **A tela CRT centralizada e todos os efeitos existentes são parte da identidade.** Não remover,
  substituir nem enfraquecer sem permissão.
- Todo elemento novo visível na tela (menus, diálogos, overlays, animações) deve ficar **dentro de
  `.desktop-screen`**, para curvar junto e ficar sob as camadas do CRT.
- **Não usar `title=""` nem `<select>` nativo** em elementos novos sobre a tela, porque o navegador
  os desenha fora do filtro e sem o cursor curvo. Use `usePopups().tooltip` e `MenuList`.
  (Os `title`/`select` antigos do Explorer e do WordPad ainda existem.)
- Converta posições do ponteiro com `toScreenPoint`/`toScreenRect` por causa do `zoom` do `html`.
- Animações curtas e em passos (`steps()`): o filtro de curvatura repinta a tela inteira a cada
  frame. Respeitar `prefers-reduced-motion` e o modo desempenho.
- Fidelidade ao Windows 98 em português: rótulos, menus e diálogos imitam o original.
- Ícones novos: SVG 32×32 em pixel art no mesmo traço dos existentes.

## 9. Convenções de código

- Componentes client (`"use client"`), funções nomeadas exportadas, TypeScript estrito.
- CSS Modules por app; classes globais só para o shell (`globals.css`).
- `<img>` com `{/* eslint-disable-next-line @next/next/no-img-element */}` (export estático).
- Comentários só para restrições que o código não mostra; manter a densidade atual (baixa).
- Mudanças cirúrgicas: não refatorar nem "melhorar" código vizinho sem pedido.

## 10. Verificação

- `npx tsc --noEmit` e `npm run lint` precisam passar.
- Teste manual no navegador: CRT ligado, modo desempenho e CRT desligado; janela pequena
  (zoom 0.9); toque emulado. Confira se menus e tooltips curvam junto e se o cursor curvo continua
  alinhado com o clique.

## 11. Decisões registradas

- **Sem sons do sistema** (decisão do usuário). Não há controle de volume na bandeja.
- **A sequência de boot só aparece ao reiniciar ou religar** pelo menu Desligar.
- A caixa Executar não abre URLs.
- No iOS, o menu de contexto não abre com toque longo (só o Android dispara `contextmenu` nativamente).

## 12. Pendências e ideias (não implementadas)

- Decidir o endereço do link do portfólio e do `README.md` (hoje `https://microbates.com`; o
  usuário pediu para tirar "Microbates.com" do nome do site).
- Link real do repositório no GitHub (hoje `TODO/hesmOS`).
- Sugestões de interface ainda não feitas: janela de boas-vindas automática com nome e contato,
  moldura física do monitor (gabinete bege), currículo e contato (estilo Outlook Express),
  protetor de tela, Campo Minado/Paciência, tela azul como easter egg, texto um pouco mais
  legível com o CRT ativo.
- Telas de BIOS e abertura ainda não foram conferidas visualmente (o fluxo foi testado pelo DOM).

---

## Registro de alterações

- **2026-11-05:** Arquivo criado. Estado registrado: Menu Iniciar completo (Programas, Documentos,
  Configurações, Executar, Desligar), menus de contexto, caixa Propriedades, seleção de ícones com
  caixa por arraste, tooltips, animação de minimizar/maximizar, desligar/reiniciar/modo MS-DOS com
  efeito de tubo, BIOS e tela de abertura. Sistema renomeado de hesmOS para MicroSystem (empresa
  Microbates Company; assinatura "Microbates Company | Interactive & Creative Works" na BIOS).
