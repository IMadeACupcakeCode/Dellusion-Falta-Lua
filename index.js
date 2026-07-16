require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Partials } = require('discord.js');
const { THEME } = require('./utils/theme');
const { reagendarTodosLembretes } = require('./utils/agendador');
const { handlePrefix } = require('./utils/prefix');
const { handleReaction } = require('./utils/guerraManager');
const { registrar: registrarSlash, tratar: tratarSlash } = require('./utils/slash');

const { DISCORD_TOKEN } = process.env;

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

client.once('ready', () => {
  console.log(`${THEME.iconeFooter} ${THEME.nome} está online como ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'os sussurros da lua ✧', type: ActivityType.Watching }],
    status: 'online',
  });

  reagendarTodosLembretes(client);

  // Registra os slash commands (ex.: /buscar com autocomplete ao vivo)
  registrarSlash().catch((err) => console.error('Falha ao registrar slash commands:', err));
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

// ── Slash commands: roteia interações (autocomplete e chat-input) ──
client.on('interactionCreate', (interaction) => {
  tratarSlash(interaction).catch((err) => console.error('Erro no interactionCreate:', err));
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

client.login(DISCORD_TOKEN);