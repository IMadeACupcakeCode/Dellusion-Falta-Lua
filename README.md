# ✧ ⎯ ੭ Falta Lua

Bot de Discord com lembretes, rolagem de dados, roleta de escolhas **e um sistema de organização de canais e anúncios classificados**, todo estilizado com a identidade visual `✧ ⎯ ੭`.

## 📁 Estrutura do projeto

```
falta-lua-bot/
├── commands/
│   ├── ping.js          → /ping
│   ├── dado.js          → /dado
│   ├── roleta.js         → /roleta
│   ├── lembrete.js       → /lembrete criar | listar | cancelar
│   ├── configurar.js     → /configurar (gerencia canais e anúncios)
│   ├── anuncio.js        → /anuncio (envia avisos classificados)
│   └── organizar.js      → /organizar (painel de organização do servidor)
├── utils/
│   ├── theme.js           → cores e embeds padronizados
│   ├── tempo.js           → interpretação de "10m", "1h30m" etc
│   ├── lembretesStore.js  → salva lembretes em data/lembretes.json
│   ├── agendador.js       → dispara e reagenda lembretes (sobrevive a restarts)
│   └── servidorStore.js   → salva config de canais/anúncios em data/servidores.json
├── data/
│   ├── lembretes.json   (criado automaticamente)
│   └── servidores.json  (criado automaticamente)
├── index.js              → arquivo principal, liga o bot
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

| Comando | Descrição |
|---|---|
| `/dado notacao:1d20` | Rola dados no formato NdM (`2d6+3`, `4d8-1`...) |
| `/roleta opcoes:pizza, sushi, hambúrguer` | Sorteia uma opção entre as listadas |
| `/lembrete criar tempo:10m mensagem:"beber água"` | Cria um lembrete |
| `/lembrete listar` | Lista seus lembretes ativos |
| `/lembrete cancelar id:abc123` | Cancela um lembrete pelo ID |
| `/configurar ver` | Mostra a configuração atual de canais e anúncios |
| `/configurar permitir canal:#xxx` | Define um canal onde a bot pode falar |
| `/configurar proibir canal:#xxx` | Bloqueia a bot de falar num canal |
| `/configurar liberar canal:#xxx` | Remove um canal da lista de permitidos |
| `/configurar desproibir canal:#xxx` | Remove um canal da lista de proibidos |
| `/configurar anuncio tipo:evento canal:#xxx` | Define o canal de um tipo de anúncio |
| `/configurar limparanuncio tipo:evento` | Remove o canal de um tipo de anúncio |
| `/anuncio tipo:evento mensagem:"..." titulo:"..." mencionar:true` | Envia anúncio classificado no canal do tipo |
| `/organizar` | Mostra o painel de organização do servidor |

> ⚠️ `/configurar` e `/anuncio` exigem permissão de **Gerir Servidor**.

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