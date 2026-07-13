# ✧ ⎯ ੭ Falta Lua

Bot de Discord com lembretes, rolagem de dados, roleta de escolhas **e um sistema de organização de canais e anúncios classificados**, todo estilizado com a identidade visual `✧ ⎯ ੭`.

## 📁 Estrutura do projeto

```
falta-lua-bot/
├── commands/
│   ├── ping.js · dado.js · roleta.js · lembrete.js
│   ├── moeda.js · eightball.js · ship.js · guerra.js · roleta_russa.js
│   ├── abraco.js · cartasecreta.js · social.js
│   ├── avatar.js · membros.js · status.js · votar.js · mila.js
│   ├── configurar.js · anuncio.js · organizar.js · aviso.js · seguranca.js
│   ├── limpar.js · lentidao.js
│   └── codex.js          → /codex (o Livro da Lua, paginado e com busca)
├── utils/
│   ├── theme.js           → cores e embeds padronizados
│   ├── tempo.js           → interpretação de "10m", "1h30m" etc
│   ├── lembretesStore.js  → salva lembretes em data/lembretes.json
│   ├── agendador.js       → dispara e reagenda lembretes (sobrevive a restarts)
│   ├── servidorStore.js   → salva config de canais/anúncios em data/servidores.json
│   ├── ui.js              → botões, menus de seleção e busca aproximada (Levenshtein)
│   └── codexData.js       → dados de todas as páginas do Livro da Lua
├── data/                  → lembretes.json e servidores.json (criados automaticamente)
├── index.js              → arquivo principal, liga o bot (slash + prefixo $)
├── deploy-commands.js    → registra os comandos slash no Discord
├── .env.example
└── package.json
```

## 🛠️ Passo a passo (no VSCode)

### 1. Criar a aplicação do bot no Discord
1. Acesse https://discord.com/developers/applications
2. Clique em **New Application** → dê o nome `✧ ⎯ ੭Falta Lua`
3. Vá em **Bot** → **Reset Token** → copie o token (isso vai no `.env`)
4. Em **Bot**, ative a opção **Message Content Intent** se for usar comandos de prefixo (não obrigatório para slash)
5. Vá em **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Mention Everyone` (se for usar @everyone nos anúncios), `Manage Server` (para quem vai configurar)
   - Copie o link gerado e abra no navegador para convidar o bot ao servidor

### 2. Instalar dependências
No terminal do VSCode, dentro da pasta do projeto:

```bash
npm install
```

### 3. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e preencha:

- `DISCORD_TOKEN`: o token copiado no passo 1
- `CLIENT_ID`: em **General Information** da aplicação, campo "Application ID"
- `GUILD_ID` (opcional, recomendado pra testar): clique com botão direito no ícone do seu servidor no Discord (com o modo desenvolvedor ativado em Configurações → Avançado) → **Copiar ID do Servidor**

### 4. Registrar os comandos
```bash
npm run deploy
```

### 5. Rodar o bot
```bash
npm start
```

Se tudo estiver certo, o terminal vai mostrar:
```
✧ ⎯ ੭ ✧ ⎯ ੭Falta Lua está online como Falta Lua#1234
```

## 🎲 Comandos disponíveis

> ⚠️ `/configurar`, `/anuncio` e `/aviso` exigem permissão de **Gerir Servidor**. `/limpar` exige **Gerenciar Mensagens** e `/lentidao` exige **Gerenciar Canais**.

### 🎲 Diversão
| Comando | Descrição |
|---|---|
| `/dado notacao:1d20` | Rola dados no formato NdM (`2d6+3`, `4d8-1`...) |
| `/moeda` | Cara ou coroa, com botão para jogar de novo |
| `/roleta opcoes:pizza, sushi` | Sorteia uma opção entre as listadas |
| `/8ball pergunta:...` | A bola mágica responde com mistério (botão para repetir) |
| `/ship usuario1:@a usuario2:@b` | Compatibilidade amorosa entre dois membros (barra) |
| `/guerra` | Mini guerra de cartas: você vs bot, melhor de 3 (botões) |
| `/roleta_russa` | Roleta russa de 6 câmaras |

### 💞 Social
| Comando | Descrição |
|---|---|
| `/abraco usuario:@alguem` | Envia um abraço carinhoso |
| `/cartasecreta usuario:@a mensagem:...` | Entrega uma carta misteriosa no privado |
| `/social usuario:@alguem` | Cartão de perfil com botões (avatar/abraçar) |

### 🛠️ Utilidades
| Comando | Descrição |
|---|---|
| `/ping` | Responde Pong! |
| `/avatar usuario:@alguem` | Mostra o avatar em tamanho grande (link) |
| `/membros` | Conta membros, bots e humanos |
| `/status` | Latência da API, servidores e usuários |
| `/votar pergunta:... opcoes:a, b, c` | Enquete com botões de voto |
| `/mila` | Quem é a Falta Lua |
| `/lembrete criar tempo:10m mensagem:"..."` | Cria um lembrete |
| `/lembrete listar` | Lista seus lembretes ativos |
| `/lembrete cancelar id:abc123` | Cancela um lembrete pelo ID |

### 📚 Organização
| Comando | Descrição |
|---|---|
| `/configurar ver` | Mostra a configuração atual de canais e anúncios |
| `/configurar permitir canal:#xxx` | Define um canal onde a bot pode falar |
| `/configurar proibir canal:#xxx` | Bloqueia a bot de falar num canal |
| `/configurar liberar canal:#xxx` | Remove um canal da lista de permitidos |
| `/configurar desproibir canal:#xxx` | Remove um canal da lista de proibidos |
| `/configurar anuncio tipo:evento canal:#xxx` | Define o canal de um tipo de anúncio |
| `/configurar limparanuncio tipo:evento` | Remove o canal de um tipo de anúncio |
| `/anuncio tipo:evento mensagem:"..." titulo:"..." mencionar:true` | Envia anúncio classificado no canal do tipo |
| `/organizar` | Painel de organização do servidor |
| `/codex comando:dado` | 📖 O Livro da Lua: todos os comandos, página a página |

