const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder().setName('roleta_russa').setDescription('🔫 Uma roleta russa de 6 câmaras. Você sobrevive?'),
  async execute(interaction) {
    const sobreviveu = Math.random() < 5 / 6;
    const embed = criarEmbed({
      titulo: sobreviveu ? '🔫 *click* ... 💨' : '💥 🔫 *BANG*',
      descricao: sobreviveu
        ? 'A câmara estava vazia. **Você sobreviveu!** 🌙'
        : 'A câmara estava carregada. **Você não sobreviveu...** desta vez. 🌑',
      cor: sobreviveu ? THEME.corSucesso : 0xE67E80,
      rodape: `${THEME.nome} girou o tambor para ${interaction.user.username}`,
    });
    await interaction.reply({ embeds: [embed] });
  },
};