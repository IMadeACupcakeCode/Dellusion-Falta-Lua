const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { isStaff, STAFF_CARGO_IDS } = require('../utils/perms');
const { salvarSnapshot, obterMarcacoes, obterHistorico, avaliarRisco } = require('../utils/segurancaStore');
const { clientCache, presenceMap } = require('../utils/cache');
const { formatarDataAbsoluta } = require('../utils/tempo');

// Constantes de presença
const ONLINE_STATUSES = new Set(['online', 'idle', 'dnd']);
const STATUS_EMOJI = { online: '🟢', idle: '🌙', dnd: '⛔', offline: '⚪' };
const STAFF_KEYWORDS = /(staff|moderador|moderadora|moderador\(a\)|admin|administrador|adm|gerente|suporte)/i;
const TIPO_LABEL = { bot: '🤖', humano: '👤' };

// ── Helpers ───────────────────────────────────────────────────────────────
function isGuildStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator) || member.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }
  const cargos = member.roles?.cache || [];
  if (cargos.some((role) => STAFF_CARGO_IDS.includes(role.id))) return true;
  return cargos.some((role) => STAFF_KEYWORDS.test(role.name));
}

// Presença em tempo real: prioriza o presenceMap atualizado pelos listeners.
function presenceStatus(member) {
  return presenceMap.get(member.id) || member.presence?.status || 'offline';
}

function isOnline(member) {
  return ONLINE_STATUSES.has(presenceStatus(member));
}

// Converte o cache (Map) em array de membros
function cacheArray(guildId) {
  const entry = clientCache.get(guildId);
  if (!entry || !entry.members) return [];
  return Array.from(entry.members.values());
}

// Aplica filtros de visão
function filtrar(view, membros) {
  switch (view) {
    case 'online':
      return membros.filter(isOnline);
    case 'offline':
      return membros.filter((m) => !isOnline(m));
    case 'bots':
      return membros.filter((m) => m.user.bot);
    case 'staff':
      return membros.filter(isGuildStaff);
    case 'members':
      return membros.filter((m) => !m.user.bot && !isGuildStaff(m));
    case 'suspeitos':
      return membros.filter((m) => {
        const hist = obterHistorico(m.user.id);
        if (hist.suspenso > 0 || (hist.suspeitas && hist.suspeitas.length)) return true;
        return avaliarRisco(m).length > 0;
      });
    default:
      return membros;
  }
}

// Busca textual por nome/tag/id
function buscar(termo, membros) {
  const t = termo.trim().toLowerCase();
  if (!t) return membros;
  return membros.filter((m) => {
    const u = m.user;
    return (
      u.username.toLowerCase().includes(t) ||
      (u.tag && u.tag.toLowerCase().includes(t)) ||
      (u.globalName && u.globalName.toLowerCase().includes(t)) ||
      u.id.includes(t)
    );
  });
}

const VIEW_LABELS = {
  all: 'Todos os membros',
  online: 'Apenas online',
  offline: 'Offline / Invisíveis',
  bots: '🤖 Bots',
  staff: '👑 Staff',
  members: '👤 Membros normais',
  suspeitos: '🚨 Suspeitos / com histórico',
};

// ── Estatísticas ──────────────────────────────────────────────────────────
function buildStats(membros) {
  const bots = membros.filter((m) => m.user.bot);
  const humans = membros.filter((m) => !m.user.bot);
  const staff = membros.filter(isGuildStaff);
  const online = membros.filter(isOnline);
  const offline = membros.filter((m) => !isOnline(m));
  const suspeitos = membros.filter((m) => {
    const h = obterHistorico(m.user.id);
    if (h.suspenso > 0 || (h.suspeitas && h.suspeitas.length)) return true;
    return avaliarRisco(m).length > 0;
  });
  return {
    total: membros.length,
    bots: bots.length,
    humans: humans.length,
    staff: staff.length,
    online: online.length,
    offline: offline.length,
    suspeitos: suspeitos.length,
  };
}

// ── Listagem paginada ─────────────────────────────────────────────────────
const POR_PAGINA = 12;

