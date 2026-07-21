const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const path = require('path');
const { obterConfig, salvarConfig } = require('./ticketStore');

// ── Cores do Circo ──
const CORES = {
  DESTAQUE: 0xD4A017,   // dourado
  PRINCIPAL: 0x8B0000,  // vermelho escuro
  SECUNDARIO: 0x4A0E4E, // roxo profundo
  SUCESSO: 0x2ECC71,
  ALERTA: 0xE74C3C,
  INFO: 0x3498DB,
};

// ── Categorias do Ticket ──
const CATEGORIAS = [
  { emoji: '📜', nome: 'Lore', valor: 'ticket_lore', cor: 0xD4A017 },
  { emoji: '📋', nome: 'Requisitos', valor: 'ticket_requisitos', cor: 0xE67E22 },
  { emoji: '⚠️', nome: 'Denúncias', valor: 'ticket_denuncias', cor: 0xE74C3C },
  { emoji: '🤝', nome: 'Parcerias', valor: 'ticket_parcerias', cor: 0x2ECC71 },
  { emoji: '⭐', nome: 'VIP', valor: 'ticket_vip', cor: 0xF1C40F },
  { emoji: '🎙️', nome: 'Entrevista', valor: 'ticket_entrevista', cor: 0x3498DB },
  { emoji: '❓', nome: 'Outro Motivo', valor: 'ticket_outro', cor: 0x95A5A6 },
];

// Mapeamento oficial de categorias (fornecido pelo usuário)
const CATEGORIAS_POR_ID = {
  '1515754334791405691': 'ticket_lore',
  '1515754466987606086': 'ticket_requisitos',
  '1515754530850209913': 'ticket_denuncias',
  '1515754546637307944': 'ticket_parcerias',
  '1519234278418812938': 'ticket_vip',
  '1526153633522258020': 'ticket_entrevista',
  '1515754563565518938': 'ticket_outro',
};

const CATEGORIA_POR_VALOR = {};
for (const [catId, valor] of Object.entries(CATEGORIAS_POR_ID)) {
  CATEGORIA_POR_VALOR[valor] = catId;
}

// ── Emotes para os botões do painel ──
function criarBotoesPainel() {
  const linhas = [];
  let linha = new ActionRowBuilder();
  let count = 0;

  for (const cat of CATEGORIAS) {
    const btn = new ButtonBuilder()
      .setCustomId(cat.valor)
      .setLabel(cat.nome)
      .setEmoji(cat.emoji)
      .setStyle(ButtonStyle.Secondary);

    linha.addComponents(btn);
    count++;

    if (count === 5) {
      linhas.push(linha);
      linha = new ActionRowBuilder();
      count = 0;
    }
  }

  if (count > 0) linhas.push(linha);
  return linhas;
}

