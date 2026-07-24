const { EmbedBuilder } = require('discord.js');
const { NOME_BOT } = require('./configuracao');

// 🌙 Identidade visual do Falta Lua
const THEME = {
  nome: NOME_BOT,
  corPrincipal: 0xB9A7E6, // lilás suave
  corSucesso: 0xC9B8F2,
  corDado: 0xA895E0,
  corRoleta: 0xE0C3F7,
  corLembrete: 0xBFA8E8,
  corErro: 0xE67E80,      // vermelho suave para erros/avisos
  iconeFooter: '✧ ⎯ ੭',
  // ── Decoradores ─────────────────────────────────────────────────
  div: {
    simples: '✦•┈๑⋅⋯ ⋯⋅๑┈•✦',
    duplo: '✧ ﾟ･ ✦ ･ ｡･ﾟ ✧ ﾟ･ ✦ ･ ｡･ﾟ ✧',
    linha: '⋅⋯⋯⋅⋅⋯⋯⋅⋅⋯⋯⋅',
    lua: '🌙 ･ ｡･ﾟ ✧ ﾟ･ ✧ ﾟ･ ｡･ﾟ',
  },
};

/**
 * Cria um embed já estilizado com a identidade do bot.
 * @param {object} opcoes
 * @param {string} opcoes.titulo
 * @param {string} opcoes.descricao
 * @param {number} [opcoes.cor]
 * @param {string} [opcoes.rodape]
 * @param {string} [opcoes.thumbnail]  — URL ou attachment://path (canto superior)
 * @param {string} [opcoes.image]      — URL ou attachment://path (grande no rodapé)
 * @param {boolean} [opcoes.semTimestamp]  — true para omitir timestamp
 */
function criarEmbed({ titulo, descricao, cor, rodape, thumbnail, image, semTimestamp }) {
  const embed = new EmbedBuilder()
    .setColor(cor || THEME.corPrincipal)
    .setTitle(titulo ? `${THEME.iconeFooter}  ${titulo}` : null)
    .setDescription(descricao)
    .setFooter({ text: rodape || `Chat.exe` });
  if (!semTimestamp) embed.setTimestamp();
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  return embed;
}

module.exports = { THEME, criarEmbed };
