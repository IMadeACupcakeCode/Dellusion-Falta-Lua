require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('✧ ⎯ ੭ Faltam DISCORD_TOKEN e/ou CLIENT_ID no arquivo .env');
  process.exit(1);
}

const comandos = [];
const pastaComandos = path.join(__dirname, 'commands');
const arquivos = fs.readdirSync(pastaComandos).filter((f) => f.endsWith('.js'));

for (const arquivo of arquivos) {
  const comando = require(path.join(pastaComandos, arquivo));
  if (comando?.data) comandos.push(comando.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`✧ ⎯ ੭ Registrando ${comandos.length} comando(s)...`);

    if (GUILD_ID) {
      // Registro só num servidor: aparece quase instantaneamente. Ótimo pra testes.
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: comandos });
      console.log(`✧ ⎯ ੭ Comandos registrados no servidor ${GUILD_ID}.`);
    } else {
      // Registro global: pode levar até ~1h pra propagar em todos os servidores.
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: comandos });
      console.log('✧ ⎯ ੭ Comandos registrados globalmente.');
    }
  } catch (erro) {
    console.error('✧ ⎯ ੭ Erro ao registrar comandos:', erro);
  }
})();
