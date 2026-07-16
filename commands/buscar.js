const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { isStaff } = require('../utils/perms');
const { clientCache } = require('../utils/cache');
const { buildMembroEmbed } = require('./securitybreach');

// ── Fonte de membros (cache em memória优先) ──────────────────────────────
function membrosDoGuild(guild) {
  const entry = clientCache.get(guild.id);
  if (entry && entry.members) return Array.from(entry.members.values());
  return Array.from(guild.members.cache.values());
}

// ── Sugestões ao vivo (autocomplete estilo Google) ───────────────────────
async function sugerir(termo, guild) {
  let membros = membrosDoGuild(guild);

  // Se o cache estiver vazio, tenta buscar sob demanda (pode falhar sem intents)
  if (!membros.length) {
    try {
      const fetched = await guild.members.fetch({ withPresences: false });
      membros = Array.from(fetched.values());
    } catch {
      membros = [];
    }
  }

  const t = (termo || '').trim().toLowerCase();
  const filtrados = t
    ? membros.filter(
        (m) =>
          (m.user.username && m.user.username.toLowerCase().includes(t)) ||
          (m.user.globalName && m.user.globalName.toLowerCase().includes(t)) ||
          (m.user.tag && m.user.tag.toLowerCase().includes(t)) ||
          (m.user.id && m.user.id.includes(t))
      )
    : membros;

  // Discord exige no máximo 25 opções e nomes com até 100 caracteres
  return filtrados.slice(0, 25).map((m) => {
    const rotulo = m.user.bot ? '🤖' : '👤';
    const nome = `${rotulo} ${m.user.username}`.slice(0, 100);
    return { name: nome, value: m.user.id };
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buscar')
    .setDescription('🔍 Busca um membro em tempo real — digite para ver sugestões (como o Google)')
    .addStringOption((opt) =>
      opt
        .setName('membro')
        .setDescription('Nome, tag, nome global ou ID do membro')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  // Disparado a cada tecla digitada no campo de busca
  async autocomplete(interaction) {
    const termo = interaction.options.getFocused();
    const sugestoes = await sugerir(termo, interaction.guild);
    await interaction.respond(sugestoes);
  },

  // Quando o usuário escolhe uma sugestão e envia o comando
  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [criarEmbed({ titulo: 'Acesso negado', descricao: 'Somente staff pode usar este comando.', cor: 0xE67E80 })],
        ephemeral: true,
      });
    }

    const id = interaction.options.getString('membro');
    const guild = interaction.guild;

    let m = clientCache.get(guild.id)?.members?.get(id) || guild.members.cache.get(id) || null;
    if (!m) {
      try {
        m = await guild.members.fetch(id);
      } catch {
        m = null;
      }
    }

    if (!m) {
      return interaction.reply({
        embeds: [criarEmbed({ titulo: 'Membro não encontrado', descricao: 'Não achei esse ID.', cor: 0xE67E80 })],
        ephemeral: true,
      });
    }

    await interaction.reply({ embeds: [buildMembroEmbed(m)], ephemeral: true });
  },
};