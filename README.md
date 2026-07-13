# ✧ ⎯ ੭ Falta Lua

Bot de Discord com lembretes, rolagem de dados e roleta de escolhas, todo estilizado com a identidade visual `✧ ⎯ ੭`.

## 📁 Estrutura do projeto

```
falta-lua-bot/
├── commands/
│   ├── dado.js        → /dado
│   ├── lembrete.js     → /lembrete criar | listar | cancelar
│   └── roleta.js       → /roleta
├── utils/
│   ├── theme.js         → cores e embeds padronizados
│   ├── tempo.js          → interpretação de "10m", "1h30m" etc
│   ├── lembretesStore.js → salva lembretes em data/lembretes.json
│   └── agendador.js      → dispara e reagenda lembretes (sobrevive a restarts)
├── data/
│   └── lembretes.json  (criado automaticamente)
├── index.js             → arquivo principal, liga o bot
├── deploy-commands.js   → registra os comandos slash no Discord
├── .env.example
└── package.json
```

## 🛠️ Passo a passo (no VSCode)

### 1. Criar a aplicação do bot no Discord
1. Acesse https://discord.com/developers/applications
2. Clique em **New Application** → dê o nome `✧ ⎯ ੭Falta Lua`
3. Vá em **Bot** → **Reset Token** → copie o token (isso vai no `.env`)
4. Em **Bot**, ative os intents que você usar no futuro (não precisamos de nenhum privilegiado para os comandos atuais)
5. Vá em **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
   - Copie o link gerado e abra no navegador para convidar o bot ao servidor

### 2. Instalar dependências
No terminal do VSCode, dentro da pasta do projeto:

```bash
npm install
```

### 3. Configurar variáveis de ambiente
Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

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

## ✨ Personalizando a estética

Todas as cores, ícones e frases-padrão ficam centralizados em `utils/theme.js`. Para ajustar o visual do bot (cores dos embeds, texto do rodapé, etc.), edite apenas esse arquivo — o resto dos comandos já herda automaticamente.