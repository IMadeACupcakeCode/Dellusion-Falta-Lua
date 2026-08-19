# 📺 Transmissão no Falta Lua — Guia de uso

Este projeto tem **dois** sistemas de transmissão, portados do mesmo sistema usado
pela Mila Cake:

| Comando | O que faz |
|---|---|
| `$stream` | **Relé de voz** — a bot entra na chamada e retransmite o áudio de quem fala |
| `$tela` | **Sala de Tela** — compartilhamento de tela de verdade, via atividade do Discord ou link |

> 💡 Em qualquer um: `$stream ajuda` e `$tela ajuda` mostram um guia direto no chat.
> `$codex` também lista os dois.

---

## 🎤 `$stream` — Relé de voz

### Para membros
1. Entre num **canal de voz**.
2. Rode `$stream` e escolha **Janela**, **Monitor** ou **Desktop**.
3. Ao entrar, a bot fala **"Estou a funcionar"** para avisar.
4. A partir daí, **quem falar na chamada é captado e retransmitido** — a bot vira
   um relé de áudio.

**Avisos importantes:**
- A bot **ignora a sua voz** e a de **bots** — só retransmite os outros.
- **Risco de eco:** quem estiver perto do emissor pode ouvir a própria voz com
  atraso. É o limite físico do relé.
- Quem falar na chamada **está sendo retransmitido** — todos ouvem. Use com
  o consentimento de quem está na call.
- Use `$stream` de novo para ver o painel com **📊 Status** e **🔇 Desconectar**.

> 🔒 Isso usa a **API oficial** do Discord (`@discordjs/voice`). **Não é selfbot**
> e não há risco de banimento.

### Para o dono
- Precisa das dependências: `@discordjs/voice`, `ffmpeg-static`,
  `libsodium-wrappers` (já no `package.json`; rode `npm install`).
- A intent **GuildVoiceStates** precisa estar ativa (não é privilegiada).
- A bot usa **Windows SAPI** (voz "Microsoft Maria", pt-BR) para o aviso e
  PowerShell/C# para listar janelas/monitores — é Windows-only por design.

---

## 🖥️ `$tela` — Sala de Tela (compartilhamento de tela)

Um sistema **separado** (pasta `discord-screen/`) que roda como uma *Activity* do
Discord: uma pessoa mostra a tela, todo mundo que está na call assiste — dentro do
Discord (foguete 🚀) **ou** pelo link público.

### Para membros
1. Entre num **canal de voz**.
2. Clique no **foguete 🚀** na barra de baixo do Discord.
3. Abra a atividade **Sala de Tela**.
4. Clique em **Compartilhar tela** e escolha **o que mostrar**.
5. Todo mundo que está na call assiste na hora.

**Fora do Discord:** abra o link público (mostrado em `$tela`) no navegador e
crie uma sala.

**Dicas:**
- Para **transmitir**, use **Chrome, Edge ou Brave** num **desktop**. Celular não
  deixa capturar a tela (só assistir, e às vezes nem isso).
- Para ter **som**, compartilhe uma **aba** (YouTube, Twitch, etc.) e marque o
  áudio. **Tela inteira transmite sem som** — evita eco da call.
- Se a atividade abrir em **branco**, o endereço do túnel mudou — peça ao staff
  para atualizar o **Target** no portal do Discord.

### Para o dono — subir a Sala de Tela

Cada bot tem a **sua própria cópia** de `discord-screen/`. Dentro desta pasta:

```bash
npm install
npm run start:fast
```

O `start:fast` faz tudo sozinho: pergunta o que faltar, monta o site, abre um
endereço público (túnel) e liga o servidor. Ele grava `PUBLIC_ORIGIN` no `.env`.

**Uma vez só no portal do Discord** (a mesma aplicação do bot):
1. **OAuth2 → Redirects**: adicione `SUA-ORIGEM/auth/callback`.
2. **Activities → Settings**: ative **Enable Activities**.
3. **Activities → URL Mappings**: Prefix `/` → Target = endereço sem `https://`.
4. **Instalar**: `https://discord.com/oauth2/authorize?client_id=SEU-CLIENT-ID`.

> O endereço público muda a cada reinício (túnel descartável). Para um endereço
> **fixo**, rode `npm run tunel:criar` (precisa de um domínio seu na Cloudflare) —
> aí nunca mais mexe no portal.

`$tela` mostra o endereço atual e faz um health check do servidor.

---

## ⚙️ Notas de arquitetura

- **Uma cópia por bot**: Mila Cake e Falta Lua têm **instâncias independentes** de
  `discord-screen/`, com `.env` e Client ID próprios. O comando `$tela` de cada bot
  lê o `.env` **da sua própria** `discord-screen/` e serve os membros dela.
- **Automatização idêntica à Mila**: `npm run start:fast` configura → builda →
  sobe o túnel → grava o endereço → liga o servidor. O `$tela` se conecta ao app
  (`/api/health`) para mostrar estado em tempo real.
- **Relé de voz (`$stream`)** usa a API pública `receiver.subscribe` do
  `@discordjs/voice` — sem selfbot.
- O app `discord-screen/` tem seu próprio README com mais detalhes de hospedagem
  (VPS, Docker) em `discord-screen/README.md`.
