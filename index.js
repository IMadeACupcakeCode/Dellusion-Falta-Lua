const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client, GatewayIntentBits, ActivityType, Partials } = require('discord.js');
const { THEME } = require('./utils/theme');
const { reagendarTodosLembretes } = require('./utils/agendador');
const { handlePrefix } = require('./utils/prefix');
const { handleReaction } = require('./utils/guerraManager');

const { DISCORD_TOKEN } = process.env;

async function avisarShutdown(client) {
  try {
    const { obterConfig } = require('./utils/servidorStore');
    const { THEME } = require('./utils/theme');
    const { criarEmbed } = require('./utils/theme');
    const { removerEmbedTicketFixo } = require('./utils/fixedTicketEmbed');

    // Remove o embed fixo de ticket antes de desligar
    await removerEmbedTicketFixo(client);

    // Aviso offline no canal configurado (canalOnOff)
    for (const guild of client.guilds.cache.values()) {
      const cfg = obterConfig(guild.id);
      const canalOnOffId = cfg?.canalOnOff;
      if (canalOnOffId) {
        try {
          const canal = await guild.channels.fetch(canalOnOffId).catch(() => null);
          if (canal) {
            const embedOff = criarEmbed({
              titulo: '🔌 Falta Lua está offline!',
              descricao: 'Estou sendo desligada. Até a próxima, pecadores... 🌙',
              cor: THEME.corErro,
            });
            await canal.send({ embeds: [embedOff] });
          }
        } catch {}
      }
    }

    for (const guild of client.guilds.cache.values()) {
      const cfg = obterConfig(guild.id);
      const canalId = cfg?.canalShutdown;
      if (!canalId) continue;

      try {
        const canal = await guild.channels.fetch(canalId).catch(() => null);
        if (!canal) continue;

        const embed = criarEmbed({
          titulo: '🔌 Desligamento da Falta Lua',
          descricao: 'Estou sendo desligada agora. Até a próxima! 🌙',
          cor: THEME.corErro,
        });

        await canal.send({ embeds: [embed] });
      } catch (erro) {
        console.error(`Erro ao avisar shutdown no canal ${canalId}:`, erro);
      }
    }
  } catch (erro) {
    console.error('Erro geral no aviso de shutdown:', erro);
  }
}

async function avisarOnline(client) {
  try {
    const { obterConfig } = require('./utils/servidorStore');
    const { criarEmbed } = require('./utils/theme');
    for (const guild of client.guilds.cache.values()) {
      const cfg = obterConfig(guild.id);
      const canalId = cfg?.canalOnOff;
      if (!canalId) continue;
      try {
        const canal = await guild.channels.fetch(canalId).catch(() => null);
        if (!canal) continue;
        const embed = criarEmbed({
          titulo: '🌙 Falta Lua está online!',
          descricao: 'Estou de volta! Os espetáculos recomeçaram. ✧',
          cor: 0x2ECC71,
        });
        await canal.send({ embeds: [embed] });
      } catch {}
    }
  } catch {}
}

if (!DISCORD_TOKEN) {
  console.error('✧ ⎯ ੭ DISCORD_TOKEN não encontrado no .env. Confira o arquivo .env.example.');
  process.exit(1);
}

// Build intents dynamically so privileged intents can be toggled via env.
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.MessageContent,
];

// Privileged intents (GuildMembers, GuildPresences) require explicit enablement
// in the Discord Developer Portal. Toggle them with ENABLE_PRIVILEGED_INTENTS=true
if ((process.env.ENABLE_PRIVILEGED_INTENTS || '').toLowerCase() === 'true') {
  intents.push(GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences);
}

const partials = [Partials.Message, Partials.Channel, Partials.Reaction];
if (intents.includes(GatewayIntentBits.GuildMembers)) partials.push(Partials.GuildMember);

const client = new Client({ intents, partials });

const { enviarEmbedTicketFixo } = require('./utils/fixedTicketEmbed');

