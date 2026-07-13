const fs = require('fs');
const path = require('path');

const CAMINHO = path.join(__dirname, '..', 'data', 'seguranca.json');
const CAMINHO_BACKUP = path.join(__dirname, '..', 'data', 'seguranca.backup.json');

function garantir() {
  const pasta = path.dirname(CAMINHO);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
  if (!fs.existsSync(CAMINHO)) fs.writeFileSync(CAMINHO, '{}', 'utf-8');
}

function carregar() {
  garantir();
  try {
    return JSON.parse(fs.readFileSync(CAMINHO, 'utf-8'));
  } catch {
    try {
      const b = JSON.parse(fs.readFileSync(CAMINHO_BACKUP, 'utf-8'));
      fs.writeFileSync(CAMINHO, JSON.stringify(b, null, 2));
      return b;
    } catch {
      return {};
    }
  }
}

function salvar(dados) {
  garantir();
  try {
    if (fs.existsSync(CAMINHO)) fs.copyFileSync(CAMINHO, CAMINHO_BACKUP);
  } catch {}
  fs.writeFileSync(CAMINHO, JSON.stringify(dados, null, 2), 'utf-8');
}

// Salva um instantâneo dos membros atuais do servidor
function salvarSnapshot(guildId, membros) {
  const dados = carregar();
  const agora = Date.now();
  const lista = membros.map((m) => ({
    id: m.user.id,
    tag: m.user.tag,
    nome: m.user.username,
    bot: m.user.bot,
    criadoEm: m.user.createdAt ? m.user.createdAt.getTime() : 0,
    entrouEm: m.joinedAt ? m.joinedAt.getTime() : 0,
    cargoAlto: m.roles.cache.filter((r) => r.id !== m.guild.id && !r.managed).sort((a, b) => b.position - a.position).first()?.name || 'Sem cargo',
  }));
  dados[guildId] = {
    atualizadoEm: agora,
    total: lista.length,
    membros: lista,
  };
  salvar(dados);
  return dados[guildId];
}

function obterSnapshot(guildId) {
  const dados = carregar();
  return dados[guildId] || null;
}

// Marca um membro como suspeito/aviso na "memória" do bot
function marcarMembro(guildId, userId, tipo, nota) {
  const dados = carregar();
  if (!dados[guildId]) dados[guildId] = { atualizadoEm: Date.now(), total: 0, membros: [], marcacoes: {} };
  if (!dados[guildId].marcacoes) dados[guildId].marcacoes = {};
  dados[guildId].marcacoes[userId] = { tipo, nota, em: Date.now() };
  salvar(dados);
  return dados[guildId].marcacoes[userId];
}

function obterMarcacoes(guildId) {
  const dados = carregar();
  return (dados[guildId] && dados[guildId].marcacoes) || {};
}

module.exports = {
  salvarSnapshot,
  obterSnapshot,
  marcarMembro,
  obterMarcacoes,
};