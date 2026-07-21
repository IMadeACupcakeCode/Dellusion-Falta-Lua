const fs = require('fs');
const path = require('path');
const { criarEmbedPainel, criarBotoesPainel } = require('./ticketManager');

/** Canal fixo onde o embed de ticket deve ficar */
const CANAL_FIXO_ID = '1517455706419232818';

/** Cache local do ID da mensagem do embed fixo */
const CAMINHO_CACHE = path.join(__dirname, '..', 'data', 'fixedEmbedCache.json');

function lerCache() {
  try {
    if (fs.existsSync(CAMINHO_CACHE)) {
      return JSON.parse(fs.readFileSync(CAMINHO_CACHE, 'utf-8'));
    }
  } catch {
    // ignorar
  }
  return {};
}

function salvarCache(dados) {
  const pasta = path.dirname(CAMINHO_CACHE);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(CAMINHO_CACHE, JSON.stringify(dados, null, 2), 'utf-8');
}

/**
 * Envia (ou substitui) o embed de ticket fixo no canal específico.
 * Remove qualquer embed antigo enviado pelo bot antes de postar o novo.
 */
async function enviarEmbedTicketFixo(client) {
  try {
    const canal = await client.channels.fetch(CANAL_FIXO_ID);
    if (!canal) return;

    const cache = lerCache();
    const msgIdAntiga = cache.mensagemId;

    // Remove embed antigo salvo em cache
    if (msgIdAntiga) {
      try {
        const msgAntiga = await canal.messages.fetch(msgIdAntiga).catch(() => null);
        if (msgAntiga && msgAntiga.author.id === client.user.id) {
          await msgAntiga.delete();
        }
      } catch {
        // mensagem já pode ter sido deletada
      }
    }

    // Limpa qualquer outra mensagem do bot que tenha sobrado (caso de crash sem cleanup)
    try {
      const mensagens = await canal.messages.fetch({ limit: 50 });
      const minhasMsgs = mensagens.filter(
        (m) => m.author.id === client.user.id && m.id !== msgIdAntiga
      );
      for (const [, msg] of minhasMsgs) {
        await msg.delete().catch(() => {});
      }
    } catch {
      // ignorar erros de permissão
    }

    // Envia o novo embed do painel de tickets
    const { embed, arquivo } = criarEmbedPainel();
    const botoes = criarBotoesPainel();

    const mensagem = await canal.send({
      embeds: [embed],
      components: botoes,
      files: [{ attachment: arquivo, name: 'Ticket.png' }],
    });

    // Salva ID da nova mensagem para remoção futura
    salvarCache({
      mensagemId: mensagem.id,
      guildId: canal.guildId,
    });

    console.log(`✧ Embed de ticket fixo enviado/atualizado no canal ${CANAL_FIXO_ID}`);
  } catch (erro) {
    console.error('Erro ao enviar embed fixo de ticket:', erro);
  }
}

/**
 * Remove o embed de ticket fixo do canal (usado no desligamento).
 */
async function removerEmbedTicketFixo(client) {
  try {
    const canal = await client.channels.fetch(CANAL_FIXO_ID).catch(() => null);
    if (!canal) return;

    const cache = lerCache();
    const msgId = cache.mensagemId;

    if (msgId) {
      try {
        const msg = await canal.messages.fetch(msgId).catch(() => null);
        if (msg && msg.author.id === client.user.id) {
          await msg.delete();
          console.log(`✧ Embed de ticket fixo removido do canal ${CANAL_FIXO_ID}`);
        }
      } catch {
        // mensagem já pode ter sido deletada
      }
    }

    // Limpa cache
    salvarCache({});
  } catch (erro) {
    console.error('Erro ao remover embed fixo de ticket:', erro);
  }
}

module.exports = {
  enviarEmbedTicketFixo,
  removerEmbedTicketFixo,
  CANAL_FIXO_ID,
};