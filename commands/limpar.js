const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('🧹 Apaga mensagens recentes do canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((op) => op.setName('quantidade').setDescription('Quantas mensagens (2-100)').setRequired(true).setMinValue(2).setMaxValue(100)),
  async execute(interaction) {
    const qtd = interaction.options.getInteger('quantidade');
    const row = new ActionRowBuilder().addComponents(
      botao('✅ Confirmar', 'limpar_sim', ButtonStyle.Danger, '🧹'),
      botao('❌ Cancelar', 'limpar_nao', ButtonStyle.Secondary, '❌')
    );
    const embed = criarEmbed({
      titulo: '🧹 Confirmar limpeza',
      descricao: `Vou apagar **${qtd}** mensagens deste canal. Confirma?`,
      cor: 0xE67E80,
    });
    const resposta = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const coletor = resposta.createMessageComponentCollector({ time: 30000, filter: (i) => i.user.id === interaction.user.id });
    coletor.on('collect', async (i) => {
      if (i.customId === 'limpar_nao') {
        return i.update({ embeds: [criarEmbed({ titulo: 'Cancelado', descricao: 'Nada foi apagado.', cor: THEME.corSucesso })], components: [] });
      }
      try {
        const apagadas = await interaction.channel.bulkDelete(qtd, true);
        await i.update({
          embeds: [criarEmbed({ titulo: '🧹 Limpeza feita', descricao: `Apaguei ${apagadas.size} mensagens.`, cor: THEME.corSucesso })],
          components: [],
        });
      } catch (erro) {
        await i.update({ embeds: [criarEmbed({ titulo: 'Erro', descricao: erro.message, cor: 0xE67E80 })], components: [] });
      }
    });
  },
};