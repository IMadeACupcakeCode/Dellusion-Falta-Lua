const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { isStaff, STAFF_CARGO_IDS } = require('../utils/perms');
const { salvarSnapshot, obterMarcacoes } = require('../utils/segurancaStore');

const ONLINE_STATUSES = new Set(['online', 'idle', 'dnd']);
const STAFF_KEYWORDS = /(staff|moderador|moderadora|moderador\(a\)|admin|administrador|adm|gerente|suporte)/i;

function isGuildStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator) || member.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }
  const cargos = member.roles?.cache || [];
  if (cargos.some((role) => STAFF_CARGO_IDS.includes(role.id))) return true;
  return member.roles.cache.some((role) => STAFF_KEYWORDS.test(role.name));
}

function presenceStatus(member) {
  return member.presence?.status || 'offline';
}

function formatMemberList(collection, limit = 10) {
  const list = collection.map((member) => `• ${member.user.tag}`).slice(0, limit);
  if (!list.length) return 'Nenhum membro encontrado.';
  const more = collection.size > limit ? `\n... e mais ${collection.size - limit}` : '';
  return list.join('\n') + more;
}

function buildStats(members, totalCount) {
  const bots = members.filter((member) => member.user.bot);
  const humans = members.filter((member) => !member.user.bot);
  const staff = members.filter(isGuildStaff);
  const normalHumans = members.filter((member) => !member.user.bot && !isGuildStaff(member));

  const onlineMembers = members.filter((member) => ONLINE_STATUSES.has(presenceStatus(member)));
  const offlineMembers = members.filter((member) => !ONLINE_STATUSES.has(presenceStatus(member)));

  return {
    total: totalCount || members.size,
    bots: bots.size,
    humans: humans.size,
    staff: staff.size,
    members: normalHumans.size,
    online: onlineMembers.size,
    offline: offlineMembers.size,
    onlineBots: bots.filter((member) => ONLINE_STATUSES.has(presenceStatus(member))),
    offlineBots: bots.filter((member) => !ONLINE_STATUSES.has(presenceStatus(member))),
    onlineStaff: staff.filter((member) => ONLINE_STATUSES.has(presenceStatus(member))),
    offlineStaff: staff.filter((member) => !ONLINE_STATUSES.has(presenceStatus(member))),
    onlineHumans: humans.filter((member) => ONLINE_STATUSES.has(presenceStatus(member)) && !isGuildStaff(member)),
    offlineHumans: humans.filter((member) => !ONLINE_STATUSES.has(presenceStatus(member)) && !isGuildStaff(member)),
    onlineMembers,
    offlineMembers,
  };
}

function buildButtons() {
  const rowOne = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sec_view_all').setLabel('Todos').setEmoji('📋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('sec_view_online').setLabel('Online').setEmoji('🟢').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('sec_view_offline').setLabel('Offline').setEmoji('⚪').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sec_refresh').setLabel('Recarregar').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );

  const rowTwo = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sec_view_bots').setLabel('Bots').setEmoji('🤖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sec_view_staff').setLabel('Staff').setEmoji('👑').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sec_view_members').setLabel('Membros').setEmoji('👤').setStyle(ButtonStyle.Secondary)
  );

  return [rowOne, rowTwo];
}

