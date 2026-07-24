const { criarEmbed, THEME } = require('../utils/theme');
const { COMANDO_SOBRE, CONTEXTO_SERVIDOR } = require('../utils/configuracao');

module.exports = {
  data: { name: COMANDO_SOBRE.nome, description: COMANDO_SOBRE.descricao },
  async execute(interaction) {
    const embed = criarEmbed({
      titulo: '🌙 Sobre a Falta Lua',
      descricao:
        `Sou a **Falta Lua**, uma bot feita para o servidor de roleplay **${CONTEXTO_SERVIDOR}** — para tornar a comunidade mais mágica e organizada. 💜\n\n` +
        `${THEME.div.simples}\n\n` +
        '✧ Lembretes e rolagens de dados\n' +
        '✧ Diversão: moeda, roleta, 8ball, ship, guerra, roleta russa\n' +
        '✧ Social: abraços, cartas secretas, perfis\n' +
        '✧ Organização: canais permitidos/proibidos e anúncios classificados\n' +
        `✧ E o **Livro da Lua** (\`$codex\`) com todos os comandos\n\n` +
        `${THEME.div.duplo}\n\n` +
        'Use `$codex` para ver tudo que sei fazer!',
      cor: THEME.corPrincipal,
    });
    await interaction.reply({ embeds: [embed] });
  },
};