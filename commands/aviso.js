const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aviso')
    .setDescription('📢 Atalho de aviso em destaque no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((op) => op.setName('mensagem').setDescription('O aviso').setRequired(true)),
  async execute(interaction) {
    const msg = interaction.options.getString('mensagem');
    const embed = criarEmbed({
      titulo: '📢 Aviso',
      descricao: msg,
      cor: THEME.corPrincipal,
      rodape: `Aviso por ${interaction.user.username}`,
    });
    await interaction.reply({ embeds: [embed] });
  },
};