function formatPage(lista, pagina, termo) {
  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  pagina = Math.min(Math.max(0, pagina), paginas - 1);
  const fatia = lista.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);

  const linhas = fatia.length
    ? fatia.map((m) => {
        const st = presenceStatus(m);
        const tipo = m.user.bot ? TIPO_LABEL.bot : TIPO_LABEL.humano;
        const tagStaff = isGuildStaff(m) ? ' 👑' : '';
        const hist = obterHistorico(m.user.id);
        const alerta = hist.suspenso > 0 || (hist.suspeitas && hist.suspeitas.length) ? ' 🚨' : '';
        return `${STATUS_EMOJI[st] || '⚪'} ${tipo} \`${m.user.id}\` — ${m.user.tag}${tagStaff}${alerta}`;
      })
    : ['Nenhum membro encontrado.'];

  const filtroInfo = termo ? `\n🔎 Busca: \`${termo}\`` : '';
  return {
    texto: linhas.join('\n') + filtroInfo,
    pagina,
    paginas,
    total,
  };
}

// ── Botões / menus ────────────────────────────────────────────────────────
function buildButtons(view) {
  const ativo = (v) => v === view;
  const mk = (id, label, emoji, style) =>
    new ButtonBuilder().setCustomId(id).setLabel(label).setEmoji(emoji).setStyle(style);
  const wrap = (b) => b.setDisabled(ativo(b.data.custom_id.replace('sec_view_', '')));

  const row1 = new ActionRowBuilder().addComponents(
    wrap(mk('sec_view_all', 'Todos', '📋', ButtonStyle.Primary)),
    wrap(mk('sec_view_online', 'Online', '🟢', ButtonStyle.Success)),
    wrap(mk('sec_view_offline', 'Offline', '⚪', ButtonStyle.Secondary)),
    mk('sec_search', '🔍 Buscar', '🔍', ButtonStyle.Primary),
    mk('sec_refresh', 'Recarregar', '🔄', ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    wrap(mk('sec_view_bots', 'Bots', '🤖', ButtonStyle.Secondary)),
    wrap(mk('sec_view_staff', 'Staff', '👑', ButtonStyle.Secondary)),
    wrap(mk('sec_view_members', 'Membros', '👤', ButtonStyle.Secondary)),
    wrap(mk('sec_view_suspeitos', 'Suspeitos', '🚨', ButtonStyle.Danger))
  );
  return [row1, row2];
}

function navRow(view, pagina, paginas) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sec_first').setLabel('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(pagina <= 0),
    new ButtonBuilder().setCustomId('sec_prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(pagina <= 0),
    new ButtonBuilder().setCustomId('sec_next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(pagina >= paginas - 1),
    new ButtonBuilder().setCustomId('sec_last').setLabel('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(pagina >= paginas - 1)
  );
  return row;
}

// ── Embeds ────────────────────────────────────────────────────────────────
function buildPainelEmbed(stats, view, paginaInfo, termo, warning) {
  const embed = criarEmbed({
    titulo: '🛡️ SecurityBreach — Painel de Segurança',
    descricao:
      `**Total no cache:** ${stats.total}\n` +
      `**Humanos:** ${stats.humans}  •  **Bots:** ${stats.bots}\n` +
      `**Staff:** ${stats.staff}\n` +
      `**🟢 Online:** ${stats.online}  •  **⚪ Offline/Inv:** ${stats.offline}\n` +
      `**🚨 Suspeitos/histórico:** ${stats.suspeitos}`,
    cor: THEME.corPrincipal,
  });

  embed.addFields({ name: '🔎 Visão atual', value: VIEW_LABELS[view] || VIEW_LABELS.all, inline: false });
  embed.addFields({
    name: `📜 Lista (página ${paginaInfo.pagina + 1}/${paginaInfo.paginas} • ${paginaInfo.total})`,
    value: paginaInfo.texto,
    inline: false,
  });
  embed.addFields({
    name: '🧭 Como usar',
    value:
      'Toque nos emojes para filtrar. 🔍 abre busca (nome/tag/id). Use ◀️▶️ para paginar. ' +
      '🔄 recarrega o cache. Clique em 🚨 para ver só suspeitos. ' +
      'Para ver o histórico de um membro, use `$omnitrix`.',
    inline: false,
  });
  if (warning) embed.addFields({ name: '⚠️ Aviso', value: warning, inline: false });
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
    value:
      `Total: **${hist.suspenso}**  (servidor: ${hist.suspensoServidor || 0} • Discord: ${hist.suspensoDiscord || 0})`,
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
    value:
      'Use os botões para marcar este membro como suspeito ou registrar uma suspensão no histórico.',
    inline: false,
  });

  return embed;
}