function buildEmbed(stats, view, warning) {
  const embed = criarEmbed({
    titulo: '📊 SecurityBreach — Visão Geral do Servidor',
    descricao:
      `**Total no servidor:** ${stats.total}\n` +
      `**Humanos:** ${stats.humans}\n` +
      `**Bots:** ${stats.bots}\n` +
      `**Staff:** ${stats.staff}\n` +
      `**Online:** ${stats.online}\n` +
      `**Offline/invisível:** ${stats.offline}`,
    cor: THEME.corPrincipal,
  });

  const viewLabels = {
    all: 'Todos os membros',
    online: 'Apenas online',
    offline: 'Offline / Invisíveis',
    bots: 'Bots',
    staff: 'Staff',
    members: 'Membros normais',
  };

  embed.addFields({ name: '🔎 Exibindo', value: viewLabels[view] || viewLabels.all, inline: false });

  switch (view) {
    case 'online':
      embed.addFields({ name: '🟢 Online', value: formatMemberList(stats.onlineMembers), inline: false });
      break;
    case 'offline':
      embed.addFields({ name: '⚪ Offline', value: formatMemberList(stats.offlineMembers), inline: false });
      break;
    case 'bots':
      embed.addFields(
        { name: '🤖 Bots online', value: formatMemberList(stats.onlineBots), inline: true },
        { name: '🤖 Bots offline', value: formatMemberList(stats.offlineBots), inline: true }
      );
      break;
    case 'staff':
      embed.addFields(
        { name: '👑 Staff online', value: formatMemberList(stats.onlineStaff), inline: true },
        { name: '👑 Staff offline', value: formatMemberList(stats.offlineStaff), inline: true }
      );
      break;
    case 'members':
      embed.addFields(
        { name: '👤 Humanos online', value: formatMemberList(stats.onlineHumans), inline: true },
        { name: '👤 Humanos offline', value: formatMemberList(stats.offlineHumans), inline: true }
      );
      break;
    default:
      embed.addFields(
        { name: '🟢 Online', value: formatMemberList(stats.onlineMembers), inline: true },
        { name: '⚪ Offline', value: formatMemberList(stats.offlineMembers), inline: true }
      );
      break;
  }

  embed.addFields({
    name: '📌 Instruções',
    value: 'Use os botões abaixo para alternar entre as visões. Clique em 🔄 para recarregar os dados do servidor.',
    inline: false,
  });

  if (warning) {
    embed.addFields({ name: '⚠️ Aviso', value: warning, inline: false });
  }

  return embed;
}

async function fetchGuildMembers(guild) {
  try {
    return await guild.members.fetch({ withPresences: true });
  } catch {
    return null;
  }
}

module.exports = {
  data: { name: 'securitybreach', description: '🛡️ Painel de segurança staff: visão geral completa do servidor' },
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [
          criarEmbed({
            titulo: 'Acesso negado',
            descricao: 'Somente staff pode usar este comando.',
            cor: 0xE67E80,
          }),
        ],
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    const totalGuildMembers = guild.memberCount || 0;
    let members = await fetchGuildMembers(guild);
    let warning = null;

    if (!members) {
      members = guild.members.cache;
      warning = 'Não foi possível buscar todos os membros. Os dados podem estar incompletos. Verifique as intents GUILD_MEMBERS e GUILD_PRESENCES.';
    }

    salvarSnapshot(guild.id, Array.from(members.values()));
    let stats = buildStats(members, totalGuildMembers);
    const buttons = buildButtons();
    const embed = buildEmbed(stats, 'all', warning);

    const reply = await interaction.reply({ embeds: [embed], components: buttons, ephemeral: true });
    const collector = reply.createMessageComponentCollector({ time: 10 * 60 * 1000, filter: (i) => i.user.id === interaction.user.id });

    collector.on('collect', async (buttonInteraction) => {
      await buttonInteraction.deferUpdate();

      if (buttonInteraction.customId === 'sec_refresh') {
        const freshMembers = await fetchGuildMembers(guild);
        if (freshMembers) {
          members = freshMembers;
          warning = null;
          salvarSnapshot(guild.id, Array.from(members.values()));
        } else {
          warning = 'Não foi possível recarregar todos os membros. Continuando com o cache atual.';
        }
        stats = buildStats(members, totalGuildMembers);
      }

      const view = buttonInteraction.customId.replace('sec_view_', '') || 'all';
      const nextEmbed = buildEmbed(stats, view, warning);
      await buttonInteraction.editReply({ embeds: [nextEmbed], components: buttons });
    });

    collector.on('end', async () => {
      try {
        await reply.edit({ components: [] });
      } catch {}
    });
  },
};
