const { ChannelType } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { enviarPainel, configurarTicket } = require('../utils/ticketManager');

module.exports = {
  data: {
    name: 'ticket',
    description: '🎪 Sistema de Tickets — Envia o painel ou configura o sistema',
    options: [
      {
        name: 'acao',
        description: 'O que deseja fazer?',
        type: 3,
        required: true,
        choices: [
          { name: '🎪 Enviar Painel', value: 'enviar' },
          { name: '📂 Configurar Categoria Padrão', value: 'config' },
          { name: '📌 Configurar Categoria por Tipo', value: 'categoria' },
          { name: '👥 Adicionar Staff', value: 'staff_add' },
          { name: '👥 Remover Staff', value: 'staff_remove' },
          { name: '👁️ Ver Config', value: 'ver' },
        ],
      },
      {
        name: 'canal_ou_cargo',
        description: 'Canal, categoria ou cargo',
        type: 8,
        required: false,
      },
      {
        name: 'tipo',
        description: 'Tipo do ticket (para configurar categoria por tipo)',
        type: 3,
        required: false,
        choices: [
          { name: '📜 Lore', value: 'lore' },
          { name: '📋 Requisitos', value: 'requisitos' },
          { name: '⚠️ Denúncias', value: 'denuncias' },
          { name: '🤝 Parcerias', value: 'parcerias' },
          { name: '⭐ VIP', value: 'vip' },
          { name: '🎙️ Entrevista', value: 'entrevista' },
          { name: '❓ Outro', value: 'outro' },
        ],
      },
    ],
  },

  async execute(interaction, client) {
    const acao = interaction.options.getString('acao');
    const alvo = interaction.options.get('canal_ou_cargo')?.value;
    const tipo = interaction.options.getString('tipo');
    const guildId = interaction.guildId;

    const { obterConfig, salvarConfig } = require('../utils/ticketStore');
    const cfg = obterConfig(guildId);

    if (acao === 'enviar') {
      const { criarEmbedPainel, criarBotoesPainel } = require('../utils/ticketManager');
      const path = require('path');

      const { embed, arquivo } = criarEmbedPainel();
      const botoes = criarBotoesPainel();

      await interaction.channel.send({
        embeds: [embed],
        components: botoes,
        files: [{ attachment: arquivo, name: 'Ticket.png' }],
      });

      return interaction.reply({ content: '✅ **Painel de Tickets** enviado!', ephemeral: true });
    }

    if (acao === 'config') {
      if (!alvo) return interaction.reply({ content: '❌ Especifique uma categoria!', ephemeral: true });

      const { ChannelType } = require('discord.js');
      const canal = interaction.guild.channels.cache.get(alvo);
      if (!canal || canal.type !== ChannelType.GuildCategory) {
        return interaction.reply({ content: '❌ Isso não é uma categoria válida.', ephemeral: true });
      }

      cfg.categoriaId = alvo;
      salvarConfig(guildId, cfg);

      return interaction.reply({ content: `✅ **Categoria padrão definida:** ${canal.name}`, ephemeral: false });
    }

    if (acao === 'categoria') {
      if (!tipo || !alvo) {
        return interaction.reply({
          content: '❌ Especifique um tipo e uma categoria!\nEx: `/ticket acao:categoria tipo:lore canal_ou_cargo:#categoria`',
          ephemeral: true,
        });
      }

      const { ChannelType, CATEGORIA_POR_VALOR } = require('../utils/ticketManager');
      const canal = interaction.guild.channels.cache.get(alvo);

      if (!canal || canal.type !== ChannelType.GuildCategory) {
        return interaction.reply({ content: '❌ Isso não é uma categoria válida.', ephemeral: true });
      }

      cfg.categoriasPorTipo = cfg.categoriasPorTipo || {};
      cfg.categoriasPorTipo[tipo] = alvo;
      salvarConfig(guildId, cfg);

      return interaction.reply({ content: `✅ **Categoria para \`${tipo}\` definida:** ${canal.name}`, ephemeral: false });
    }

    if (acao === 'staff_add') {
      if (!alvo) return interaction.reply({ content: '❌ Especifique um cargo!', ephemeral: true });

      const role = interaction.guild.roles.cache.get(alvo);
      if (!role) return interaction.reply({ content: '❌ Cargo não encontrado.', ephemeral: true });

      if (!cfg.cargosStaff.includes(alvo)) {
        cfg.cargosStaff.push(alvo);
        salvarConfig(guildId, cfg);
      }

      return interaction.reply({ content: `✅ **Staff adicionado:** ${role}`, ephemeral: false });
    }

    if (acao === 'staff_remove') {
      if (!alvo) return interaction.reply({ content: '❌ Especifique um cargo!', ephemeral: true });

      cfg.cargosStaff = cfg.cargosStaff.filter((id) => id !== alvo);
      salvarConfig(guildId, cfg);

      return interaction.reply({ content: `✅ Cargo removido da staff.`, ephemeral: false });
    }

    if (acao === 'ver') {
      const { EmbedBuilder, CATEGORIAS, CATEGORIAS_POR_ID } = require('../utils/ticketManager');
      const categoriaPadrao = cfg.categoriaId ? interaction.guild.channels.cache.get(cfg.categoriaId) : null;
      const cargos = cfg.cargosStaff.map((id) => {
        const role = interaction.guild.roles.cache.get(id);
        return role ? `${role}` : `\`${id}\``;
      }).join(', ') || '`Nenhum`';

      const linhas = CATEGORIAS.map((cat) => {
        const id = cfg.categoriasPorTipo?.[cat.valor] || CATEGORIAS_POR_ID[cat.valor];
        const canal = id ? interaction.guild.channels.cache.get(id) : null;
        return `${cat.emoji} **${cat.nome}:** ${canal ? canal.name : '`Não definida`'}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xD4A017)
        .setTitle('🎪 Configuração dos Tickets 🎪')
        .setDescription([
          `**📂 Categoria padrão:** ${categoriaPadrao ? categoriaPadrao.name : '`Não definida`'}`,
          '',
          linhas,
          '',
          `**👥 Cargos Staff:** ${cargos}`,
          `**🔢 Tickets criados:** ${cfg.contador || 0}`,
        ].join('\n'))
        .setFooter({ text: '✧ ⎯ ੭ Falta Lua' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  },
};