function buildHistoricoBotoes() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hist_suspeito').setLabel('Marcar suspeito').setEmoji('🚨').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('hist_suspensao').setLabel('Registrar suspensão').setEmoji('🚫').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('hist_voltar').setLabel('Voltar ao painel').setEmoji('🔙').setStyle(ButtonStyle.Secondary)
    ),
  ];
}

// ── Modal de busca ────────────────────────────────────────────────────────
function buildSearchModal() {
  return new ModalBuilder()
    .setCustomId('sec_search_modal')
    .setTitle('🔍 Buscar membro')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('sec_termo')
          .setLabel('Nome, tag ou ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: Nikki, nome#1234, ou ID numérico')
          .setRequired(true)
          .setMaxLength(64)
      )
    );
}

// ── Comando principal ──────────────────────────────────────────────────────
module.exports = {
  data: { name: 'securitybreach', description: '🛡️ Painel de segurança staff: visão geral completa do servidor' },

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [
          criarEmbed({ titulo: 'Acesso negado', descricao: 'Somente staff pode usar este comando.', cor: 0xE67E80 }),
        ],
        ephemeral: true,
      });
    }

    const guild = interaction.guild;

    // 1️⃣ Carrega do cache em memória (instantâneo) — sem fetch demorado.
    let membros = cacheArray(guild.id);
    let warning = null;

    if (!membros.length) {
      // Fallback: tenta um fetch único (pode ser lento, só se cache vazio).
      try {
        const fetched = await guild.members.fetch({ withPresences: true });
        clientCache.set(guild.id, { members: fetched, timestamp: Date.now() });
        for (const [, m] of fetched) if (m.presence) presenceMap.set(m.id, m.presence.status || 'offline');
        membros = Array.from(fetched.values());
      } catch {
        membros = Array.from(guild.members.cache.values());
        warning = 'Cache vazio e não foi possível buscar. Ative ENABLE_PRIVILEGED_INTENTS para dados em tempo real.';
      }
    }

    // Snapshot em disco (histórico leve)
    salvarSnapshot(guild.id, membros);

    // Estado da sessão
    let view = 'all';
    let termo = '';
    let pagina = 0;
    const termoAtivo = () => (view === 'search' ? termo : '');

    function renderPainel() {
      const base = view === 'search' ? buscar(termo, membros) : filtrar(view, membros);
      const stats = buildStats(membros);
      const info = formatPage(base, pagina, view === 'search' ? termo : '');
      const embed = buildPainelEmbed(stats, view === 'search' ? 'all' : view, info, termoAtivo(), warning);
      const comps = [navRow(view, info.pagina, info.paginas), ...buildButtons(view)];
      return { embed, comps, info };
    }

    const inicial = renderPainel();
    const reply = await interaction.reply({ embeds: [inicial.embed], components: inicial.comps, ephemeral: true });

    const collector = reply.createMessageComponentCollector({
      time: 10 * 60 * 1000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      // Abrir modal de busca
      if (i.customId === 'sec_search') {
        await i.showModal(buildSearchModal());
        return;
      }

      // Resultado do modal
      if (i.customId === 'sec_search_modal') {
        termo = i.fields.getTextInputValue('sec_termo');
        view = 'search';
        pagina = 0;
        const r = renderPainel();
        return i.update({ embeds: [r.embed], components: r.comps });
      }

      await i.deferUpdate();

      // Recarregar cache
      if (i.customId === 'sec_refresh') {
        try {
          const fetched = await guild.members.fetch({ withPresences: true });
          clientCache.set(guild.id, { members: fetched, timestamp: Date.now() });
          for (const [, m] of fetched) if (m.presence) presenceMap.set(m.id, m.presence.status || 'offline');
          membros = Array.from(fetched.values());
          warning = null;
          salvarSnapshot(guild.id, membros);
        } catch {
          warning = 'Falha ao recarregar. Continuando com o cache atual.';
        }
        pagina = 0;
      } else if (i.customId.startsWith('sec_view_')) {
        view = i.customId.replace('sec_view_', '');
        pagina = 0;
      } else if (i.customId === 'sec_first') {
        pagina = 0;
      } else if (i.customId === 'sec_prev') {
        pagina = Math.max(0, pagina - 1);
      } else if (i.customId === 'sec_next') {
        pagina = pagina + 1;
      } else if (i.customId === 'sec_last') {
        const r = renderPainel();
        pagina = r.info.paginas - 1;
      }

      const r = renderPainel();
      await i.editReply({ embeds: [r.embed], components: r.comps });
    });

    collector.on('end', async () => {
      try {
        await reply.edit({ components: [] });
      } catch {}
    });
  },
};