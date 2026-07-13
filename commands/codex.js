const { SlashCommandBuilder } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { CATEGORIAS, COMANDOS, TOTAL } = require('../utils/codexData');
const { linhaNavegacao, menuPular, aproximar, EmbedBuilder } = require('../utils/ui');

const AUTOR_COVER =
  `${THEME.iconeFooter} O Livro da Lua\n` +
  `Um grimório de comandos da **${THEME.nome}**.\n\n` +
  `↻ Use os botões para folhear as páginas.\n` +
  `⤵️ Use o menu para pular direto a um comando.\n` +
  `🔎 Ou busque: \`/codex comando:nome\` • \`$codex nome\`\n\n` +
  `Total de encantamentos: **${TOTAL}** comandos.`;

function renderizarPagina(indice) {
  // Capa (índice 0)
  if (indice === 0) {
    const categorias = Object.values(CATEGORIAS)
      .map((c) => `${c.emoji} **${c.nome}**`)
      .join('   ');
    const embed = new EmbedBuilder()
      .setColor(THEME.corPrincipal)
      .setTitle('📖 Livro da Lua')
      .setDescription(AUTOR_COVER)
      .addFields(
        { name: '✦ Seções', value: categorias, inline: false },
        {
          name: '✦ Como folhear',
          value:
            '`⏮️` primeira · `◀️` anterior · `▶️` próxima · `⏭️` última\n' +
            '`⤵️ menu` — escolha um comando e vá até ele\n' +
            '`🔎 busca` — ache o comando mais parecido com o nome digitado',
          inline: false,
        }
      )
      .setFooter({ text: `Página 1/${TOTAL + 1} • ${THEME.nome}` })
      .setTimestamp();
    return embed;
  }

  const cmd = COMANDOS[indice - 1];
  const cat = CATEGORIAS[cmd.categoria];
  const embed = new EmbedBuilder()
    .setColor(cat.cor)
    .setTitle(`${cmd.emoji} ${cmd.nome}`)
    .setDescription(cmd.descricao)
    .addFields(
      { name: '📚 Seção', value: `${cat.emoji} ${cat.nome}`, inline: true },
      { name: '⌨️ Como usar', value: cmd.uso, inline: false },
      { name: '✨ Exemplo', value: cmd.exemplo, inline: false }
    )
    .setFooter({ text: `Página ${indice + 1}/${TOTAL + 1} • ${THEME.nome}` })
    .setTimestamp();
  return embed;
}

function componentes(indice) {
  const ultimo = TOTAL; // índice máximo (capa=0 ... TOTAL)
  const nav = linhaNavegacao('codex', {
    first: indice === 0,
    prev: indice === 0,
    next: indice === ultimo,
    last: indice === ultimo,
  });

  const opcoes = COMANDOS.map((c) => ({
    label: `${c.emoji} ${c.nome}`,
    value: String(COMANDOS.indexOf(c) + 1), // índice da página (1-based, capa=0)
    description: c.descricao.slice(0, 80),
    emoji: c.emoji,
  }));

  const menu = menuPular('codex', '⤵️ Pular para um comando...', opcoes);
  return [nav, menu];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('codex')
    .setDescription('📖 O livro de comandos da bot, página a página')
    .addStringOption((op) =>
      op.setName('comando').setDescription('Busque um comando pelo nome').setRequired(false)
    ),
  async execute(interaction, client) {
    const busca = interaction.options.getString('comando');

    let pagina = 0;
    if (busca) {
      const achado = aproximar(busca, COMANDOS);
      if (achado) {
        pagina = COMANDOS.indexOf(achado) + 1;
      } else {
        const embedErro = criarEmbed({
          titulo: 'Comando não encontrado',
          descricao: `Não encontrei nada parecido com \`${busca}\`. Tente \`/codex\` e use o menu de pular.`,
          cor: 0xE67E80,
        });
        return interaction.reply({ embeds: [embedErro], ephemeral: true });
      }
    }

    const resposta = await interaction.reply({
      embeds: [renderizarPagina(pagina)],
      components: componentes(pagina),
      fetchReply: true,
    });

    const coletor = resposta.createMessageComponentCollector({
      time: 5 * 60 * 1000,
    });

    coletor.on('collect', async (i) => {
      const id = i.customId;
      if (id === 'codex_first') pagina = 0;
      else if (id === 'codex_prev') pagina = Math.max(0, pagina - 1);
      else if (id === 'codex_next') pagina = Math.min(TOTAL, pagina + 1);
      else if (id === 'codex_last') pagina = TOTAL;
      else if (id === 'codex_jump') pagina = parseInt(i.values[0], 10);

      await i.update({ embeds: [renderizarPagina(pagina)], components: componentes(pagina) });
    });

    coletor.on('end', async () => {
      try {
        await resposta.edit({ components: [] });
      } catch {
        /* ignora */
      }
    });
  },
};

// Exporta também a lógica de busca para o prefixo
module.exports.buscar = (termo) => aproximar(termo, COMANDOS);
module.exports.renderizarPagina = renderizarPagina;
module.exports.componentes = componentes;
module.exports.TOTAL = TOTAL;