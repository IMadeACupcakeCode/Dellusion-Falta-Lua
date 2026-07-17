const { criarEmbed, THEME } = require('../utils/theme');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: { name: 'cartasecreta', description: '✉️ Entrega uma carta misteriosa para um membro' },
  async execute(interaction) {
    const autor = interaction.user;
    const alvo = interaction.options.getUser('usuario');
    const msg = interaction.options.getString('mensagem');

    if (!alvo || !msg) {
      return interaction.reply({
        embeds: [criarEmbed({ titulo: 'Faltam dados', descricao: 'Use: `$cartasecreta @usuário sua mensagem`', cor: 0xE67E80 })],
      });
    }

    if (alvo.id === autor.id) {
      return interaction.reply({
        embeds: [criarEmbed({ titulo: 'Carta para si?', descricao: 'Escreva para outra pessoa! 🌙', cor: 0xE67E80 })],
      });
    }

    // 🔒 Privacidade: apaga a mensagem original do autor assim que o bot responde
    if (interaction.message && interaction.message.deletable) {
      try {
        await interaction.message.delete();
      } catch {
        // sem permissão ou já somiu — segue mesmo assim
      }
    }

    // Preview neutro no canal (não expõe o conteúdo) com a escolha de autoria
    const preview = criarEmbed({
      titulo: '✉️ Carta selada pronta',
      descricao: `Destinatário: **${alvo.username}**\n\nComo deseja enviar a carta?`,
      cor: THEME.corPrincipal,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cs_anon').setLabel('🕶️ Anônimo').setStyle(ButtonStyle.Secondary).setEmoji('🕶️'),
      new ButtonBuilder().setCustomId('cs_assin').setLabel('✍️ Assinar').setStyle(ButtonStyle.Primary).setEmoji('✍️')
    );

    const resposta = await interaction.reply({ embeds: [preview], components: [row], fetchReply: true });

    const coletor = resposta.createMessageComponentCollector({ time: 5 * 60 * 1000, filter: (i) => i.user.id === autor.id });

    async function entregar(assinar) {
      const carta = criarEmbed({
        titulo: '✉️ Uma carta misteriosa chegou...',
        descricao: `**Para:** ${alvo.tag}\n\n> ${msg}`,
        cor: THEME.corRoleta,
        rodape: assinar ? `Assinado por ${autor.username} 🌙` : `${THEME.nome} entregou discretamente — de alguém que admira você sob a lua 🌙`,
      });

      try {
        await alvo.send({ embeds: [carta] });
        const ok = criarEmbed({
          titulo: '✅ Carta entregue',
          descricao: `Sua carta foi enviada para **${alvo.username}** ${assinar ? `assinada por **${autor.username}**` : 'de forma anônima'}.`,
          cor: THEME.corSucesso,
        });
        await resposta.edit({ embeds: [ok], components: [] });
      } catch {
        const falhou = criarEmbed({
          titulo: 'Não consegui entregar',
          descricao: `${alvo.username} tem a DM fechada. A carta não foi enviada.`,
          cor: 0xE67E80,
        });
        await resposta.edit({ embeds: [falhou], components: [] });
      }
    }

    coletor.on('collect', async (i) => {
      if (i.customId === 'cs_anon') {
        await entregar(false);
        coletor.stop();
      } else if (i.customId === 'cs_assin') {
        await entregar(true);
        coletor.stop();
      }
    });

    coletor.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        try {
          await resposta.edit({
            embeds: [criarEmbed({ titulo: '⏳ Carta cancelada', descricao: 'Tempo esgotado — ninguém recebeu a carta.', cor: 0xE67E80 })],
            components: [],
          });
        } catch {}
      }
    });
  },
};