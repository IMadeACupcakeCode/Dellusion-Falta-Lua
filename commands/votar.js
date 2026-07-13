const { ActionRowBuilder, ButtonStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');
const { parseTempo, formatarDuracao, formatarDataAbsoluta } = require('../utils/tempo');

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
const DEFAULT_DURATION_MS = 10 * 60 * 1000; // 10 minutos

function formatOptionLines(opcoes, votos) {
  return opcoes
    .map((opcao, index) => {
      const count = votos[opcao] || 0;
      return `${EMOJIS[index]} **${opcao}** — \`${count}\` voto(s)`;
    })
    .join('\n');
}

function buildButtons(opcoes, disabled = false) {
  const row = new ActionRowBuilder();
  opcoes.forEach((opcao, index) => {
    row.addComponents(
      botao(opcao.slice(0, 80), `votar_${index}`, ButtonStyle.Primary, EMOJIS[index]).setDisabled(disabled)
    );
  });
  return row;
}

function buildEmbed(pergunta, opcoes, votos, author, endsAt, durationMs, closed = false) {
  const descricao = formatOptionLines(opcoes, votos);
  const statusText = closed
    ? '🛑 A votação acabou.'
    : `⏳ Termina em ${formatarDuracao(durationMs)} (${formatarDataAbsoluta(endsAt)})`;

  return criarEmbed({
    titulo: `🗳️ ${pergunta}`,
    descricao: `${descricao}\n\n**${statusText}**`,
    cor: closed ? 0x8B80FF : THEME.corPrincipal,
    rodape: `Enquete por ${author}`,
  });
}

function parsePollInput(pergunta, opcoesRaw, duracaoRaw) {
  if (!pergunta || !opcoesRaw) return null;
  const opcoes = opcoesRaw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length)
    .slice(0, 5);

  if (opcoes.length < 2) return null;

  let durationMs = DEFAULT_DURATION_MS;
  if (duracaoRaw) {
    const parsed = parseTempo(duracaoRaw);
    if (!parsed) return { error: true };
    durationMs = parsed;
  }

  return { opcoes, durationMs };
}

module.exports = {
  data: { name: 'votar', description: '🗳️ Cria uma enquete rápida com botões e tempo customizável' },
  async execute(interaction) {
    const pergunta = interaction.options.getString('pergunta');
    const opcoesRaw = interaction.options.getString('opcoes');
    const duracaoRaw = interaction.options.getString('duracao');

    const parsed = parsePollInput(pergunta, opcoesRaw, duracaoRaw);
    if (!parsed || parsed.error) {
      return interaction.reply({
        embeds: [
          criarEmbed({
            titulo: 'Uso do comando `$votar`',
            descricao:
              'Use o formato:\n' +
              '`$votar pergunta | opção 1, opção 2, opção 3 | 10m`\n\n' +
              '**Exemplos:**\n' +
              '`$votar Qual jogo jogar? | Minecraft, Valorant, Genshin | 1h`\n' +
              '`$votar Qual tema? | Claro, Escuro | amanhã 18:00`\n\n' +
              'O tempo é opcional e aceita `s`, `m`, `h`, `d`, `hoje 20:00`, `amanhã 14:00`, `25/12/2026 18:00`, etc.',
            cor: 0xE67E80,
          }),
        ],
        ephemeral: true,
      });
    }

    const { opcoes, durationMs } = parsed;
    const endsAt = Date.now() + durationMs;
    const votos = Object.fromEntries(opcoes.map((opcao) => [opcao, 0]));
    const row = buildButtons(opcoes);
    const embed = buildEmbed(pergunta, opcoes, votos, interaction.user.username, endsAt, durationMs);
    const resposta = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const voters = new Set();
    const collector = resposta.createMessageComponentCollector({ time: durationMs, filter: () => true });

    collector.on('collect', async (buttonInteraction) => {
      const index = Number(buttonInteraction.customId.replace('votar_', ''));
      const userId = buttonInteraction.user.id;
      if (voters.has(userId)) {
        return buttonInteraction.reply({ content: 'Você já votou nesta enquete. 🌙', ephemeral: true });
      }

      voters.add(userId);
      votos[opcoes[index]] += 1;
      const updatedEmbed = buildEmbed(pergunta, opcoes, votos, interaction.user.username, endsAt, Math.max(0, endsAt - Date.now()));
      await buttonInteraction.update({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      const closedRow = buildButtons(opcoes, true);
      const finalEmbed = buildEmbed(pergunta, opcoes, votos, interaction.user.username, endsAt, 0, true);
      try {
        await resposta.edit({ embeds: [finalEmbed], components: [closedRow] });
      } catch {}
    });
  },
};
