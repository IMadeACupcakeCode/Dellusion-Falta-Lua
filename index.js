require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { THEME, criarEmbed } = require('./utils/theme');
const { reagendarTodosLembretes } = require('./utils/agendador');

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('✧ ⎯ ੭ DISCORD_TOKEN não encontrado no .env. Confira o arquivo .env.example.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Carrega dinamicamente todos os comandos da pasta /commands
const pastaComandos = path.join(__dirname, 'commands');
const arquivosComandos = fs.readdirSync(pastaComandos).filter((f) => f.endsWith('.js'));

for (const arquivo of arquivosComandos) {
  const comando = require(path.join(pastaComandos, arquivo));
  if (comando?.data && comando?.execute) {
    client.commands.set(comando.data.name, comando);
  }
}

client.once('ready', () => {
  console.log(`${THEME.iconeFooter} ${THEME.nome} está online como ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'os sussurros da lua ✧', type: ActivityType.Watching }],
    status: 'online',
  });

  reagendarTodosLembretes(client);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const comando = client.commands.get(interaction.commandName);
  if (!comando) return;

  try {
    await comando.execute(interaction, client);
  } catch (erro) {
    console.error(`✧ ⎯ ੭ Erro ao executar /${interaction.commandName}:`, erro);

    const embedErro = criarEmbed({
      titulo: 'Algo se perdeu no caminho',
      descricao: 'Tive um problema ao executar esse comando. Tente novamente em instantes.',
      cor: 0xE67E80,
    });

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embedErro], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embedErro], ephemeral: true });
    }
  }
});

client.login(DISCORD_TOKEN);
