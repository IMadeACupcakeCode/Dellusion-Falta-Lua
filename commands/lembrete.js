const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const { criarEmbed, THEME } = require('../utils/theme');
const { parseTempo, formatarDuracao } = require('../utils/tempo');
const { adicionarLembrete, carregarLembretes, removerLembrete } = require('../utils/lembretesStore');
const { agendarLembrete } = require('../utils/agendador');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lembrete')
    .setDescription('Cria, lista ou cancela lembretes')
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Cria um novo lembrete')
        .addStringOption((op) =>
          op.setName('tempo').setDescription('Ex: 10m, 1h30m, 2d').setRequired(true)
        )
        .addStringOption((op) =>
          op.setName('mensagem').setDescription('O que devo te lembrar?').setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('listar').setDescription('Lista seus lembretes ativos'))
    .addSubcommand((sub) =>
      sub
        .setName('cancelar')
        .setDescription('Cancela um lembrete pelo ID')
        .addStringOption((op) =>
          op.setName('id').setDescription('ID do lembrete (veja em /lembrete listar)').setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const subcomando = interaction.options.getSubcommand();

    if (subcomando === 'criar') {
      const tempoTexto = interaction.options.getString('tempo');
      const mensagem = interaction.options.getString('mensagem');
      const ms = parseTempo(tempoTexto);

      if (!ms) {
        const embedErro = criarEmbed({
          titulo: 'Tempo inválido',
          descricao:
            'Não entendi esse tempo. Use combinações como:\n' +
            '`10m` • `1h30m` • `2d` • `45s`',
          cor: 0xE67E80,
        });
        return interaction.reply({ embeds: [embedErro], ephemeral: true });
      }

      if (ms > 30 * 24 * 60 * 60 * 1000) {
        const embedErro = criarEmbed({
          titulo: 'Tempo muito longo',
          descricao: 'O limite atual é de **30 dias** por lembrete.',
          cor: 0xE67E80,
        });
        return interaction.reply({ embeds: [embedErro], ephemeral: true });
      }

      const id = crypto.randomBytes(3).toString('hex');
      const disparaEm = Date.now() + ms;

      const lembrete = {
        id,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        mensagem,
        disparaEm,
      };

      adicionarLembrete(lembrete);
      agendarLembrete(client, lembrete);

      const embed = criarEmbed({
        titulo: 'Lembrete guardado sob a lua',
        descricao:
          `Vou te lembrar em **${formatarDuracao(ms)}**:\n` +
          `> "${mensagem}"\n\n` +
          `**ID:** \`${id}\``,
        cor: THEME.corLembrete,
        rodape: `${THEME.nome} não vai esquecer, ${interaction.user.username}`,
      });

      return interaction.reply({ embeds: [embed] });
    }

    if (subcomando === 'listar') {
      const meus = carregarLembretes().filter((l) => l.userId === interaction.user.id);

      if (meus.length === 0) {
        const embed = criarEmbed({
          titulo: 'Nenhum lembrete por aqui',
          descricao: 'Você não tem lembretes ativos no momento.',
          cor: THEME.corLembrete,
        });
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const linhas = meus
        .sort((a, b) => a.disparaEm - b.disparaEm)
        .map((l) => {
          const restante = l.disparaEm - Date.now();
          return `˖ \`${l.id}\` — "${l.mensagem}" em **${formatarDuracao(Math.max(restante, 0))}**`;
        })
        .join('\n');

      const embed = criarEmbed({
        titulo: 'Seus lembretes ativos',
        descricao: linhas,
        cor: THEME.corLembrete,
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcomando === 'cancelar') {
      const id = interaction.options.getString('id');
      const meus = carregarLembretes();
      const alvo = meus.find((l) => l.id === id && l.userId === interaction.user.id);

      if (!alvo) {
        const embedErro = criarEmbed({
          titulo: 'Lembrete não encontrado',
          descricao: `Não encontrei nenhum lembrete seu com o ID \`${id}\`.`,
          cor: 0xE67E80,
        });
        return interaction.reply({ embeds: [embedErro], ephemeral: true });
      }

      removerLembrete(id);

      const embed = criarEmbed({
        titulo: 'Lembrete cancelado',
        descricao: `O lembrete \`${id}\` foi apagado.`,
        cor: THEME.corLembrete,
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