client.once('ready', () => {
  console.log(`${THEME.iconeFooter} ${THEME.nome} está online como ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'os sussurros da lua ✧', type: ActivityType.Watching }],
    status: 'online',
  });

  reagendarTodosLembretes(client);

  // Embed fixo de ticket — aparece online, some offline
  enviarEmbedTicketFixo(client);

  // Aviso online no canal configurado
  avisarOnline(client);
});

client.on('messageCreate', (message) => {
  handlePrefix(message, client);
});

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    await handleReaction(reaction, user);
  } catch (error) {
    console.error('Erro ao processar reação de guerra:', error);
  }
});

// ── Sistema de Tickets (interação com botões) ──
client.on('interactionCreate', async (interaction) => {
  const { criarTicket, reivindicarTicket, fecharTicket, convidarInterativo, abrirModalBusca, mostrarCargos, mostrarMembrosDoCargo, processarBuscaNome, convidarPorSelecao } = require('./utils/ticketManager');

  try {
    // ── Botões do painel de tickets (categorias) ──
    if (interaction.isButton() && interaction.customId.startsWith('ticket_') && !['ticket_fechar', 'ticket_reivindicar', 'ticket_invite', 'ticket_invite_search', 'ticket_invite_role', 'ticket_invite_fechar', 'ticket_invite_back', 'ticket_invite_back_roles', 'ticket_remove', 'ticket_remove_search', 'ticket_remove_role', 'ticket_remove_fechar', 'ticket_remove_back', 'ticket_remove_back_roles', 'ticket_fechar_confirmar', 'ticket_fechar_motivo', 'ticket_fechar_cancelar'].includes(interaction.customId)) {
      await criarTicket(interaction, client);
      return;
    }

    // ── Botão de reivindicar ──
    if (interaction.isButton() && interaction.customId === 'ticket_reivindicar') {
      await reivindicarTicket(interaction, client);
      return;
    }

    // ── Botão de fechar ──
    if (interaction.isButton() && interaction.customId === 'ticket_fechar') {
      await fecharTicket(interaction, client);
      return;
    }

    // ── Confirmar fechamento (sem motivo) ──
    if (interaction.isButton() && interaction.customId === 'ticket_fechar_confirmar') {
      const { executarFechamento } = require('./utils/ticketManager');
      await executarFechamento(interaction, null);
      return;
    }

    // ── Fechar com motivo (abre modal) ──
    if (interaction.isButton() && interaction.customId === 'ticket_fechar_motivo') {
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const modal = new ModalBuilder()
        .setCustomId('ticket_fechar_motivo_modal')
        .setTitle('📝 Motivo do Fechamento');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ticket_fechar_motivo_texto')
            .setLabel('📝 Motivo (opcional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: Resolvido, duplicado, sem resposta...')
            .setMaxLength(200)
            .setRequired(true),
        ),
      );

      await interaction.showModal(modal);
      return;
    }

    // ── Cancelar fechamento ──
    if (interaction.isButton() && interaction.customId === 'ticket_fechar_cancelar') {
      await interaction.update({ content: '✅ Fechamento cancelado.', components: [], embeds: [] });
      return;
    }

    // ── Modal de motivo de fechamento ──
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_fechar_motivo_modal') {
      const motivo = interaction.fields.getTextInputValue('ticket_fechar_motivo_texto');
      const { executarFechamento } = require('./utils/ticketManager');
      await executarFechamento(interaction, motivo);
      return;
    }

    // ── Painel interativo de convite ──
    if (interaction.isButton() && interaction.customId === 'ticket_invite') {
      await convidarInterativo(interaction, client);
      return;
    }

    // ── Buscar por nome (modal) ──
    if (interaction.isButton() && interaction.customId === 'ticket_invite_search') {
      await abrirModalBusca(interaction);
      return;
    }

    // ── Mostrar cargos ──
    if (interaction.isButton() && interaction.customId === 'ticket_invite_role') {
      await mostrarCargos(interaction);
      return;
    }

    // ── Fechar painel de convite ──
    if (interaction.isButton() && interaction.customId === 'ticket_invite_fechar') {
      await interaction.update({ content: '✅ Painel fechado.', components: [], embeds: [] });
      return;
    }

    // ── Voltar da busca/cargo ──
    if (interaction.isButton() && (interaction.customId === 'ticket_invite_back' || interaction.customId === 'ticket_invite_back_roles')) {
      const ticketChannel = interaction.channel;
      if (!ticketChannel.topic) {
        await interaction.update({ content: '❌ Ticket inválido.', components: [] });
        return;
      }
      let ticketInfo;
      try { ticketInfo = JSON.parse(ticketChannel.topic); } catch {
        await interaction.update({ content: '❌ Erro ao ler ticket.', components: [] });
        return;
      }
      const { criarEmbedConvidar, criarBotoesConvite } = require('./utils/ticketManager');
      const embed = criarEmbedConvidar(ticketInfo, ticketChannel);
      await interaction.update({
        embeds: [embed],
        components: criarBotoesConvite(),
      });
      return;
    }

    // ── Selecionou um cargo → mostra membros ──
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_invite_role_select') {
      await mostrarMembrosDoCargo(interaction);
      return;
    }

    // ── Selecionou um membro (de cargo) → convida ──
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_invite_member_select') {
      await convidarPorSelecao(interaction);
      return;
    }

    // ── Modal de busca por nome ──
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_invite_modal_busca') {
      await processarBuscaNome(interaction);
      return;
    }

    // ── Selecionou um usuário da busca → convida ──
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_invite_user_select') {
      await convidarPorSelecao(interaction);
      return;
    }

    // ════════════════════════════════════════════
    // REMOVER USUÁRIO — Interações
    // ════════════════════════════════════════════

    // ── Botão de remover (no ticket) — abre painel interativo ──
    if (interaction.isButton() && interaction.customId === 'ticket_remove') {
      const { removerInterativo } = require('./utils/ticketManager');
      await removerInterativo(interaction, client);
      return;
    }

    // ── Buscar por nome (modal) ──
    if (interaction.isButton() && interaction.customId === 'ticket_remove_search') {
      const { abrirModalBuscaRemover } = require('./utils/ticketManager');
      await abrirModalBuscaRemover(interaction);
      return;
    }

    // ── Mostrar cargos ──
    if (interaction.isButton() && interaction.customId === 'ticket_remove_role') {
      const { mostrarCargosRemover } = require('./utils/ticketManager');
      await mostrarCargosRemover(interaction);
      return;
    }

    // ── Fechar painel ──
    if (interaction.isButton() && interaction.customId === 'ticket_remove_fechar') {
      await interaction.update({ content: '✅ Painel fechado.', components: [], embeds: [] });
      return;
    }

    // ── Voltar da busca/cargo ──
    if (interaction.isButton() && (interaction.customId === 'ticket_remove_back' || interaction.customId === 'ticket_remove_back_roles')) {
      const ticketChannel = interaction.channel;
      if (!ticketChannel.topic) {
        await interaction.update({ content: '❌ Ticket inválido.', components: [] });
        return;
      }
      let ticketInfo;
      try { ticketInfo = JSON.parse(ticketChannel.topic); } catch {
        await interaction.update({ content: '❌ Erro ao ler ticket.', components: [] });
        return;
      }
      const { criarEmbedRemover, criarBotoesRemover } = require('./utils/ticketManager');
      const embed = criarEmbedRemover(ticketInfo, ticketChannel);
      await interaction.update({
        embeds: [embed],
        components: criarBotoesRemover(),
      });
      return;
    }

    // ── Selecionou um cargo → mostra membros ──
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_remove_role_select') {
      const { mostrarMembrosDoCargoRemover } = require('./utils/ticketManager');
      await mostrarMembrosDoCargoRemover(interaction);
      return;
    }

    // ── Selecionou um membro (de cargo) → remove ──
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_remove_member_select') {
      const { removerPorSelecao } = require('./utils/ticketManager');
      await removerPorSelecao(interaction);
      return;
    }

    // ── Modal de busca por nome ──
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_remove_modal_busca') {
      const { processarBuscaNomeRemover } = require('./utils/ticketManager');
      await processarBuscaNomeRemover(interaction);
      return;
    }

    // ── Selecionou um usuário da busca → remove ──
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_remove_user_select') {
      const { removerPorSelecao } = require('./utils/ticketManager');
      await removerPorSelecao(interaction);
      return;
    }
  } catch (error) {
    console.error('Erro no interactionCreate (ticket):', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Ocorreu um erro ao processar sua ação.',
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// ── Sistema de Fala ($say) ──
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

  try {
    // Botões principais do painel
    if (interaction.isButton() && ['say_aqui', 'say_canal', 'say_dm', 'say_voltar', 'say_cancelar', 'say_voltar_categorias', 'say_buscar_canal'].includes(interaction.customId)) {
      const { abrirModalAqui, abrirModalDM, mostrarCategorias, abrirBuscaCanal } = require('./utils/sayManager');

      if (interaction.customId === 'say_aqui') {
        await interaction.update({ content: '✍️ Abrindo formulário...', components: [], embeds: [] });
        return abrirModalAqui(interaction);
      }
      if (interaction.customId === 'say_canal') return mostrarCategorias(interaction);
      if (interaction.customId === 'say_dm') {
        await interaction.update({ content: '✍️ Abrindo formulário...', components: [], embeds: [] });
        return abrirModalDM(interaction);
      }
      if (interaction.customId === 'say_voltar') {
        const { criarEmbedFalar, criarBotoesFalar } = require('./utils/sayManager');
        return interaction.update({ embeds: [criarEmbedFalar()], components: criarBotoesFalar() });
      }
      if (interaction.customId === 'say_voltar_categorias') return mostrarCategorias(interaction);
      if (interaction.customId === 'say_buscar_canal') return abrirBuscaCanal(interaction);
      if (interaction.customId === 'say_cancelar') {
        return interaction.update({ content: '✅ Cancelado.', components: [], embeds: [] });
      }
    }

    // Selecionou uma categoria → mostra canais
    if (interaction.isStringSelectMenu() && interaction.customId === 'say_select_categoria') {
      const { mostrarCanaisDaCategoria } = require('./utils/sayManager');
      return mostrarCanaisDaCategoria(interaction);
    }

    // Selecionou um canal → abre modal
    if (interaction.isStringSelectMenu() && interaction.customId === 'say_select_canal') {
      const { abrirModalCanal } = require('./utils/sayManager');
      return abrirModalCanal(interaction);
    }

    // Modal de busca de canal
    if (interaction.isModalSubmit() && interaction.customId === 'say_busca_canal_modal') {
      const { processarBuscaCanal } = require('./utils/sayManager');
      return processarBuscaCanal(interaction);
    }

    // Modal de conteúdo
    if (interaction.isModalSubmit() && (
      interaction.customId === 'say_modal_aqui' ||
      interaction.customId.startsWith('say_modal_canal_') ||
      interaction.customId === 'say_modal_dm'
    )) {
      const { mostrarPreview } = require('./utils/sayManager');
      return mostrarPreview(interaction);
    }

    // Confirmar envio
    if (interaction.isButton() && interaction.customId.startsWith('say_enviar_')) {
      const { confirmarEnvio } = require('./utils/sayManager');
      return confirmarEnvio(interaction);
    }

    // Cancelar preview
    if (interaction.isButton() && interaction.customId === 'say_cancelar_preview') {
      return interaction.update({ content: '✅ Cancelado.', components: [], embeds: [] });
    }
  } catch (error) {
    console.error('Erro no interactionCreate (say):', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Ocorreu um erro ao processar sua ação.',
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// ── Cache de presença e membros (alimenta $securitybreach em tempo real) ──
// Só faz sentido se as intents privilegiadas estiverem ativas.
if (intents.includes(GatewayIntentBits.GuildMembers) && intents.includes(GatewayIntentBits.GuildPresences)) {
  const { clientCache, presenceMap } = require('./utils/cache');

  // Mantém o presenceMap sempre atualizado (status online/offline/etc.)
  client.on('presenceUpdate', (_oldPresence, newPresence) => {
    if (newPresence && newPresence.userId) {
      presenceMap.set(newPresence.userId, newPresence.status || 'offline');
    }
  });

  // Quando um membro entra, garante que ele esteja no cache de membros
  client.on('guildMemberAdd', (member) => {
    const entry = clientCache.get(member.guild.id);
    if (entry) entry.members.set(member.id, member);
    else clientCache.set(member.guild.id, { members: new Map([[member.id, member]]), timestamp: Date.now() });
  });

  // Quando um membro sai, remove do cache
  client.on('guildMemberRemove', (member) => {
    clientCache.get(member.guild.id)?.members.delete(member.id);
  });

  // Popula o cache de presença já no boot, para o primeiro $securitybreach não depender de fetch
  client.once('ready', async () => {
    try {
      for (const guild of client.guilds.cache.values()) {
        const members = await guild.members.fetch({ withPresences: true }).catch(() => null);
        if (members) {
          clientCache.set(guild.id, { members, timestamp: Date.now() });
          for (const [, m] of members) {
            if (m.presence) presenceMap.set(m.id, m.presence.status || 'offline');
          }
        }
      }
      console.log(`${THEME.iconeFooter} Cache de membros/presença populado.`);
    } catch (err) {
      console.error('Erro ao popular cache de membros no boot:', err);
    }
  });
} else {
  console.warn(
    '⚠️ ENABLE_PRIVILEGED_INTENTS não está ativo: $securitybreach fará fetch sob demanda (mais lento). Ative no .env para cache em tempo real.'
  );
}

process.on('SIGINT', async () => {
  console.log('\n✧ ⎯ ੭ Recebido SIGINT, avisando servidores...');
  await avisarShutdown(client);
  console.log('✧ ⎯ ੭ Avisos enviados. Desligando...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n✧ ⎯ ੭ Recebido SIGTERM, avisando servidores...');
  await avisarShutdown(client);
  console.log('✧ ⎯ ੭ Avisos enviados. Desligando...');
  process.exit(0);
});

client.login(DISCORD_TOKEN);