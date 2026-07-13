const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');

const FRASES = [
  'te envolve em uma mantinha quente sob a lua 🤗',
  'te abraça forte e sussurra "tá tudo bem" 🌙',
  'te passa uma luz lilás de conforto ✨',
  'te puxa para um abraço demorado 💜',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abraco')
    .setDescription('🤗 Envia um abraço carinhoso para alguém')
    .addUserOption((op) => op.setName('usuario').setDescription('Quem recebe o abraço').setRequired(false)),
  async execute(interaction) {
    const alvo = interaction.options.getUser('usuario') || interaction.user;
    const frase = FRASES[Math.floor(Math.random() * FRASES.length)];
    const embed = criarEmbed({
      titulo: '🤗 Um abraço chegou!',
      descricao: `**${interaction.user}** ${frase}\n\n> ${alvo}, você recebeu um abraço!`,
      cor: THEME.corRoleta,
      rodape: `${THEME.nome}分发 amor`,
    });
    await interaction.reply({ embeds: [embed] });
  },
};