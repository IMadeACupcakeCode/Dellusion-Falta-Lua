const fs = require('fs');
const path = require('path');

const CAMINHO_ARQUIVO = path.join(__dirname, '..', 'data', 'servidores.json');

// Tipos de anúncio que o bot consegue classificar em canais diferentes
const TIPOS_ANUNCIO = ['geral', 'evento', 'regra', 'atualizacao', 'aviso'];

// Estrutura padrão de configuração de um servidor
function configPadrao() {
  return {
    canaisPermitidos: [], // se vazio, fala em qualquer canal
    canaisBloqueados: [], // nunca fala nestes, mesmo que permitidos
    anuncios: {
      geral: null,
      evento: null,
      regra: null,
      atualizacao: null,
      aviso: null,
    },
  };
}

function garantirArquivo() {
  const pasta = path.dirname(CAMINHO_ARQUIVO);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
  if (!fs.existsSync(CAMINHO_ARQUIVO)) fs.writeFileSync(CAMINHO_ARQUIVO, '{}', 'utf-8');
}

function carregarTodos() {
  garantirArquivo();
  const conteudo = fs.readFileSync(CAMINHO_ARQUIVO, 'utf-8');
  try {
    return JSON.parse(conteudo);
  } catch {
    return {};
  }
}

function salvarTodos(registro) {
  garantirArquivo();
  fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(registro, null, 2), 'utf-8');
}

function obterConfig(guildId) {
  const registro = carregarTodos();
  if (!registro[guildId]) {
    registro[guildId] = configPadrao();
    salvarTodos(registro);
  }
  // Garante que campos novos existam mesmo em configs antigas
  const cfg = registro[guildId];
  const padrao = configPadrao();
  cfg.canaisPermitidos = cfg.canaisPermitidos || padrao.canaisPermitidos;
  cfg.canaisBloqueados = cfg.canaisBloqueados || padrao.canaisBloqueados;
  cfg.anuncios = { ...padrao.anuncios, ...(cfg.anuncios || {}) };
  return cfg;
}

function salvarConfig(guildId, config) {
  const registro = carregarTodos();
  registro[guildId] = config;
  salvarTodos(registro);
}

/**
 * Verifica se o bot deve responder num determinado canal.
 * @returns {{ ok: boolean, motivo?: string }}
 */
function verificarCanal(guildId, channelId) {
  const cfg = obterConfig(guildId);

  if (cfg.canaisBloqueados.includes(channelId)) {
    return { ok: false, motivo: 'bloqueado' };
  }

  if (cfg.canaisPermitidos.length > 0 && !cfg.canaisPermitidos.includes(channelId)) {
    return { ok: false, motivo: 'foraDaLista' };
  }

  return { ok: true };
}

module.exports = {
  TIPOS_ANUNCIO,
  configPadrao,
  obterConfig,
  salvarConfig,
  verificarCanal,
};