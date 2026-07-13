require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType, Partials } = require('discord.js');
const { THEME } = require('./utils/theme');
const { reagendarTodosLembretes } = require('./utils/agendador');
const { handlePrefix } = require('./utils/prefix');
const { handleReaction } = require('./utils/guerraManager');

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

client.login(DISCORD_TOKEN);