### 🛡️ Administração
| Comando | Descrição |
|---|---|
| `/limpar quantidade:10` | Apaga mensagens recentes (confirmação com botões) |
| `/lentidao segundos:5` | Define o modo lento (slowmode) do canal |
| `/aviso mensagem:...` | Atalho de aviso em destaque no canal atual |
| `/seguranca` | Dicas de segurança para servidor e bot |

## 📖 O Livro da Lua (`/codex`)

O comando `/codex` é um **grimório interativo** de todos os comandos da bot, com estética e funcionalidade de livro:

- 📄 Cada comando é uma página (capa + 25 páginas).
- ⏮️ ◀️ ▶️ ⏭️ **Botões** para folhear (primeira, anterior, próxima, última).
- ⤵️ **Menu de seleção** para "pular" direto a um comando (escolha pelo nome).
- 🔎 **Busca aproximada**: `/codex comando:roleta` ou `$codex roleta` — o bot acha o nome mais parecido (Levenshtein) mesmo com erro de digitação.
- O livro some os botões após 5 minutos de inatividade.

Também existe `$codex`, `$livro` e `$comandos` por prefixo, com a mesma navegação.

## 💬 Comandos por prefixo `$`

Além dos slash commands, a bot também responde a mensagens que começam com **`$`** (o antigo prefixo `!` foi trocado por `$`):

| Prefixo | Equivalente | Descrição |
|---|---|---|
| `$ping` | `/ping` | Responde Pong! |
| `$dado 1d20` | `/dado` | Rola dados |
| `$roleta pizza, sushi` | `/roleta` | Sorteia uma opção |
| `$lembrete 10m beber água` | `/lembrete criar` | Cria lembrete |
| `$lembrete listar` | `/lembrete listar` | Lista seus lembretes |
| `$lembrete cancelar abc123` | `/lembrete cancelar` | Cancela um lembrete |
| `$anuncio evento Sexta tem evento!` | `/anuncio` | Anúncio classificado |
| `$configurar ver` | `/configurar ver` | Mostra a configuração |
| `$configurar anuncio evento #canal` | `/configurar anuncio` | Define canal de anúncio |
| `$configurar permitir #canal` | `/configurar permitir` | Libera um canal |
| `$configurar proibir #canal` | `/configurar proibir` | Bloqueia um canal |
| `$organizar` | `/organizar` | Painel de organização |
| `$ajuda` | — | Lista os comandos por prefixo |

> Os comandos por prefixo respeitam as mesmas regras de canais permitidos/proibidos do `/configurar`.
> Para usar prefixo, o bot precisa da intent **Message Content** (já ativada em `index.js`) e da permissão de ler o histórico/canal.

## 🗣️ Decidindo onde a bot fala

Use `/configurar` para controlar os canais:

- **Canais permitidos:** se você adicionar algum, a bot **só** responde nesses canais (e em nenhum outro). Deixe a lista vazia para ela falar em qualquer lugar.
- **Canais proibidos:** a bot nunca fala neles, mesmo que estejam na lista de permitidos.
- O `/configurar` pode ser usado em **qualquer** canal (inclusive proibidos), para você conseguir reajustar as configurações.

## 📣 Anúncios classificados por tipo

Cada tipo de anúncio pode ir para um canal diferente. Os tipos são:

`geral` · `evento` · `regra` · `atualizacao` · `aviso`

1. Defina o canal de cada tipo: `/configurar anuncio tipo:evento canal:#anuncios-eventos`
2. Envie o anúncio: `/anuncio tipo:evento mensagem:"Sexta tem evento!"`
3. A bot entrega o embed no canal certo, com o visual apropriado para o tipo.

## ✨ Personalizando a estética

Todas as cores, ícones e frases-padrão ficam centralizados em `utils/theme.js`. Para ajustar o visual do bot (cores dos embeds, texto do rodapé, etc.), edite apenas esse arquivo — o resto dos comandos já herda automaticamente.