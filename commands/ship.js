const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

function barra(pct) {
  const cheio = Math.round(pct / 10);
  return '💜'.repeat(cheio) + '🤍'.repeat(10 - cheio);
}

function mensagemTematica(pct) {
  if (pct >= 80) return '🌟 Um amor escrito nas estrelas!';
  if (pct >= 50) return '💫 Tem química no ar, cuidem dela.';
  if (pct >= 25) return '🌙 Talvez amizade seja o caminho.';
  return '💔 As constelações não alinharam dessa vez.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calcula a compatibilidade amorosa entre dois membros')
    .addUserOption((op) => op.setName('usuario1').setDescription('Primeira pessoa').setRequired(true))
    .addUserOption((op) => op.setName('usuario2').setDescription('Segunda pessoa').setRequired(true)),
  async execute(interaction) {
    const u1 = interaction.options.getUser('usuario1');
    const u2 = interaction.options.getUser('usuario2');
    // seed estável baseado nos IDs para o mesmo casal dar o mesmo valor
    const seed = (BigInt(u1.id) ^ BigInt(u2.id)).toString();
    let n = 0;
    for (const c of seed) n = (n * 31 + c.charCodeAt(0)) % 100;
    const pct = n === 0 ? 1 : n;

    const embed = criarEmbed({
      titulo: `💞 Shipping: ${u1.username} × ${u2.username}`,
      descricao:
        `**${pct}%** de compatibilidade\n\n` +
        `${barra(pct)}\n\n` +
        `${mensagemTematica(pct)}`,
      cor: THEME.corRoleta,
      rodape: `${THEME.nome} uniu os corações`,
    });
    await interaction.reply({ embeds: [embed] });
  },
};