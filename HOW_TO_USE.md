# ✧ ⎯ ੭ Falta Lua — Como Usar

> Bot de Discord para o servidor de roleplay **Dellusion SMP** — uma ferramenta lunar cheia de magia, organização e diversão.

---

## 📋 Índice

1. [Sobre o Bot](#sobre-o-bot)
2. [Comandos de Diversão](#comandos-de-diversão)
3. [Comandos Sociais](#comandos-sociais)
4. [Comandos de Staff](#comandos-de-staff)
5. [Sistema de Tickets](#sistema-de-tickets)
6. [Sistema de Segurança (Omnitrix)](#sistema-de-segurança-omnitrix)
7. [Configuração do Servidor](#configuração-do-servidor)
8. [Abrindo o Livro da Lua (Codex)](#abrindo-o-livro-da-lua-codex)
9. [Perguntas Frequentes](#perguntas-frequentes)

---

## 📜 Sobre o Bot

**Nome:** `✧ ⎯ ੭ Falta Lua`
**Prefixo:** `$` (ex: `$dado 1d20`, `$roleta pizza, sushi, burger`)
**Slash:** A maioria dos comandos também funciona como `/comando`

O bot combina:
- 🎲 Entretenimento (dados, roleta, 8ball, guerra de memes)
- 💬 Interação social (abraços, cartas secretas, ship, perfil)
- 🛡️ Ferramentas de staff (painel de membros, segurança, tickets)
- ⏰ Utilidades (lembretes, enquetes, logs, anúncios)

---

## 🎮 Comandos de Diversão

| Comando | Descrição | Exemplo |
|---|---|---|
| `$dado NdM` ou `/dado` | Rola dados no formato NdM (ex: 1d20, 2d6+3, 4d8-1) | `$dado 1d20` |
| `$roleta op1, op2, ...` ou `/roleta` | Sorteia uma opção aleatória | `$roleta pizza, sushi, burger` |
| `$moeda` ou `/moeda` | Cara ou coroa com botão para jogar de novo | `$moeda` |
| `$8ball pergunta` ou `/8ball` | A bola mágica responde sua pergunta | `$8ball Hoje é meu dia de sorte?` |
| `$ship @user1 @user2` ou `/ship` | Calcula compatibilidade amorosa | `$ship @user1 @user2` |
| `$guerra @oponente` | Batalha de memes 1v1 contra outro usuário ou contra o bot | `$guerra @amigo` |
| `$guerra placar` | Mostra o ranking de vitórias | `$guerra placar` |
| `$roleta_russa` | Roleta russa (5/6 de sobreviver) | `$roleta_russa` |

### Guerra de Memes (`$guerra`)

> Uma batalha 1x1 por reações. Cada jogador começa com **100 HP** e **3 pontos de ação**.

**Reações por turno:**
- `1️⃣ 2️⃣ 3️⃣ 4️⃣` — Atacar com o meme escolhido
- `🛡️` — **Defender**: ganha +1 ponto de ação (máx 5)
- `⚡` — **Especial**: usa arma coletada (custa 3 pontos)
- `🎁` — Aparece eventualmente: reaja para pegar uma arma

**Tipos e efeitos:**
- **Rage Meme** → 🔥 Burn (dano ao longo do tempo)
- **Dank Meme** → 🛡️ Escudo (reduz dano recebido)
- **BR Meme** → 💧 Drain (cura parte do dano)
- **Normie Meme** → ⚡ Stun (inimigo pula o turno)

Cada tipo tem **fraqueza** contra outro (+25% de dano).

---

## 💬 Comandos Sociais

| Comando | Descrição | Exemplo |
|---|---|---|
| `$abraco @user` ou `/abraco` | Envia um abraço carinhoso | `$abraco @amigo` |
| `$social [@user]` ou `/social` | Cartão de perfil do usuário | `$social @amigo` |
| `$avatar [@user]` ou `/avatar` | Mostra o avatar em tamanho grande | `$avatar @amigo` |
| `$cartasecreta @user msg` ou `/cartasecreta` | Envia uma carta anônima ou assinada no privado do destinatário | `$cartasecreta` |
| `$ship @user1 @user2` | Calcula compatibilidade amorosa | `$ship @pessoa1 @pessoa2` |

### Cartas Secretas (`$cartasecreta`)

O comando abre sua DM com um assistente interativo:

1. **Passo 1/3** — Escolha o destinatário na lista
2. **Passo 2/3** — Escreva o conteúdo da carta (máx 2000 caracteres)
3. **Passo 3/3** — Escolha **Anônimo** 🕶️ ou **Assinar** ✍️

A carta é entregue diretamente na DM do destinatário. Suas cartas enviadas ficam salvas no outbox.

---

## 🛠️ Comandos de Staff

| Comando | Descrição | Permissão |
|---|---|---|
| `$anuncio tipo msg` ou `/anuncio` | Envia anúncio classificado no canal configurado | Manage Server |
| `$configurar ...` ou `/configurar` | Configura canais, permissões e ticket | Manage Server |
| `$membros` ou `/membros` | Painel completo de membros do servidor | Staff |
| `$securitybreach` ou `/securitybreach` | Painel de segurança em tempo real | Staff |
| `$omnitrix` ou `/omnitrix` | Manual de segurança e histórico de membros | Staff |
| `$buscar` ou `/buscar` | Busca de membro estilo Google (autocomplete) | Staff |
| `$logs [pessoa]` ou `/logs` | Mostra logs da bot, filtráveis por pessoa | Staff |
| `$lentidao segundos` ou `/lentidao` | Define slowmode do canal | Manage Messages |
| `$limpar quantidade` ou `/limpar` | Limpa mensagens com confirmação | Manage Messages |
| `$aviso mensagem` ou `/aviso` | Destaque rápido no chat | Manage Server |
| `$organizar` ou `/organizar` | Painel de organização do servidor | Staff |

### Painel SecurityBreach (`$securitybreach`)

> Visão geral completa do servidor com filtros em tempo real.

**Filtros disponíveis:**
- 📋 Todos — todos os membros do cache
- 🟢 Online — só quem está online/idle/dnd
- ⚪ Offline — offline ou invisível
- 🤖 Bots — só bots
- 👑 Staff — cargos de staff
- 👤 Membros — humanos comuns
- 🚨 Suspeitos — com histórico de risco

**Botões:** 🔍 Buscar (por nome/tag/ID) · 🔄 Recarregar · 👤 Ver detalhes

### Omnitrix — Manual de Segurança (`$omnitrix`)

> Centro de controle de segurança. Busque termos no manual, selecione membros para ver histórico completo, marque suspeitos e registre suspensões.

O histórico inclui:
- 🚫 Suspensões registradas (servidor e Discord)
- 📜 Log de eventos
- 🚨 Suspeitas anotadas
- ⚠️ Sinais de risco (conta nova, etc.)
- 📌 Marcações no servidor

---

## 🎫 Sistema de Tickets

> Sistema com tema de **circo/picadeiro** para gerenciar solicitações.

### Tipos de Ticket
- 📜 Lore
- 📋 Requisitos
- ⚠️ Denúncias
- 🤝 Parcerias
- ⭐ VIP
- 🎙️ Entrevista
- ❓ Outro Motivo

### Comandos de Configuração

| Comando | Descrição |
|---|---|
| `$ticket` | Envia o painel de tickets no canal atual |
| `$ticket config #categoria` | Define categoria padrão |
| `$ticket categoria <tipo> #categoria` | Define categoria específica por tipo |
| `$ticket staff add @cargo` | Adiciona cargo de staff |
| `$ticket staff remove @cargo` | Remove cargo de staff |
| `$ticket invite @usuario` | Convida usuário para ver o ticket |
| `$ticket ver` | Ver configuração atual |
| `$fechar` | Fecha o ticket do canal atual |

### Fluxo de um Ticket
1. Usuário clica em uma categoria no painel
2. Um canal privado `ticket-XXXX-username` é criado
3. Staff pode **Reivindicar** (🎪) o ticket para atendê-lo
4. Após atendimento, **Fechar** (🔒) o ticket
5. Após 10 segundos o canal é deletado

---

## 🔒 Sistema de Segurança (Omnitrix)

> Monitoramento de membros com snapshot, suspeitas e histórico de suspensões.

### Funcionalidades

- **Snapshot automático** — O painel SecurityBreach salva um instantâneo de todos os membros
- **Avaliação de risco** — Contas com menos de 7 dias ou bots são sinalizadas
- **Marcação de suspeitos** — Staff pode marcar membros como suspeitos
- **Registro de suspensões** — Histórico de banimentos/kicks/timeouts
- **Cache de presença** — Status em tempo real (online, idle, dnd, offline)

### Características especiais
- Dados cruzados entre servidor e Discord (suspensões internas e externas)
- Histórico completo por membro
- Heurística de risco automática

---

## ⚙️ Configuração do Servidor

O comando `$configurar` gerencia toda a configuração do servidor:

| Subcomando | Descrição |
|---|---|
| `$configurar ver` | Mostra configuração atual |
| `$configurar permitir #canal` | Adiciona canal à whitelist |
| `$configurar liberar #canal` | Remove da whitelist |
| `$configurar proibir #canal` | Adiciona à blacklist |
| `$configurar desproibir #canal` | Remove da blacklist |
| `$configurar anuncio <tipo> #canal` | Define canal de anúncio |
| `$configurar limparanuncio <tipo>` | Remove canal de anúncio |
| `$configurar shutdown #canal` | Canal de notificação de desligamento |
| `$configurar off-on #canal` | Canal de notificação online/offline |
| `$configurar ticketcategoria #categoria` | Categoria para tickets |

**Tipos de anúncio:** geral, evento, regra, atualizacao, aviso

---

## 📖 Abrindo o Livro da Lua (Codex)

`$codex` ou `/codex` abre o **Livro da Lua** — um grimório interativo com todos os comandos.

- Use `⏮️ ◀️ ▶️ ⏭️` para navegar pelas páginas
- Use o menu `⤵️` para pular direto a um comando
- Use `$codex <termo>` para buscar o comando mais próximo

O livro organiza os comandos em **5 seções:**
1. 🎲 Diversão — dados, roleta, 8ball, guerra, moeda
2. 💬 Social — abraços, cartas, ship, avatar, perfil
3. ⏰ Utilitários — lembretes, status, ping, codex
4. 📋 Organização — configurar, anunciar, organizar
5. ⚙️ Admin — tickets, segurança, logs, membros

---

## ❓ Perguntas Frequentes

### O bot não responde!
Verifique se:
1. O bot está online (verde no topo do servidor)
2. Você usou o prefixo `$` antes do comando
3. O canal não está bloqueado (`$configurar ver`)

### Como faço para a bot parar de responder num canal?
Use `$configurar proibir #canal` para bloquear.

### A carta secreta não chegou?
O destinatário pode ter a DM fechada. O bot avisa se não conseguir entregar.

### O ticket não abre?
Verifique se:
1. A categoria foi configurada (`$ticket config #categoria`)
2. O bot tem permissão para criar canais na categoria
3. A categoria não está cheia (limite do Discord)

### Como resetar a configuração?
Use `$configurar` para ajustar cada item individualmente. Não há um reset geral.

---

> ✧ ⎯ ੭ Falta Lua — iluminando seu servidor sob a lua 🌙
