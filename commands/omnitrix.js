const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { isStaff } = require('../utils/perms');
const { obterHistorico, avaliarRisco, marcarSuspeito, registrarSuspensao, obterMarcacoes } = require('../utils/segurancaStore');
const { clientCache, presenceMap } = require('../utils/cache');
const { formatarDataAbsoluta } = require('../utils/tempo');
const { isGuildStaff, presenceStatus, STATUS_EMOJI } = require('./securitybreach');

// ── Manual do Omnitrix (todas as funcionalidades do SecurityBreach) ───────
function buildManualEmbed() {
  const embed = criarEmbed({
    titulo: '🌟 Omnitrix — Manual de Segurança 🌟',
    descricao:
      'O **Omnitrix** é o centro de controle de segurança da Falta Lua. Ele abre o painel ' +
      '**`$securitybreach`** e registra o histórico de cada membro. Aqui está o guia completo:',
    cor: THEME.corPrincipal,
  });

  embed.addFields(
    {
      name: '🛡️ $securitybreach — Painel principal',
      value:
        'Abre um painel staff (ephemeral) com visão geral do servidor e lista de membros em tempo real.\n' +
        '• 📋 **Todos** – todos os membros do cache\n' +
        '• 🟢 **Online** – só quem está online/idle/dnd\n' +
        '• ⚪ **Offline** – offline ou invisível\n' +
        '• 🤖 **Bots** – só bots (diferenciados dos humanos)\n' +
        '• 👑 **Staff** – cargos de staff / permissões\n' +
        '• 👤 **Membros** – humanos comuns (sem staff)\n' +
        '• 🚨 **Suspeitos** – com suspensões, suspeitas ou sinais de risco',
      inline: false,
    },
    {
      name: '🔍 Busca e filtros',
      value:
        'Toque em **🔍 Buscar** para abrir um formulário e pesquisar por **nome, tag ou ID** (inclui data/hora no histórico de cada um). ' +
        'Use **◀️ ▶️ ⏮️ ⏭️** para paginar a lista. O painel mostra presença **em tempo real** (atualiza via listeners de presença).',
      inline: false,
    },
    {
      name: '🔄 Recarregar',
      value: 'Força um novo fetch de membros/presenças e atualiza o cache. Use se a lista estiver desatualizada.',
      inline: false,
    },
    {
      name: '🔎 Histórico de um membro (este comando)',
      value:
        'Use **`$omnitrix @usuário`** para abrir o histórico completo: suspensões (servidor e Discord, e quantas vezes), ' +
        'suspeitas anotadas, sinais de risco do Discord (ex.: conta nova) e marcações do servidor. ' +
        'Você também pode marcar como **suspeito** ou **registrar uma suspensão** direto nos botões.',
      inline: false,
    },
    {
      name: '🚨 Como funciona a suspeita',
      value:
        'O bot cruza dados do Discord (idade da conta, se é bot) e o histórico salvo em `data/historico.json`. ' +
        'Suspensões registradas contam quantas vezes o membro já foi suspenso e se foi no servidor ou no Discord.',
      inline: false,
    },
    {
      name: '⚙️ Requisitos',
      value:
        'Para dados 100% em tempo real, o `.env` precisa de `ENABLE_PRIVILEGED_INTENTS=true` e as intents ' +
        '**Server Members** e **Presences** ativadas no Discord Developer Portal. Sem isso, o cache é populado sob demanda.',
      inline: false,
    }
  );

  return embed;
}

