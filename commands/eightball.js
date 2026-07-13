const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');

const RESPOSTAS = [
  'Com certeza. ✧',
  'Sem dúvida. 🌙',
  'É certo, sob a lua.',
  'Pode contar com isso.',
  'A lua sussurra que sim.',
  'Provavelmente. ✧',
  'As estrelas indicam que sim.',
  'Não posso prever agora...',
  'Pergunte mais tarde. 🌫️',
  'Não conte com isso.',
  'Minhas visões dizem não. 🌑',
  'Absolutamente não.',
  'É melhor nem tentar. 🚫',
  'Fontes dizem que não. 🌫️',
];

function embed8(pergunta, autor) {
  const resposta = RESPOSTAS[Math.floor(Math.random() * RESPOSTAS.length)];
  return criarEmbed({
    titulo: '🔮 A bola mágica responde',
    descricao: `> ${pergunta}\n\n**${resposta}**`,
    cor: THEME.corPrincipal,
    rodape: `Consultado por ${autor}`,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('A bola mágica responde sua pergunta')
    .addStringOption((op) => op.setName('pergunta').setDescription('Sua pergunta').setRequired(true)),
  async execute(interaction) {
    const pergunta = interaction.options.getString('pergunta');
    const row = new ActionRowBuilder().addComponents(
      botao('🔄 Perguntar de novo', '8ball_reroll', ButtonStyle.Primary, '🔄')
    );
    const resposta = await interaction.reply({
      embeds: [embed8(pergunta, interaction.user.username)],
      components: [row],
      fetchReply: true,
    });
    const coletor = resposta.createMessageComponentCollector({ time: 60000, filter: () => true });
    coletor.on('collect', async (i) => {
      if (i.customId === '8ball_reroll') {
        await i.update({ embeds: [embed8(pergunta, interaction.user.username)], components: [row] });
      }
    });
    coletor.on('end', async () => {
      try {
        await resposta.edit({ components: [] });
      } catch {}
    });
  },
};