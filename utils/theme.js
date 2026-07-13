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
  iconeFooter: '✧ ⎯ ੭',
};

/**
 * Cria um embed já estilizado com a identidade do bot.
 * @param {object} opcoes
 * @param {string} opcoes.titulo
 * @param {string} opcoes.descricao
 * @param {number} [opcoes.cor]
 * @param {string} [opcoes.rodape]
 */
function criarEmbed({ titulo, descricao, cor, rodape }) {
  return new EmbedBuilder()
    .setColor(cor || THEME.corPrincipal)
    .setTitle(`${THEME.iconeFooter}  ${titulo}`)
    .setDescription(descricao)
    .setFooter({ text: rodape || `${THEME.nome} sussurra por aqui...` })
    .setTimestamp();
}

module.exports = { THEME, criarEmbed };
