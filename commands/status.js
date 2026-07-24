const { criarEmbed, THEME } = require('../utils/theme');

module.exports = {
  data: { name: 'status', description: '📡 Mostra o status da bot' },
  async execute(interaction, client) {
    const ping = Math.round(client.ws.ping);
    const embed = criarEmbed({
      titulo: '📡 Status da Falta Lua',
      descricao:
        `**Latência da API:** \`${ping}ms\`\n` +
        `**Servidores:** \`${client.guilds.cache.size}\`\n` +
        `**Usuários visíveis:** \`${client.users.cache.size}\`\n` +
        `${THEME.div.linha}\n` +
        `**Status:** 🌙 online e sussurrando sob a lua`,
      cor: THEME.corSucesso,
      rodape: `${THEME.nome} vigia silenciosamente...`,
    });
    await interaction.reply({ embeds: [embed] });
  },
};