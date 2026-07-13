const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder().setName('seguranca').setDescription('🛡️ Dicas de segurança para o servidor e a bot'),
  async execute(interaction) {
    const embed = criarEmbed({
      titulo: '🛡️ Dicas de Segurança',
      descricao:
        '✦ Ative o **2FA** na sua conta e no servidor (modo desenvolvedor).\n' +
        '✦ Use cargos com permissões mínimas necessárias (princípio do menor privilégio).\n' +
        '✦ Restrinja quem pode convidar bots (só admins).\n' +
        '✦ Ative o sistema de moderação e logs em canais separados.\n' +
        '✦ Nunca compartilhe o token da bot — ele vai no `.env`, fora do repositório.\n' +
        '✦ Use `/configurar` para limitar onde a bot fala e evitar spam.',
      cor: THEME.corPrincipal,
    });
    await interaction.reply({ embeds: [embed] });
  },
};