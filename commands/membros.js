const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder().setName('membros').setDescription('👥 Conta membros, bots e humanos do servidor'),
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) return interaction.reply({ embeds: [criarEmbed({ titulo: 'Só em servidores', descricao: 'Use em um servidor.', cor: 0xE67E80 })], ephemeral: true });
    await guild.members.fetch();
    const total = guild.memberCount;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humanos = total - bots;
    const embed = criarEmbed({
      titulo: `👥 ${guild.name}`,
      descricao:
        `**Total:** \`${total}\`\n` +
        `**Humanos:** \`${humanos}\`\n` +
        `**Bots:** \`${bots}\``,
      cor: THEME.corPrincipal,
    });
    await interaction.reply({ embeds: [embed] });
  },
};