// ── Embed principal do Painel ──
function criarEmbedPainel() {
  const imagemPath = path.join(__dirname, '..', 'imagens', 'Ticket.png');

  const descricao = [
    '✧ ﾟ･ ✦ ･ ｡･ﾟ ✧ ﾟ･ ✦ ･ ｡･ﾟ ✧',
    '',
    '🎪 **Bem-vindo ao Picadeiro Central** 🎪',
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
    '',
    'Se acalme, pecadores não possuem muitas escolhas. 😊',
    '',
    'Mas... acreditamos que possamos',
    '**te dar algumas opções**',
    'para que suas dúvidas sejam respondidas.',
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
    '',
    '🎭 **Escolha uma das categorias abaixo** 🎭',
    'e um de nossos palhaços atenderá você...',
    '',
    '✧ ﾟ･ ✦ ･ ｡･ﾟ ✧ ﾟ･ ✦ ･ ｡･ﾟ ✧',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(CORES.DESTAQUE)
    .setTitle('🎪  Ticket  —  Picadeiro Central  🎪')
    .setDescription(descricao)
    .setThumbnail('attachment://Ticket.png')
    .setFooter({
      text: '✧ ⎯ ੭ Falta Lua — os espetáculos nunca terminam...',
    })
    .setTimestamp();

  return { embed, arquivo: imagemPath };
}

// ── Embed de Ticket Aberto ──
function criarEmbedTicketAberto(usuario, categoria, contador) {
  const descricao = [
    '🎪 **⸻⸻⸻ O PICADEIRO SE ABRE ⸻⸻⸻** 🎪',
    '',
    `📌 **Ticket #${String(contador).padStart(4, '0')}**`,
    `👤 **Aberto por:** ${usuario}`,
    `🏷️ **Categoria:** ${categoria.emoji} ${categoria.nome}`,
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
    '',
    'Um espetáculo está prestes a começar...',
    'Nossos **palhaços** já foram notificados',
    'e logo estarão aqui para lhe atender.',
    '',
    '✨ Enquanto isso, descreva seu problema',
    'com todos os detalhes possíveis.',
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
    '',
    '🎭 **Aguardem, o show vai começar...** 🎭',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(categoria.cor || CORES.PRINCIPAL)
    .setTitle(`🎪  Ticket Aberto  —  ${categoria.emoji} ${categoria.nome}  🎪`)
    .setDescription(descricao)
    .setThumbnail('attachment://Ticket.png')
        .setFooter({
      text: `✧ ⎯ ੭ Falta Lua • Ticket #${String(contador).padStart(4, '0')}`,
    })
    .setTimestamp();

  return embed;
}

// ── Embed de Ticket Reivindicado ──
function criarEmbedTicketReivindicado(usuario, categoria, contador, staffMember) {
  const descricao = [
    '🎪 **⸻⸻⸻ UM PALHAÇO ASSUMIU O PICADEIRO ⸻⸻⸻** 🎪',
    '',
    `📌 **Ticket #${String(contador).padStart(4, '0')}**`,
    `👤 **Aberto por:** ${usuario}`,
    `🏷️ **Categoria:** ${categoria.emoji} ${categoria.nome}`,
    `🎭 **Reivindicado por:** ${staffMember}`,
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
    '',
    'O circo já tem seu mestre de cerimônias! 🎩',
    '',
    'O staff member acima **assumiu** este ticket',
    'e cuidará pessoalmente de você.',
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(CORES.SUCESSO)
    .setTitle(`🎪  Ticket Reivindicado  —  ${categoria.emoji} ${categoria.nome}  🎪`)
    .setDescription(descricao)
        .setFooter({
      text: `✧ ⎯ ੭ Falta Lua • Ticket #${String(contador).padStart(4, '0')} • Reivindicado`,
    })
    .setTimestamp();

  return embed;
}

// ── Embed de Ticket Fechado ──
function criarEmbedTicketFechado(ticketInfo) {
  const descricao = [
    '🎪 **⸻⸻⸻ O PICADEIRO SE FECHA ⸻⸻⸻** 🎪',
    '',
    `📌 **Ticket #${String(ticketInfo.contador).padStart(4, '0')}**`,
    `👤 **Aberto por:** ${ticketInfo.usuarioTag}`,
    `🏷️ **Categoria:** ${ticketInfo.categoriaEmoji} ${ticketInfo.categoriaNome}`,
    ticketInfo.staffTag ? `🎭 **Atendido por:** ${ticketInfo.staffTag}` : '',
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
    '',
    'O espetáculo chegou ao fim... 🎭',
    '',
    'Este ticket foi **fechado** e em breve',
    'o canal será removido.',
    '',
    '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
  ].filter(Boolean).join('\n');

  const embed = new EmbedBuilder()
    .setColor(CORES.ALERTA)
    .setTitle(`🎪  Ticket Fechado  —  ${ticketInfo.categoriaEmoji} ${ticketInfo.categoriaNome}  🎪`)
    .setDescription(descricao)
        .setFooter({
      text: `✧ ⎯ ੭ Falta Lua • Ticket #${String(ticketInfo.contador).padStart(4, '0')} • Fechado`,
    })
    .setTimestamp();

  return embed;
}

// ── Criar os botões de ação do ticket ──
function criarBotoesTicket(reivindicado = false) {
  const row = new ActionRowBuilder();

  const btnFechar = new ButtonBuilder()
    .setCustomId('ticket_fechar')
    .setLabel('🔒 Fechar Ticket')
    .setStyle(ButtonStyle.Danger);

  const btnReivindicar = new ButtonBuilder()
    .setCustomId('ticket_reivindicar')
    .setLabel('🎪 Reinvindicar Ticket')
    .setStyle(ButtonStyle.Success)
    .setDisabled(reivindicado);

  row.addComponents(btnFechar, btnReivindicar);
  return row;
}

// ── Busca categoria pelo valor do customId ──
function buscarCategoria(valor) {
  return CATEGORIAS.find((c) => c.valor === valor);
}

// ── Resolve categoria específica para o ticket ──
function resolverCategoriaEId(ticketValor, cfg) {
  const categoria = buscarCategoria(ticketValor);
  if (!categoria) return null;

  const categoriaId = cfg.categoriasPorTipo?.[ticketValor] || CATEGORIA_POR_VALOR[ticketValor] || cfg.categoriaId;
  return { categoria, categoriaId };
}

// ── Cria o canal do ticket ──
async function criarTicket(interaction, client) {
  const guildId = interaction.guildId;
  const cfg = obterConfig(guildId);
  const ticketValor = interaction.customId;

  const resultado = resolverCategoriaEId(ticketValor, cfg);
  if (!resultado) {
    return interaction.reply({
      content: '❌ Categoria de ticket inválida.',
      ephemeral: true,
    });
  }

  const { categoria, categoriaId } = resultado;

  if (!categoriaId) {
    return interaction.reply({
      content: '❌ Esta categoria de tickets não foi configurada. Peça a um staff para configurar.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  // Incrementa contador
  cfg.contador = (cfg.contador || 0) + 1;
  salvarConfig(guildId, cfg);

  const contador = cfg.contador;
  const nomeCanal = `ticket-${String(contador).padStart(4, '0')}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // Permissões
  const permissoes = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  // Adiciona cargos de staff
  const cargosStaff = cfg.cargosStaff?.length > 0 ? cfg.cargosStaff : [];
  for (const roleId of cargosStaff) {
    permissoes.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  try {
    const canal = await interaction.guild.channels.create({
      name: nomeCanal,
      type: ChannelType.GuildText,
      parent: categoriaId,
      permissionOverwrites: permissoes,
      topic: `Ticket #${String(contador).padStart(4, '0')} — ${categoria.nome} — Aberto por ${interaction.user.tag}`,
    });

    // Embed de abertura
    const embedTicket = criarEmbedTicketAberto(interaction.user, categoria, contador);
    const botoes = criarBotoesTicket(false);
    const msgTicket = await canal.send({
      content: `${cargosStaff.map((id) => `<@&${id}>`).join(' ')}`,
      embeds: [embedTicket],
      components: [botoes],
      files: [{
        attachment: path.join(__dirname, '..', 'imagens', 'Ticket.png'),
        name: 'Ticket.png',
      }],
    });

    // Salva informações do ticket no canal (usando topic)
    const ticketInfo = {
      channelId: canal.id,
      messageId: msgTicket.id,
      userId: interaction.user.id,
      usuarioTag: interaction.user.tag,
      contador,
      categoriaValor: categoria.valor,
      categoriaNome: categoria.nome,
      categoriaEmoji: categoria.emoji,
      staffId: null,
      staffTag: null,
      abertoEm: Date.now(),
    };

    await canal.setTopic(JSON.stringify(ticketInfo));

    await interaction.editReply({
      content: `✅ **Ticket #${String(contador).padStart(4, '0')}** criado! Acesse: ${canal}`,
      ephemeral: true,
    });
  } catch (erro) {
    console.error('Erro ao criar ticket:', erro);
    await interaction.editReply({
      content: '❌ Ocorreu um erro ao criar o ticket. Verifique se tenho permissões para criar canais.',
      ephemeral: true,
    });
  }
}

// ── Reivindicar Ticket ──
async function reivindicarTicket(interaction, client) {
  const guildId = interaction.guildId;
  const cfg = obterConfig(guildId);
  const cargosStaff = cfg.cargosStaff?.length > 0 ? cfg.cargosStaff : [];

  // Verifica se é staff
  const memberRoles = interaction.member.roles.cache.map((r) => r.id);
  const isStaff = memberRoles.some((r) => cargosStaff.includes(r)) ||
    interaction.member.permissions.has('Administrator') ||
    interaction.member.permissions.has('ManageGuild');

  if (!isStaff) {
    return interaction.reply({
      content: '❌ Apenas membros da **staff** podem reivindicar tickets!',
      ephemeral: true,
    });
  }

  try {
    const mensagem = interaction.message;
    const embedAtual = mensagem.embeds[0];
    if (!embedAtual) return;

    // Extrai info do topic
    const topic = interaction.channel.topic;
    let ticketInfo;
    try {
      ticketInfo = JSON.parse(topic);
    } catch {
      return interaction.reply({ content: '❌ Erro ao ler informações do ticket.', ephemeral: true });
    }

    ticketInfo.staffId = interaction.user.id;
    ticketInfo.staffTag = interaction.user.tag;

    await interaction.channel.setTopic(JSON.stringify(ticketInfo));

    // Atualiza embed
    const categoria = buscarCategoria(ticketInfo.categoriaValor) || {
      emoji: ticketInfo.categoriaEmoji,
      nome: ticketInfo.categoriaNome,
      cor: CORES.PRINCIPAL,
    };

    const embedReivindicado = criarEmbedTicketReivindicado(
      ticketInfo.usuarioTag,
      categoria,
      ticketInfo.contador,
      interaction.user
    );

    const botoes = criarBotoesTicket(true); // desabilita reivindicar

    await mensagem.edit({
      embeds: [embedReivindicado],
      components: [botoes],
      files: [{
        attachment: path.join(__dirname, '..', 'imagens', 'Ticket.png'),
        name: 'Ticket.png',
      }],
    });

    await interaction.reply({
      content: `🎪 O palhaço **${interaction.user}** assumiu este espetáculo!`,
      ephemeral: false,
    });
  } catch (erro) {
    console.error('Erro ao reivindicar ticket:', erro);
    await interaction.reply({
      content: '❌ Erro ao reivindicar. Tente novamente.',
      ephemeral: true,
    });
  }
}

// ── Fechar Ticket ──
async function fecharTicket(interaction, client) {
  try {
    const topic = interaction.channel.topic;
    let ticketInfo;
    try {
      ticketInfo = JSON.parse(topic);
    } catch {
      ticketInfo = { contador: 0, categoriaEmoji: '❓', categoriaNome: 'Desconhecido', usuarioTag: 'Desconhecido', staffTag: null };
    }

    const embedFechado = criarEmbedTicketFechado(ticketInfo);

    // Envia embed de fechamento
    await interaction.reply({
      content: '🔒 Fechando o picadeiro... O canal será removido em **10 segundos**.',
      embeds: [embedFechado],
      files: [{
        attachment: path.join(__dirname, '..', 'imagens', 'Ticket.png'),
        name: 'Ticket.png',
      }],
    });

    // Remove permissão do usuário primeiro
    await interaction.channel.permissionOverwrites.edit(ticketInfo.userId, {
      ViewChannel: false,
    });

    // Deleta o canal após 10 segundos
    setTimeout(async () => {
      try {
        await interaction.channel.delete('Ticket fechado.');
      } catch {
        // canal já pode ter sido deletado
      }
    }, 10000);
  } catch (erro) {
    console.error('Erro ao fechar ticket:', erro);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Erro ao fechar.', ephemeral: true });
    }
  }
}

// ── Comando $ticket: Envia o painel ──
async function enviarPainel(message, client) {
  const guildId = message.guildId;
  const cfg = obterConfig(guildId);

  const { embed, arquivo } = criarEmbedPainel();
  const botoes = criarBotoesPainel();

  await message.channel.send({
    embeds: [embed],
    components: botoes,
    files: [{
      attachment: arquivo,
      name: 'Ticket.png',
    }],
  });

  await message.reply({ content: '✅ **Painel de Tickets** enviado com sucesso!', ephemeral: true });
}

// ── Comando $ticket config <#categoria> ──
async function configurarTicket(message, args, client) {
  const guildId = message.guildId;

  if (args[0] === 'config') {
    const categoriaId = args[1]?.replace(/[<#>]/g, '') || '';
    const categoria = message.guild.channels.cache.get(categoriaId);

    if (!categoria || categoria.type !== ChannelType.GuildCategory) {
      return message.reply('❌ Especifique uma **categoria** válida: `$ticket config #categoria`');
    }

    const cfg = obterConfig(guildId);
    cfg.categoriaId = categoriaId;
    salvarConfig(guildId, cfg);

    return message.reply(`✅ **Categoria padrão de Tickets definida:** ${categoria.name}`);
  }

  if (args[0] === 'categoria' && args[1]) {
    const tipo = args[1].toLowerCase();
    const categoriaId = args[2]?.replace(/[<#>]/g, '') || '';

    if (!CATEGORIA_POR_VALOR[tipo]) {
      return message.reply('❌ Tipo inválido. Use: lore, requisitos, denuncias, parcerias, vip, entrevista, outro');
    }

    const categoria = message.guild.channels.cache.get(categoriaId);
    if (!categoria || categoria.type !== ChannelType.GuildCategory) {
      return message.reply(`❌ Especifique uma categoria válida: \`$ticket categoria ${tipo} #categoria\``);
    }

    const cfg = obterConfig(guildId);
    cfg.categoriasPorTipo = cfg.categoriasPorTipo || {};
    cfg.categoriasPorTipo[tipo] = categoriaId;
    salvarConfig(guildId, cfg);

    return message.reply(`✅ **Categoria para \`${tipo}\` definida:** ${categoria.name}`);
  }

  if (args[0] === 'staff' && args[1] === 'add') {
    const roleId = args[2]?.replace(/[<@&>]/g, '') || '';
    const role = message.guild.roles.cache.get(roleId);

    if (!role) return message.reply('❌ Especifique um cargo: `$ticket staff add @cargo`');

    const cfg = obterConfig(guildId);
    if (!cfg.cargosStaff.includes(roleId)) {
      cfg.cargosStaff.push(roleId);
      salvarConfig(guildId, cfg);
    }

    return message.reply(`✅ **Cargo adicionado à staff de tickets:** ${role}`);
  }

  if (args[0] === 'staff' && args[1] === 'remove') {
    const roleId = args[2]?.replace(/[<@&>]/g, '') || '';

    const cfg = obterConfig(guildId);
    cfg.cargosStaff = cfg.cargosStaff.filter((id) => id !== roleId);
    salvarConfig(guildId, cfg);

    return message.reply(`✅ Cargo removido da staff de tickets.`);
  }

  if (args[0] === 'ver') {
    const cfg = obterConfig(guildId);
    const categoria = cfg.categoriaId ? message.guild.channels.cache.get(cfg.categoriaId) : null;
    const cargos = cfg.cargosStaff.map((id) => {
      const role = message.guild.roles.cache.get(id);
      return role ? `${role}` : `\`${id}\``;
    }).join(', ') || '`Nenhum`';

    const linhas = CATEGORIAS.map((cat) => {
      const id = cfg.categoriasPorTipo?.[cat.valor] || CATEGORIA_POR_VALOR[cat.valor];
      const canal = id ? message.guild.channels.cache.get(id) : null;
      return `${cat.emoji} **${cat.nome}:** ${canal ? canal.name : '`Não definida`'}`;
    }).join('\n');

    const descricao = [
      `**📂 Categoria padrão:** ${categoria ? categoria.name : '`Não definida`'}`,
      '',
      linhas,
      '',
      `**👥 Cargos Staff:** ${cargos}`,
      `**🔢 Tickets criados:** ${cfg.contador || 0}`,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(CORES.DESTAQUE)
      .setTitle('🎪 Configuração dos Tickets 🎪')
      .setDescription(descricao)
      .setFooter({ text: 'Use $ticket config #categoria | $ticket categoria <tipo> #categoria | $ticket staff add/remove @cargo' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // Help
  const embed = new EmbedBuilder()
    .setColor(CORES.DESTAQUE)
    .setTitle('🎪  Comandos de Ticket  🎪')
    .setDescription([
      '`$ticket` — Envia o painel de tickets',
      '`$ticket config #categoria` — Define a categoria padrão dos canais',
      '`$ticket categoria <tipo> #categoria` — Define categoria específica por tipo',
      '`$ticket staff add @cargo` — Adiciona cargo à staff',
      '`$ticket staff remove @cargo` — Remove cargo da staff',
      '`$ticket ver` — Ver configuração atual',
      '`$fechar` — Fecha o ticket deste canal',
    ].join('\n'))
    .setFooter({ text: '✧ ⎯ ੭ Falta Lua' })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

module.exports = {
  CATEGORIAS,
  CORES,
  CATEGORIAS_POR_ID,
  CATEGORIA_POR_VALOR,
  criarEmbedPainel,
  criarBotoesPainel,
  criarEmbedTicketAberto,
  criarEmbedTicketReivindicado,
  criarEmbedTicketFechado,
  criarBotoesTicket,
  buscarCategoria,
  resolverCategoriaEId,
  criarTicket,
  reivindicarTicket,
  fecharTicket,
  enviarPainel,
  configurarTicket,
};
