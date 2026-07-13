const { PermissionFlagsBits, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');

module.exports = {
  data: { name: 'limpar', description: '🧹 Apaga mensagens recentes do canal' },
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