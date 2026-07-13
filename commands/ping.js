module.exports = {
  data: { name: 'ping', description: '🏓 Responde Pong!' },
  async execute(interaction) {
    return interaction.reply({ content: 'Pong! ✧', ephemeral: true });
  },
};
