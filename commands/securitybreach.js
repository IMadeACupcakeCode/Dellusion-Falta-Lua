const { ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');

module.exports = {
  data: { name: 'securitybreach', description: '🛡️ Painel de segurança staff: histórico, varredura e alertas' },
  async execute(interaction, client) {
    if (!interaction.memberPermissions || !interaction.memberPermissions.has('ManageGuild')) {
      return interaction.reply({ embeds: [criarEmbed({ titulo: 'Acesso negado', descricao: 'Somente staff pode usar este comando.', cor: 0xE67E80 })], ephemeral: true });
    }

    const guild = interaction.guild;
    await guild.members.fetch();
    const membros = Array.from(guild.members.cache.values());

    function painelMenu() {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('sec_menu')
        .setPlaceholder('🛡️ Painel de Segurança — selecione uma opção')
        .addOptions([
          { label: '🔍 Histórico de membro', value: 'hist', description: 'Consultar histórico por ID/nome', emoji: '🔍' },
          { label: '⚠️ Varredura de suspeitos', value: 'scan', description: 'Analisar contas novas/spam', emoji: '⚠️' },
          { label: '📊 Visão geral', value: 'overview', description: 'Resumo do servidor', emoji: '📊' },
        ]);
      return new ActionRowBuilder().addComponents(menu);
    }

    const embedInicial = criarEmbed({
      titulo: '🛡️ SecurityBreach',
      descricao: 'Painel restrito a staff.\nUse o menu abaixo para navegar pelas opções.',
      cor: 0xE67E80,
    });

    const resposta = await interaction.reply({ embeds: [embedInicial], components: [painelMenu()], ephemeral: true });

    const coletor = resposta.createMessageComponentCollector({ time: 5 * 60 * 1000, filter: (i) => i.user.id === interaction.user.id });

    coletor.on('collect', async (i) => {
      if (i.customId === 'sec_menu') {
        const opcao = i.values[0];
        if (opcao === 'hist') {
          const embed = criarEmbed({ titulo: '🔍 Histórico de membro', descricao: 'Em breve: busca por ID/nome.', cor: THEME.corPrincipal });
          await i.update({ embeds: [embed], components: [painelMenu()] });
        } else if (opcao === 'scan') {
          const agora = Date.now();
          const seteDias = 7 * 24 * 60 * 60 * 1000;
          const novasContas = membros.filter((m) => !m.user.bot && (agora - (m.user.createdAt?.getTime() || 0) < seteDias));
          const spam = membros.filter((m) => !m.user.bot && m.roles.cache.filter((r) => r.id !== guild.id && !r.managed).size === 0);
          const texto = [
            `**Contas novas (7 dias):** ${novasContas.length}`,
            `**Sem cargos:** ${spam.length}`,
            '**Prováveis suspeitos:** ' + (novasContas.length + spam.length > 0 ? novasContas.map((m) => m.user.tag).join(', ') : 'nenhum'),
          ].join('\n');
          const embedScan = criarEmbed({ titulo: '⚠️ Varredura de suspeitos', descricao: texto, cor: 0xE67E80 });
          await i.update({ embeds: [embedScan], components: [painelMenu()] });
        } else if (opcao === 'overview') {
          const bots = membros.filter((m) => m.user.bot).length;
          const staff = membros.filter((m) => m.permissions.has('ManageGuild') || m.permissions.has('Administrator')).length;
          const players = membros.length - bots - staff;
          const overview = `Total: ${membros.length}\nPlayers: ${players}\nStaff: ${staff}\nBots: ${bots}`;
          const embedOv = criarEmbed({ titulo: '📊 Visão geral', descricao: overview, cor: THEME.corPrincipal });
          await i.update({ embeds: [embedOv], components: [painelMenu()] });
        }
      }
    });

    coletor.on('end', async () => {
      try {
        await resposta.edit({ components: [] });
      } catch {}
    });
  },
};