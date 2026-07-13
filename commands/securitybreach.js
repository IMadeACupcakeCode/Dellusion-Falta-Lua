const { ActionRowBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { isStaff } = require('../utils/perms');
const { salvarSnapshot, obterSnapshot, marcarMembro, obterMarcacoes } = require('../utils/segurancaStore');

module.exports = {
  data: { name: 'securitybreach', description: '🛡️ Painel de segurança staff: histórico, varredura e alertas' },
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ embeds: [criarEmbed({ titulo: 'Acesso negado', descricao: 'Somente staff pode usar este comando.', cor: 0xE67E80 })], ephemeral: true });
    }

    const guild = interaction.guild;
    // Atualiza memória com os membros atuais do cache (sem fetch pesado)
    const membrosCache = Array.from(guild.members.cache.values());
    const totalMembros = guild.memberCount || membrosCache.length;
    salvarSnapshot(guild.id, membrosCache);

    function painelMenu() {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('sec_menu')
        .setPlaceholder('🛡️ Painel de Segurança — selecione uma opção')
        .addOptions([
          { label: '🔍 Buscar membro', value: 'buscar', description: 'Pesquisar por ID ou nome', emoji: '🔍' },
          { label: '⚠️ Varredura de suspeitos', value: 'scan', description: 'Analisar contas novas/spam', emoji: '⚠️' },
          { label: '📊 Visão geral', value: 'overview', description: 'Resumo do servidor', emoji: '📊' },
          { label: '🚩 Marcados', value: 'marcados', description: 'Membros com alertas salvos', emoji: '🚩' },
        ]);
      return new ActionRowBuilder().addComponents(menu);
    }

    const embedInicial = criarEmbed({
      titulo: '🛡️ SecurityBreach',
      descricao: 'Painel restrito a staff.\nUse o menu abaixo para navegar pelas opções. Memória atualizada com `' + totalMembros + '` membros.',
      cor: 0xE67E80,
    });

    const resposta = await interaction.reply({ embeds: [embedInicial], components: [painelMenu()], ephemeral: true });

    const coletor = resposta.createMessageComponentCollector({ time: 10 * 60 * 1000, filter: (i) => i.user.id === interaction.user.id });

    function buscarMembro(termo) {
      const t = termo.trim().toLowerCase();
      return membrosCache.find((m) =>
        m.user.id === t ||
        m.user.username.toLowerCase().includes(t) ||
        m.user.tag.toLowerCase().includes(t)
      );
    }

    coletor.on('collect', async (i) => {
      try {
        if (i.customId === 'sec_menu') {
          const opcao = i.values[0];
          if (opcao === 'buscar') {
            const modal = new ModalBuilder()
              .setCustomId('sec_buscar_modal')
              .setTitle('🔍 Buscar membro');
            modal.addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('sec_termo').setLabel('ID ou nome do membro').setStyle(TextInputStyle.Short).setRequired(true)
              )
            );
            await i.showModal(modal);
            const sub = await i.awaitModalSubmit({ filter: (m) => m.user.id === interaction.user.id, time: 5 * 60 * 1000 });
            const termo = sub.fields.getTextInputValue('sec_termo');
            const membro = buscarMembro(termo);
            if (!membro) {
              return sub.reply({ embeds: [criarEmbed({ titulo: 'Não encontrado', descricao: 'Nenhum membro coincide com `' + termo + '`.', cor: 0xE67E80 })], ephemeral: true });
            }
            const idadeConta = membro.user.createdAt ? Math.floor((Date.now() - membro.user.createdAt.getTime()) / 86400000) : '?';
            const diasNoServ = membro.joinedAt ? Math.floor((Date.now() - membro.joinedAt.getTime()) / 86400000) : '?';
            const marc = obterMarcacoes(guild.id)[membro.user.id];
            const texto =
              `**Tag:** ${membro.user.tag}\n` +
              `**ID:** \`${membro.user.id}\`\n` +
              `**Idade da conta:** ${idadeConta} dias\n` +
              `**Tempo no servidor:** ${diasNoServ} dias\n` +
              `**Bot:** ${membro.user.bot ? 'Sim' : 'Não'}\n` +
              `**Cargo mais alto:** ${membro.roles.cache.filter((r) => r.id !== guild.id && !r.managed).sort((a, b) => b.position - a.position).first()?.name || 'Sem cargo'}\n` +
              (marc ? `\n🚩 **Marcado:** ${marc.tipo} — ${marc.nota}` : '');
            await sub.reply({ embeds: [criarEmbed({ titulo: '🔍 Histórico de membro', descricao: texto, cor: THEME.corPrincipal })], ephemeral: true });
          } else if (opcao === 'scan') {
            const agora = Date.now();
            const seteDias = 7 * 24 * 60 * 60 * 1000;
            const novasContas = membrosCache.filter((m) => !m.user.bot && (agora - (m.user.createdAt?.getTime() || 0) < seteDias));
            const semCargo = membrosCache.filter((m) => !m.user.bot && m.roles.cache.filter((r) => r.id !== guild.id && !r.managed).size === 0);
            const texto = [
              `**Contas novas (7 dias):** ${novasContas.length}`,
              `**Sem cargos:** ${semCargo.length}`,
              '**Prováveis suspeitos:** ' + (novasContas.length ? novasContas.map((m) => m.user.tag).join(', ') : 'nenhum'),
            ].join('\n');
            await i.update({ embeds: [criarEmbed({ titulo: '⚠️ Varredura de suspeitos', descricao: texto, cor: 0xE67E80 })], components: [painelMenu()] });
          } else if (opcao === 'overview') {
            const bots = membrosCache.filter((m) => m.user.bot).length;
            const staff = membrosCache.filter((m) => m.permissions.has('ManageGuild') || m.permissions.has('Administrator')).length;
            const players = membrosCache.length - bots - staff;
            const overview = `Total no cache: ${membrosCache.length}\nPlayers: ${players}\nStaff: ${staff}\nBots: ${bots}`;
            await i.update({ embeds: [criarEmbed({ titulo: '📊 Visão geral', descricao: overview, cor: THEME.corPrincipal })], components: [painelMenu()] });
          } else if (opcao === 'marcados') {
            const marc = obterMarcacoes(guild.id);
            const linhas = Object.entries(marc).map(([id, v]) => `• \`${id}\`: ${v.tipo} — ${v.nota}`);
            const texto = linhas.length ? linhas.join('\n') : 'Nenhum membro marcado.';
            await i.update({ embeds: [criarEmbed({ titulo: '🚩 Membros marcados', descricao: texto, cor: 0xE67E80 })], components: [painelMenu()] });
          }
        }
      } catch {
        // Ignora erros de modal expirado
      }
    });

    coletor.on('end', async () => {
      try {
        await resposta.edit({ components: [] });
      } catch {}
    });
  },
};