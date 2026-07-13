const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

module.exports = {
  data: new SlashCommandBuilder().setName('mila').setDescription('🌙 Sobre a Falta Lua'),
  async execute(interaction) {
    const embed = criarEmbed({
      titulo: '🌙 Sobre a Falta Lua',
      descricao:
        'Sou a **Falta Lua**, uma bot feita para tornar seu servidor mais mágico e organizado. 💜\n\n' +
        '✧ Lembretes e rolagens de dados\n' +
        '✧ Diversão: moeda, roleta, 8ball, ship, guerra, roleta russa\n' +
        '✧ Social: abraços, cartas secretas, perfis\n' +
        '✧ Organização: canais permitidos/proibidos e anúncios classificados\n' +
        '✧ E o **Livro da Lua** (`/codex`) com todos os comandos\n\n' +
        'Use `/codex` para ver tudo que sei fazer!',
      cor: THEME.corPrincipal,
    });
    await interaction.reply({ embeds: [embed] });
  },
};