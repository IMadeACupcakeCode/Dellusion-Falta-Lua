const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('votar')
    .setDescription('🗳️ Cria uma enquete rápida com botões')
    .addStringOption((op) => op.setName('pergunta').setDescription('A pergunta').setRequired(true))
    .addStringOption((op) => op.setName('opcoes').setDescription('Opções separadas por vírgula (máx 5)').setRequired(true)),
  async execute(interaction) {
    const pergunta = interaction.options.getString('pergunta');
    const opcoes = interaction.options
      .getString('opcoes')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length)
      .slice(0, 5);

    if (opcoes.length < 2) {
      return interaction.reply({
        embeds: [criarEmbed({ titulo: 'Preciso de 2+ opções', descricao: 'Separe por vírgula.', cor: 0xE67E80 })],
        ephemeral: true,
      });
    }

    const votos = {};
    opcoes.forEach((o) => (votos[o] = 0));

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const row = new ActionRowBuilder().addComponents(
      opcoes.map((o, i) => botao(o.slice(0, 80), `votar_${i}`, ButtonStyle.Primary, emojis[i]))
    );

    const embed = criarEmbed({
      titulo: `🗳️ ${pergunta}`,
      descricao: opcoes.map((o, i) => `${emojis[i]} **${o}** — \`0\` voto(s)`).join('\n'),
      cor: THEME.corPrincipal,
      rodape: `Enquete por ${interaction.user.username}`,
    });

    const resposta = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const jaVotou = new Set();

    const coletor = resposta.createMessageComponentCollector({ time: 10 * 60 * 1000, filter: () => true });
    coletor.on('collect', async (i) => {
      const idx = parseInt(i.customId.replace('votar_', ''), 10);
      const usuario = i.user.id;
      if (jaVotou.has(usuario)) {
        return i.reply({ content: 'Você já votou! 🌙', ephemeral: true });
      }
      jaVotou.add(usuario);
      votos[opcoes[idx]]++;
      const novo = criarEmbed({
        titulo: `🗳️ ${pergunta}`,
        descricao: opcoes.map((o, i2) => `${emojis[i2]} **${o}** — \`${votos[o]}\` voto(s)`).join('\n'),
        cor: THEME.corPrincipal,
        rodape: `Enquete por ${interaction.user.username}`,
      });
      await i.update({ embeds: [novo], components: [row] });
    });
    coletor.on('end', async () => {
      try {
        await resposta.edit({ components: [] });
      } catch {}
    });
  },
};