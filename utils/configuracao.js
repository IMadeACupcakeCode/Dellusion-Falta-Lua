// 🌙 Configuração central e adaptável do Falta Lua.
// Tudo que antes usava "mila" foi centralizado aqui para você poder trocar
// por "Falta Lua" (ou qualquer outro nome) sem caçar o código inteiro.

require('dotenv').config();

// Nome de exibição da bot (usado em embeds, footers, etc.)
const NOME_BOT = process.env.BOT_NOME || '✧ ⎯ ੭ Falta Lua';

// ID do servidor (guild) em que a bot deve atuar.
// Definido no .env (GUILD_ID) para o servidor Dellusion SMP.
const SERVIDOR_ALVO = process.env.GUILD_ID || null;

// Comando "sobre a bot". Antes chamado de `mila`.
// `nome`  → nome principal do comando (slash + prefixo)
// `alias` → nomes alternativos aceitos no prefixo $ (ex.: $mila, $faltalua)
// Para trocar para "faltalua", basta mudar NOME para 'faltalua' e ajustar os alias.
const COMANDO_SOBRE = {
  nome: process.env.COMANDO_SOBRE_NOME || 'sobre',
  alias: (process.env.COMANDO_SOBRE_ALIAS || 'mila,faltalua')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  descricao: '🌙 Sobre a Falta Lua',
};

// Servidor/personagem do roleplay ao qual a bot está vinculada (base do servidor).
const CONTEXTO_SERVIDOR = process.env.CONTEXTO_SERVIDOR || 'Dellusion SMP';

module.exports = { NOME_BOT, SERVIDOR_ALVO, COMANDO_SOBRE, CONTEXTO_SERVIDOR };