function buildHistoricoEmbed(member) {
  const hist = obterHistorico(member.user.id);
  const risco = avaliarRisco(member);
  const marcacoes = obterMarcacoes(member.guild.id)[member.user.id];
  const st = presenceStatus(member);
  const criadoEm = member.user.createdAt ? formatarDataAbsoluta(member.user.createdAt.getTime()) : 'desconhecido';
  const entrouEm = member.joinedAt ? formatarDataAbsoluta(member.joinedAt.getTime()) : 'desconhecido';

  const desc =
    `**Tag:** ${member.user.tag}\n` +
    `**ID:** \`${member.user.id}\`\n` +
    `**Tipo:** ${member.user.bot ? '🤖 Bot' : '👤 Humano'}  ${isGuildStaff(member) ? '• 👑 Staff' : ''}\n` +
    `**Status agora:** ${STATUS_EMOJI[st] || '⚪'} ${st}\n` +
    `**Conta criada:** ${criadoEm}\n` +
    `**Entrou no servidor:** ${entrouEm}\n`;

  const embed = criarEmbed({
    titulo: `🔍 Histórico de ${member.user.username}`,
    descricao: desc,
    cor: hist.suspenso > 0 || risco.length ? 0xE67E80 : THEME.corPrincipal,
  });

  embed.addFields({
    name: '🚫 Suspensões registradas',
    value: `Total: **${hist.suspenso}**  (servidor: ${hist.suspensoServidor || 0} • Discord: ${hist.suspensoDiscord || 0})`,
    inline: false,
  });

  if (hist.historico && hist.historico.length) {
    const linhas = hist.historico
      .slice(-8)
      .reverse()
      .map((h) => {
        const quando = formatarDataAbsoluta(h.em);
        const det = h.motivo ? ` — ${h.motivo}` : '';
        const quem = h.por ? ` (por ${h.por})` : '';
        return `• **${h.tipo}** [${h.origem}] em ${quando}${det}${quem}`;
      });
    embed.addFields({ name: '📜 Log de eventos', value: linhas.join('\n') || 'Sem eventos.', inline: false });
  }

  if (hist.suspeitas && hist.suspeitas.length) {
    const linhas = hist.suspeitas
      .slice(-8)
      .reverse()
      .map((s) => `• [${s.escopo}] ${s.motivo || 'sem motivo'} (${formatarDataAbsoluta(s.em)})`);
    embed.addFields({ name: '🚨 Suspeitas anotadas', value: linhas.join('\n') || 'Nenhuma.', inline: false });
  }

  if (risco.length) {
    embed.addFields({ name: '⚠️ Sinais de risco (Discord)', value: risco.map((r) => `• ${r}`).join('\n'), inline: false });
  }

  if (marcacoes) {
    embed.addFields({ name: '📌 Marcação no servidor', value: `**${marcacoes.tipo}**: ${marcacoes.nota || ''}`, inline: false });
  }

  embed.addFields({
    name: '🧭 Ações',
    value: 'Use os botões para marcar este membro como suspeito ou registrar uma suspensão no histórico.',
    inline: false,
  });

  return embed;
}

function buildHistoricoBotoes() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('omni_suspeito').setLabel('Marcar suspeito').setEmoji('🚨').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('omni_suspensao').setLabel('Registrar suspensão').setEmoji('🚫').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('omni_voltar').setLabel('Voltar ao manual').setEmoji('🔙').setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function buildSuspeitoModal(userId) {
  return new ModalBuilder()
    .setCustomId(`omni_suspeito_modal:${userId}`)
    .setTitle('🚨 Marcar suspeito')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('omni_suspeito_motivo')
          .setLabel('Motivo / escopo (interno ou externo)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: externo — comportamento estranho fora do servidor')
          .setRequired(true)
          .setMaxLength(500)
      )
    );
}

function buildSuspensaoModal(userId) {
  return new ModalBuilder()
    .setCustomId(`omni_suspensao_modal:${userId}`)
    .setTitle('🚫 Registrar suspensão')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('omni_suspensao_origem')
          .setLabel('Origem (servidor ou discord)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('servidor')
          .setRequired(true)
          .setMaxLength(20)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('omni_suspensao_motivo')
          .setLabel('Motivo')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ex: flood, quebra de regra')
          .setRequired(false)
          .setMaxLength(500)
      )
    );
}

