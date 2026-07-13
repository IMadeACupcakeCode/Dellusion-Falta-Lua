const { criarEmbed, THEME } = require('../utils/theme');
const { CATEGORIAS, COMANDOS, TOTAL } = require('../utils/codexData');
const { linhaNavegacao, menuPular, aproximar, EmbedBuilder } = require('../utils/ui');

const AUTOR_COVER =
  `${THEME.iconeFooter} O Livro da Lua\n` +
  `Um grimório de comandos da **${THEME.nome}**.\n\n` +
  `↻ Use os botões para folhear as páginas.\n` +
  `⤵️ Use o menu para pular direto a um comando.\n` +
  `🔎 Ou busque: \`$codex nome\` para ir direto a um comando.\n\n` +
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

// Módulo de apoio ao prefixo `$codex` / `$ajuda` (não há mais comandos slash).
module.exports = {
  buscar: (termo) => aproximar(termo, COMANDOS),
  renderizarPagina,
  componentes,
  TOTAL,
};