const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('🖼️ Mostra o avatar de um usuário em tamanho grande')
    .addUserOption((op) => op.setName('usuario').setDescription('Membro').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const url = user.displayAvatarURL({ size: 512 });
    const embed = criarEmbed({
      titulo: `🖼️ Avatar de ${user.username}`,
      descricao: `[🔗 Abrir em tela cheia](${url})`,
      cor: THEME.corPrincipal,
    }).setImage(url);

    const row = new ActionRowBuilder().addComponents(
      botao('🔗 Link', 'avatar_link', ButtonStyle.Link, '🔗').setURL(url)
    );
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};