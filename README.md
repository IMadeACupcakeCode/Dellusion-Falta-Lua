# ✧ ⎯ ੭ Falta Lua

Bot de Discord com lembretes, rolagem de dados, roleta de escolhas **e um sistema completo de tickets com tema de circo**, todo estilizado com a identidade visual `✧ ⎯ ੭`.

> ⚠️ **Todos os comandos usam o prefixo `$`.** Não há comandos slash (`/`).

## 🎪 Sistema de Tickets

O bot gerencia tickets automaticamente com estrutura fixa:

### Estrutura de Canais

| Tipo | Canal | ID |
|---|---|---|
| **Lore** 📜 | `#tickets-lore` | `1515754334791405691` |
| **Requisitos** 📋 | `#tickets-requisitos` | `1515754466987606086` |
| **Denúncias** ⚠️ | `#tickets-denuncias` | `1515754530850209913` |
| **Parcerias** 🤝 | `#tickets-parcerias` | `1515754546637307944` |
| **VIP** ⭐ | `#tickets-vip` | `1519234278418812938` |
| **Entrevista** 🎙️ | `#tickets-entrevista` | `1526153633522258020` |
| **Outro** ❓ | `#tickets-outros` | `1515754563565518938` |
| **Log Abertura** ✅ | `#logs-ticket-abertos` | `1515754416043593838` |
| **Log Fechamento** 🔒 | `#logs-ticket-fechados` | `1517743336771817532` |

### Como funciona

1. Usuário clica em uma categoria no painel de tickets
2. Um **canal privado** é criado automaticamente no canal correspondente ao tipo
3. Staff e usuário recebem permissão de acesso
4. Log de abertura é enviado no canal de log
5. Quando fechado (`🔒 Fechar Ticket` ou `$fechar`):
   - Log de fechamento é enviado
   - Permissão do usuário é removida
   - Canal é deletado após 10 segundos

### Embed fixo de ticket

O bot gerencia um **embed fixo no canal `1517455706419232818`**:
- ✅ **Online** → Embed do painel aparece automaticamente
- ✅ **Offline** → Embed é removido (não acumula)
- ✅ **Reconexão** → Embed antigo é substituído pelo novo

## 🔌 Aviso de Desligamento / Online

Configure um canal para receber avisos quando o bot ficar online/offline:

```bash
$configurar off-on #canal
```

Também existe o aviso de shutdown separado:
```bash
$configurar shutdown #canal
```

## 🎲 Comandos disponíveis

| Comando | Descrição |
|---|---|
| `$dado 2d6+3` | Rola dados no formato NdM (`2d6+3`, `4d8-1`...) |
| `$moeda` | Cara ou coroa, com botão para jogar de novo |
| `$roleta pizza, sushi` | Sorteia uma opção entre as listadas |
| `$8ball o bot gosta de mim?` | A bola mágica responde com mistério |
| `$ship @a @b` | Compatibilidade amorosa entre dois membros |
| `$guerra` | Mini guerra de cartas: você vs bot |
| `$roleta_russa` | Roleta russa de 6 câmaras |
| `$abraco @alguem` | Envia um abraço carinhoso |
| `$cartasecreta @a oi` | Entrega uma carta misteriosa no privado |
| `$social @alguem` | Cartão de perfil com botões |
| `$votar pergunta? a, b, c` | Enquete com botões de voto |
| `$lembrete 10m beber água` | Cria um lembrete |
| `$anuncio evento Sexta tem evento!` | Envia anúncio classificado |
| `$configurar ver` | Mostra configuração completa |
| `$configurar permitir #canal` | Libera um canal |
| `$configurar proibir #canal` | Bloqueia um canal |
| `$configurar shutdown #canal` | Define canal de aviso de desligamento |
| `$configurar off-on #canal` | Define canal de aviso online/offline |
| `$configurar ticketcategoria #categoria` | Define categoria de tickets |
| `$organizar` | Painel de organização do servidor |
| `$ticket` | Envia painel de tickets |
| `$fechar` | Fecha o ticket atual |
| `$codex` | 📖 O Livro da Lua (todos os comandos) |

## 📖 O Livro da Lua (`$codex`)

- 📄 Cada comando é uma página (capa + 25 páginas)
- ⏮️ ◀️ ▶️ ⏭️ Botões para folhear
- ⤵️ Menu de seleção para pular para um comando
- 🔎 Busca aproximada: `$codex roleta` (Levenshtein)

## 🛠️ Passo a passo (no VSCode)

### 1. Criar a aplicação do bot no Discord
1. Acesse https://discord.com/developers/applications
2. Clique em **New Application** → dê o nome `✧ ⎯ ੭Falta Lua`
3. Vá em **Bot** → **Reset Token** → copie o token
4. Em **Bot**, ative a opção **Message Content Intent**
5. Vá em **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Mention Everyone`, `Manage Server`
   - Copie o link e abra no navegador para convidar o bot

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e preencha:
- `DISCORD_TOKEN`: o token copiado

### 4. Rodar o bot
```bash
npm start
```

## ✨ Personalização

Todas as cores, ícones e frases-padrão ficam centralizados em `utils/theme.js`. Para ajustar o visual do bot, edite apenas esse arquivo.

## 📁 Estrutura do projeto

```
Dellusion-Falta-Lua/
├── commands/
│   ├── configurar.js      → /configurar (slash)
│   ├── ticket.js           → /ticket (slash)
│   └── ...
├── utils/
│   ├── theme.js           → Cores e embeds padronizados
│   ├── servidorStore.js   → Configurações do servidor
│   ├── ticketStore.js     → Configurações de tickets
│   ├── ticketManager.js   → Lógica de criação/fechamento de tickets
│   ├── fixedTicketEmbed.js → Embed fixo de tickets
│   ├── prefix.js          → Comandos com prefixo $
│   └── codexData.js       → Livro da Lua ($codex)
├── data/                  → JSONs salvos automaticamente
├── imagens/
│   ├── Ticket.png
│   └── nyancat.gif
└── index.js              → Arquivo principal