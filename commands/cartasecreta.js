const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { clientCache } = require('../utils/cache');

const POR_PAGINA = 12;
const EMOJI_ANT = '◀️';
const EMOJI_PROX = '▶️';

// Todos os membros do servidor (cache em memória) — sem limite de 25.
function todosMembros(guild) {
  const entry = clientCache.get(guild.id);
  let membros = entry && entry.members ? Array.from(entry.members.values()) : Array.from(guild.members.cache.values());
  return membros || [];
}

// Menu de escolha sincronizado com a página atualmente exibida (máx. 25 opções).
function menuDestinatario(paginaMembros) {
  const membros = (paginaMembros || []).slice(0, 25);
  if (!membros.length) return null;
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cs_alvo')
    .setPlaceholder('👤 Escolha quem receberá a carta (lista ao lado)')
    .addOptions(
      membros.map((m) => ({
        label: m.user.username.slice(0, 100),
        value: m.user.id,
        description: m.user.bot ? '🤖 Bot' : '👤 Humano',
        emoji: m.user.bot ? '🤖' : '👤',
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

function modalConteudo() {
  return new ModalBuilder()
    .setCustomId('cs_conteudo_modal')
    .setTitle('✍️ Escreva sua carta secreta')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('cs_conteudo')
          .setLabel('Conteúdo da carta')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Escreva aqui o que será entregue no privado do destinatário...')
          .setRequired(true)
          .setMaxLength(2000)
      )
    );
}

function modalAutor() {
  return new ModalBuilder()
    .setCustomId('cs_autor_modal')
    .setTitle('✍️ Como assinar a carta?')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('cs_autor')
          .setLabel('Nome do autor (como deve aparecer)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Um admirador secreto, Fulano, etc.')
          .setRequired(true)
          .setMaxLength(80)
      )
    );
}

module.exports = {
  data: { name: 'cartasecreta', description: '✉️ Entrega uma carta misteriosa para um membro' },
  async execute(interaction) {
    const autor = interaction.user;
    const guild = interaction.guild;
    const client = interaction.client;
    const msgOriginal = interaction.message; // mensagem `$cartasecreta ...` no canal

    // 🔒 Privacidade: apaga a mensagem pública do comando imediatamente
    if (msgOriginal && msgOriginal.deletable) {
      try {
        await msgOriginal.delete();
      } catch {
        // sem permissão / já sumiu — segue
      }
    }

    // ✨ Mensagem de "carregando" animada para não aparecer o "Demorando para responder"
    const pontos = ['·', '··', '···', '····'];
    let pi = 0;
    const loadingMsg = await interaction.reply({
      embeds: [
        criarEmbed({
          titulo: '✉️ Preparando sua carta secreta...',
          descricao: `🌙 Selando o envelope${pontos[0]}`,
          cor: THEME.corPrincipal,
        }),
      ],
      fetchReply: true,
    });
    const loadingTimer = setInterval(() => {
      pi = (pi + 1) % pontos.length;
      loadingMsg
        .edit({
          embeds: [
            criarEmbed({
              titulo: '✉️ Preparando sua carta secreta...',
              descricao: `🌙 Selando o envelope${pontos[pi]}`,
              cor: THEME.corPrincipal,
            }),
          ],
        })
        .catch(() => {});
    }, 600);

    const membros = todosMembros(guild);
    if (!membros.length) {
      // Tenta popular sob demanda se estiver vazio
      try {
        const fetched = await guild.members.fetch({ withPresences: false });
        membros.push(...Array.from(fetched.values()));
      } catch {}
    }

    clearInterval(loadingTimer);

    const total = membros.length;
    const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    let pagina = 0;
    let destinatarioId = null;
    let conteudo = null;

    function renderLista() {
      pagina = Math.min(Math.max(0, pagina), totalPaginas - 1);
      const fatia = membros.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);
      const linhas = fatia.length
        ? fatia.map((m, i) => `${i + 1}. ${m.user.bot ? '🤖' : '👤'} \`${m.user.username}\` — \`${m.user.id}\``).join('\n')
        : 'Nenhum membro encontrado.';

      const embed = criarEmbed({
        titulo: '✉️ Carta Secreta — Passo 1/3',
        descricao:
          `**Escolha quem receberá a carta.** Reaja com ${EMOJI_ANT}/${EMOJI_PROX} para navegar, ou use o menu abaixo (sincronizado com esta lista).\n\n` +
          linhas,
        cor: THEME.corPrincipal,
        rodape: `Página ${pagina + 1}/${totalPaginas} • ${total} membros`,
      });
      const row = menuDestinatario(fatia);
      const comps = row ? [row] : [];
      return { embed, comps };
    }

    // Abre a conversa no privado do autor (só ele enxerga)
    let dm;
    try {
      const { embed, comps } = renderLista();
      dm = await autor.send({ embeds: [embed], components: comps });
    } catch {
      if (loadingMsg && loadingMsg.channel) {
        await loadingMsg
          .edit({
            embeds: [
              criarEmbed({
                titulo: 'Não consegui abrir o privado',
                descricao: `${autor}, sua DM está fechada. Abra as mensagens diretas para usar a carta secreta.`,
                cor: 0xE67E80,
              }),
            ],
          })
          .catch(() => {});
      }
      return;
    }

    // Aviso de sucesso no canal some logo após abrir a DM (mantém privacidade)
    if (loadingMsg) {
      try {
        await loadingMsg.edit({
          embeds: [
            criarEmbed({
              titulo: '✨ Carta a caminho...',
              descricao: '🌙 Envelope selado e entregue no seu privado. Confira sua DM!',
              cor: THEME.corSucesso,
            }),
          ],
        });
        setTimeout(() => loadingMsg.delete().catch(() => {}), 4000);
      } catch {}
    }

    // Reações de navegação
    try {
      await dm.react(EMOJI_ANT);
      await dm.react(EMOJI_PROX);
    } catch {}

    let reagindo = true;
    const reactionCollector = dm.createReactionCollector({
      time: 10 * 60 * 1000,
      filter: (reaction, user) => user.id === autor.id && (reaction.emoji.name === EMOJI_ANT || reaction.emoji.name === EMOJI_PROX),
    });

    reactionCollector.on('collect', async (reaction) => {
      if (!reagindo) return;
      if (reaction.emoji.name === EMOJI_PROX) pagina = Math.min(totalPaginas - 1, pagina + 1);
      else if (reaction.emoji.name === EMOJI_ANT) pagina = Math.max(0, pagina - 1);
      const { embed, comps } = renderLista();
      try {
        await dm.edit({ embeds: [embed], components: comps });
      } catch {}
      // Remove a reação do autor para poder clicar de novo
      try {
        await reaction.users.remove(autor.id);
      } catch {}
    });

    const coletor = dm.createMessageComponentCollector({ time: 10 * 60 * 1000, filter: (i) => i.user.id === autor.id });

    coletor.on('collect', async (i) => {
      try {
        // 1️⃣ Escolheu o destinatário (sincronizado com a lista visível)
        if (i.customId === 'cs_alvo') {
          reagindo = false;
          reactionCollector.stop();
          try {
            await dm.reactions.removeAll();
          } catch {}

          destinatarioId = i.values[0];
          const alvo = client.users.cache.get(destinatarioId) || (await client.users.fetch(destinatarioId).catch(() => null));
          if (alvo && alvo.id === autor.id) {
            return i.update({
              embeds: [criarEmbed({ titulo: '🚫 Destinatário inválido', descricao: 'Você não pode enviar a carta para si mesmo. Escolha outra pessoa na lista.', cor: 0xE67E80 })],
              components: [menuDestinatario(membros.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA))],
            });
          }
          const nome = alvo ? alvo.username : destinatarioId;
          return i.update({
            embeds: [
              criarEmbed({
                titulo: '✉️ Carta Secreta — Passo 2/3',
                descricao: `**Destinatário:** ${nome}\n\nAgora clique no botão para **escrever o conteúdo** da carta.`,
                cor: THEME.corPrincipal,
              }),
            ],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('cs_trocar').setLabel('🔄 Trocar destinatário').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('cs_escrever').setLabel('✍️ Escrever conteúdo').setStyle(ButtonStyle.Primary).setEmoji('✍️')
              ),
            ],
          });
        }

        // Trocar destinatário -> volta para a lista
        if (i.customId === 'cs_trocar') {
          reagindo = true;
          const { embed, comps } = renderLista();
          await i.update({ embeds: [embed], components: comps });
          try {
            await dm.react(EMOJI_ANT);
            await dm.react(EMOJI_PROX);
          } catch {}
          return;
        }

        // 2️⃣ Abrir modal de conteúdo
        if (i.customId === 'cs_escrever') {
          await i.showModal(modalConteudo());
          try {
            const submitted = await i.awaitModalSubmit({ filter: (m) => m.user.id === autor.id, time: 10 * 60 * 1000 });
            conteudo = submitted.fields.getTextInputValue('cs_conteudo');
            const alvo = client.users.cache.get(destinatarioId) || (await client.users.fetch(destinatarioId).catch(() => null));
            await submitted.update({
              embeds: [
                criarEmbed({
                  titulo: '✉️ Carta Secreta — Passo 3/3',
                  descricao: `**Para:** ${alvo ? alvo.tag : destinatarioId}\n\n> ${conteudo}\n\nComo deseja enviar?`,
                  cor: THEME.corRoleta,
                }),
              ],
              components: [
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setCustomId('cs_anon').setLabel('🕶️ Anônimo').setStyle(ButtonStyle.Secondary).setEmoji('🕶️'),
                  new ButtonBuilder().setCustomId('cs_assin').setLabel('✍️ Assinar').setStyle(ButtonStyle.Primary).setEmoji('✍️')
                ),
              ],
            });
          } catch {
            // modal expirou
          }
          return;
        }

        // 3️⃣ Escolha de autoria: anônimo segue direto; assinar pede o nome
        if (i.customId === 'cs_anon') {
          await entregar(i, false, null);
          coletor.stop();
          return;
        }

        if (i.customId === 'cs_assin') {
          await i.showModal(modalAutor());
          try {
            const submitted = await i.awaitModalSubmit({ filter: (m) => m.user.id === autor.id, time: 10 * 60 * 1000 });
            const nomeAutor = (submitted.fields.getTextInputValue('cs_autor') || '').trim().slice(0, 80) || autor.username;
            await entregar(i, true, nomeAutor);
            coletor.stop();
          } catch {
            // modal expirou
          }
          return;
        }
      } catch (err) {
        console.error('Erro no fluxo cartasecreta:', err);
      }
    });

    coletor.on('end', () => {
      try {
        reactionCollector.stop();
      } catch {}
    });
    reactionCollector.on('end', async () => {
      try {
        await dm.reactions.removeAll();
      } catch {}
    });

    // Função de entrega reutilizável (anon / assinado com nome custom)
    async function entregar(i, assinar, nomeAutor) {
      const alvo = client.users.cache.get(destinatarioId) || (await client.users.fetch(destinatarioId).catch(() => null));

      if (!alvo) {
        return i.update({
          embeds: [criarEmbed({ titulo: 'Destinatário ausente', descricao: 'Não achei o usuário. Recomece com `$cartasecreta`.', cor: 0xE67E80 })],
          components: [],
        });
      }

      const assinatura = assinar ? nomeAutor : `${THEME.nome} entregou discretamente — de alguém que admira você sob a lua 🌙`;

      const carta = criarEmbed({
        titulo: '✉️ Uma carta misteriosa chegou...',
        descricao: `**Para:** ${alvo.tag}\n\n> ${conteudo}`,
        cor: THEME.corRoleta,
        rodape: assinatura,
      });

      try {
        await alvo.send({ embeds: [carta] });
        await autor
          .send({
            embeds: [
              criarEmbed({
                titulo: '✅ Carta enviada!',
                descricao:
                  `**Para:** ${alvo.tag}\n` +
                  `**Modo:** ${assinar ? `✍️ Assinada por ${nomeAutor}` : '🕶️ Anônima'}\n\n` +
                  `**Conteúdo enviado:**\n> ${conteudo}`,
                cor: THEME.corSucesso,
              }),
            ],
          })
          .catch(() => {});

        await i.update({
          embeds: [criarEmbed({ titulo: '✅ Enviada!', descricao: `Carta entregue para **${alvo.username}** ${assinar ? 'assinada' : 'anonimamente'}. Confira seu DM. 🌙`, cor: THEME.corSucesso })],
          components: [],
        });
      } catch {
        await i.update({
          embeds: [criarEmbed({ titulo: 'Não consegui entregar', descricao: `${alvo.username} tem a DM fechada. A carta não foi enviada.`, cor: 0xE67E80 })],
          components: [],
        });
      }
    }
  },
};
