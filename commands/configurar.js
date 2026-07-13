const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { obterConfig, salvarConfig, TIPOS_ANUNCIO } = require('../utils/servidorStore');

function mencionarCanais(ids, client) {
  if (!ids || ids.length === 0) return '`nenhum definido`';
  return ids.map((id) => `<#${id}>`).join('  ·  ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configurar')
    .setDescription('Define onde a bot fala e organiza os canais de anúncio (requer gerir servidor)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('permitir')
        .setDescription('Adiciona um canal à lista de onde a bot pode falar')
        .addChannelOption((op) =>
          op
            .setName('canal')
            .setDescription('Canal que passará a ser permitido')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('proibir')
        .setDescription('Bloqueia a bot de falar num canal específico')
        .addChannelOption((op) =>
          op
            .setName('canal')
            .setDescription('Canal que será bloqueado')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('liberar')
        .setDescription('Remove um canal da lista de permitidos')
        .addChannelOption((op) =>
          op
            .setName('canal')
            .setDescription('Canal a remover dos permitidos')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('desproibir')
        .setDescription('Remove um canal da lista de bloqueados')
        .addChannelOption((op) =>
          op
            .setName('canal')
            .setDescription('Canal a desbloquear')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('anuncio')
        .setDescription('Define o canal de um tipo de anúncio')
        .addStringOption((op) =>
          op
            .setName('tipo')
            .setDescription('Tipo de anúncio')
            .setRequired(true)
            .addChoices(
              ...TIPOS_ANUNCIO.map((t) => ({ name: t, value: t }))
            )
        )
        .addChannelOption((op) =>
          op
            .setName('canal')
            .setDescription('Canal onde esse tipo de anúncio será enviado')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('limparanuncio')
        .setDescription('Remove o canal definido para um tipo de anúncio')
        .addStringOption((op) =>
          op
            .setName('tipo')
            .setDescription('Tipo de anúncio a limpar')
            .setRequired(true)
            .addChoices(...TIPOS_ANUNCIO.map((t) => ({ name: t, value: t })))
        )
    )
    .addSubcommand((sub) => sub.setName('ver').setDescription('Mostra a configuração atual do servidor')),

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const sub = interaction.options.getSubcommand();
    const cfg = obterConfig(guildId);

    if (sub === 'permitir') {
      const canal = interaction.options.getChannel('canal');
      if (!cfg.canaisPermitidos.includes(canal.id)) cfg.canaisPermitidos.push(canal.id);
      salvarConfig(guildId, cfg);
      const embed = criarEmbed({
        titulo: 'Canal permitido',
        descricao: `Agora falo em ${canal}.`,
        cor: THEME.corSucesso,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'proibir') {
      const canal = interaction.options.getChannel('canal');
      if (!cfg.canaisBloqueados.includes(canal.id)) cfg.canaisBloqueados.push(canal.id);
      salvarConfig(guildId, cfg);
      const embed = criarEmbed({
        titulo: 'Canal proibido',
        descricao: `Parei de falar em ${canal}.`,
        cor: 0xE67E80,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'liberar') {
      const canal = interaction.options.getChannel('canal');
      cfg.canaisPermitidos = cfg.canaisPermitidos.filter((id) => id !== canal.id);
      salvarConfig(guildId, cfg);
      const embed = criarEmbed({
        titulo: 'Canal liberado',
        descricao: `Removi ${canal} dos permitidos.`,
        cor: THEME.corSucesso,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'desproibir') {
      const canal = interaction.options.getChannel('canal');
      cfg.canaisBloqueados = cfg.canaisBloqueados.filter((id) => id !== canal.id);
      salvarConfig(guildId, cfg);
      const embed = criarEmbed({
        titulo: 'Canal desproibido',
        descricao: `Liberei ${canal} para eu falar.`,
        cor: THEME.corSucesso,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'anuncio') {
      const tipo = interaction.options.getString('tipo');
      const canal = interaction.options.getChannel('canal');
      cfg.anuncios[tipo] = canal.id;
      salvarConfig(guildId, cfg);
      const embed = criarEmbed({
        titulo: 'Canal de anúncio definido',
        descricao: `Anúncios do tipo **${tipo}** serão enviados em ${canal}.`,
        cor: THEME.corSucesso,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'limparanuncio') {
      const tipo = interaction.options.getString('tipo');
      cfg.anuncios[tipo] = null;
      salvarConfig(guildId, cfg);
      const embed = criarEmbed({
        titulo: 'Canal de anúncio limpo',
        descricao: `Não há mais canal definido para anúncios do tipo **${tipo}**.`,
        cor: THEME.corSucesso,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'ver') {
      const anuncios = TIPOS_ANUNCIO.map((t) => {
        const id = cfg.anuncios[t];
        return `˖ **${t}**: ${id ? `<#${id}>` : '`não definido`'}`;
      }).join('\n');

      const descricao =
        `**Canais permitidos:** ${mencionarCanais(cfg.canaisPermitidos, client)}\n` +
        `**Canais proibidos:** ${mencionarCanais(cfg.canaisBloqueados, client)}\n\n` +
        `**Anúncios por tipo:**\n${anuncios}\n\n` +
        `_Se "permitidos" estiver vazio, falo em qualquer canal (exceto os proibidos)._`;

      const embed = criarEmbed({
        titulo: 'Configuração atual da lua',
        descricao,
        cor: THEME.corPrincipal,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};