module.exports = {
  data: { name: 'omnitrix', description: '🌟 Manual de segurança e histórico de membros' },

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [criarEmbed({ titulo: 'Acesso negado', descricao: 'Somente staff pode usar este comando.', cor: 0xE67E80 })],
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    const alvo = interaction.options?.getUser?.('usuario') || null;

    // Resolve o membro (do cache ou fetch leve)
    let member = null;
    if (alvo) {
      const cache = clientCache.get(guild.id)?.members;
      member = cache?.get(alvo.id) || guild.members.cache.get(alvo.id) || null;
      if (!member) {
        try {
          member = await guild.members.fetch(alvo.id);
        } catch {
          member = null;
        }
      }
    }

    const mostrarManual = () => buildManualEmbed();
    const mostrarHistorico = () => buildHistoricoEmbed(member);

    const reply = await interaction.reply({
      embeds: [member ? mostrarHistorico() : mostrarManual()],
      components: member ? buildHistoricoBotoes() : [buildVoltarOuManualRow()],
      ephemeral: true,
    });

    function buildVoltarOuManualRow() {
      // Sem membro: oferece abrir o painel ou buscar via select
      const menu = new StringSelectMenuBuilder()
        .setCustomId('omni_buscar')
        .setPlaceholder('🔎 Selecionar membro para ver histórico')
        .addOptions(
          Array.from(clientCache.get(guild.id)?.members?.values() || []).slice(0, 25).map((m) => ({
            label: m.user.username.slice(0, 100),
            value: m.user.id,
            description: m.user.bot ? 'Bot' : 'Humano',
            emoji: m.user.bot ? '🤖' : '👤',
          }))
        );
      return new ActionRowBuilder().addComponents(menu);
    }

    const collector = reply.createMessageComponentCollector({
      time: 10 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      // Select de membro (sem alvo inicial)
      if (i.customId === 'omni_buscar') {
        const id = i.values[0];
        let m = clientCache.get(guild.id)?.members?.get(id) || guild.members.cache.get(id) || null;
        if (!m) {
          try {
            m = await guild.members.fetch(id);
          } catch {
            m = null;
          }
        }
        if (!m) return i.update({ embeds: [criarEmbed({ titulo: 'Membro não encontrado', descricao: 'Não consegui achar esse ID.', cor: 0xE67E80 })], components: [] });
        member = m;
        return i.update({ embeds: [mostrarHistorico()], components: buildHistoricoBotoes() });
      }

      // Botão voltar ao manual
      if (i.customId === 'omni_voltar') {
        return i.update({ embeds: [mostrarManual()], components: [buildVoltarOuManualRow()] });
      }

      // Marcar suspeito
      if (i.customId === 'omni_suspeito') {
        await i.showModal(buildSuspeitoModal(member.user.id));
        return;
      }
      if (i.customId.startsWith('omni_suspeito_modal:')) {
        const motivo = i.fields.getTextInputValue('omni_suspeito_motivo');
        marcarSuspeito(member.user.id, { escopo: /externo/i.test(motivo) ? 'externo' : 'interno', motivo, por: i.user.username });
        return i.update({ embeds: [mostrarHistorico()], components: buildHistoricoBotoes() });
      }

      // Registrar suspensão
      if (i.customId === 'omni_suspensao') {
        await i.showModal(buildSuspensaoModal(member.user.id));
        return;
      }
      if (i.customId.startsWith('omni_suspensao_modal:')) {
        const origem = (i.fields.getTextInputValue('omni_suspensao_origem') || 'servidor').toLowerCase().includes('discord')
          ? 'discord'
          : 'servidor';
        const motivo = i.fields.getTextInputValue('omni_suspensao_motivo') || '';
        registrarSuspensao(member.user.id, { origem, motivo, por: i.user.username, guildId: guild.id });
        return i.update({ embeds: [mostrarHistorico()], components: buildHistoricoBotoes() });
      }
    });

    collector.on('end', async () => {
      try {
        await reply.edit({ components: [] });
      } catch {}
    });
  },
};