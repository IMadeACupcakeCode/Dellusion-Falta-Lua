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

// Lista de membros do servidor (cache em memória) para o menu de destinatário.
function listaMembros(guild) {
  const entry = clientCache.get(guild.id);
  let membros = entry && entry.members ? Array.from(entry.members.values()) : Array.from(guild.members.cache.values());
  if (!membros.length) return [];
  return membros.slice(0, 25); // limite de opções do Discord
}

function menuDestinatario(guild, jaEscolhido) {
  const membros = listaMembros(guild);
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cs_alvo')
    .setPlaceholder(jaEscolhido ? 'Trocar destinatário' : '👤 Escolha quem receberá a carta')
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

    // Abre a conversa no privado do autor (só ele enxerga)
    let dm;
    try {
      dm = await autor.send({
        embeds: [
          criarEmbed({
            titulo: '✉️ Carta Secreta — Passo 1/3',
            descricao: 'Escolha abaixo **quem vai receber** a carta. Tudo aqui é privado (no seu DM).',
            cor: THEME.corPrincipal,
          }),
        ],
        components: [menuDestinatario(guild)],
      });
    } catch {
      // Autor com DM fechada: avisa no canal onde o comando foi dado
      if (msgOriginal && msgOriginal.channel) {
        await msgOriginal.channel
          .send({
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

    let destinatarioId = null;
    let conteudo = null;

    const coletor = dm.createMessageComponentCollector({ time: 10 * 60 * 1000, filter: (i) => i.user.id === autor.id });

    coletor.on('collect', async (i) => {
      try {
        // 1️⃣ Escolheu o destinatário
        if (i.customId === 'cs_alvo') {
          destinatarioId = i.values[0];
          const alvo = client.users.cache.get(destinatarioId) || (await client.users.fetch(destinatarioId).catch(() => null));
          if (alvo && alvo.id === autor.id) {
            return i.update({
              embeds: [
                criarEmbed({
                  titulo: '🚫 Destinatário inválido',
                  descricao: 'Você não pode enviar a carta para si mesmo. Escolha outra pessoa.',
                  cor: 0xE67E80,
                }),
              ],
              components: [menuDestinatario(guild, true)],
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

        // Trocar destinatário
        if (i.customId === 'cs_trocar') {
          return i.update({
            embeds: [
              criarEmbed({
                titulo: '✉️ Carta Secreta — Passo 1/3',
                descricao: 'Escolha abaixo **quem vai receber** a carta.',
                cor: THEME.corPrincipal,
              }),
            ],
            components: [menuDestinatario(guild, true)],
          });
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
                  descricao:
                    `**Para:** ${alvo ? alvo.tag : destinatarioId}\n\n` +
                    `> ${conteudo}\n\n` +
                    `Como deseja enviar?`,
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

        // 3️⃣ Escolha de autoria e entrega
        if (i.customId === 'cs_anon' || i.customId === 'cs_assin') {
          const assinar = i.customId === 'cs_assin';
          const alvo = client.users.cache.get(destinatarioId) || (await client.users.fetch(destinatarioId).catch(() => null));

          if (!alvo) {
            return i.update({
              embeds: [criarEmbed({ titulo: 'Destinatário ausente', descricao: 'Não achei o usuário. Recomece com `$cartasecreta`.', cor: 0xE67E80 })],
              components: [],
            });
          }

          const carta = criarEmbed({
            titulo: '✉️ Uma carta misteriosa chegou...',
            descricao: `**Para:** ${alvo.tag}\n\n> ${conteudo}`,
            cor: THEME.corRoleta,
            rodape: assinar ? `Assinado por ${autor.username} 🌙` : `${THEME.nome} entregou discretamente — de alguém que admira você sob a lua 🌙`,
          });

          try {
            await alvo.send({ embeds: [carta] });

            // Notifica o autor no próprio DM, com o conteúdo
            await autor
              .send({
                embeds: [
                  criarEmbed({
                    titulo: '✅ Carta enviada!',
                    descricao:
                      `**Para:** ${alvo.tag}\n` +
                      `**Modo:** ${assinar ? `✍️ Assinada por ${autor.username}` : '🕶️ Anônima'}\n\n` +
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
              embeds: [
                criarEmbed({
                  titulo: 'Não consegui entregar',
                  descricao: `${alvo.username} tem a DM fechada. A carta não foi enviada.`,
                  cor: 0xE67E80,
                }),
              ],
              components: [],
            });
          }
          coletor.stop();
        }
      } catch (err) {
        console.error('Erro no fluxo cartasecreta:', err);
      }
    });

    coletor.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        try {
          await dm.edit({
            embeds: [criarEmbed({ titulo: '⏳ Carta cancelada', descricao: 'Tempo esgotado — nada foi enviado.', cor: 0xE67E80 })],
            components: [],
          });
        } catch {}
      }
    });
  },
};