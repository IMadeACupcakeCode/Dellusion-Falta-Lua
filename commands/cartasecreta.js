const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartasecreta')
    .setDescription('✉️ Entrega uma carta misteriosa para um membro')
    .addUserOption((op) => op.setName('usuario').setDescription('Quem recebe').setRequired(true))
    .addStringOption((op) => op.setName('mensagem').setDescription('O que escrever na carta').setRequired(true)),
  async execute(interaction) {
    const alvo = interaction.options.getUser('usuario');
    const msg = interaction.options.getString('mensagem');

    if (alvo.id === interaction.user.id) {
      return interaction.reply({
        embeds: [criarEmbed({ titulo: 'Carta para si?', descricao: 'Escreva para outra pessoa! 🌙', cor: 0xE67E80 })],
        ephemeral: true,
      });
    }

    const confirm = criarEmbed({
      titulo: '✉️ Carta selada',
      descricao: `Sua carta foi entregue para **${alvo.username}** no privado.`,
      cor: THEME.corPrincipal,
    });
    await interaction.reply({ embeds: [confirm], ephemeral: true });

    const carta = criarEmbed({
      titulo: '✉️ Uma carta misteriosa chegou...',
      descricao: `> ${msg}\n\n_— de alguém que admira você sob a lua_ 🌙`,
      cor: THEME.corRoleta,
      rodape: `${THEME.nome} entregou discretamente`,
    });
    try {
      await alvo.send({ embeds: [carta] });
    } catch {
      await interaction.followUp({
        embeds: [criarEmbed({ titulo: 'Não consegui entregar', descricao: `${alvo} tem a DM fechada.`, cor: 0xE67E80 })],
        ephemeral: true,
      });
    }
  },
};