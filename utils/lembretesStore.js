const fs = require('fs');
const path = require('path');

const CAMINHO_ARQUIVO = path.join(__dirname, '..', 'data', 'lembretes.json');

function garantirArquivo() {
  const pasta = path.dirname(CAMINHO_ARQUIVO);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
  if (!fs.existsSync(CAMINHO_ARQUIVO)) fs.writeFileSync(CAMINHO_ARQUIVO, '[]', 'utf-8');
}

function carregarLembretes() {
  garantirArquivo();
  const conteudo = fs.readFileSync(CAMINHO_ARQUIVO, 'utf-8');
  try {
    return JSON.parse(conteudo);
  } catch {
    return [];
  }
}

function salvarLembretes(lista) {
  garantirArquivo();
  fs.writeFileSync(CAMINHO_ARQUIVO, JSON.stringify(lista, null, 2), 'utf-8');
}

function adicionarLembrete(lembrete) {
  const lista = carregarLembretes();
  lista.push(lembrete);
  salvarLembretes(lista);
}

function removerLembrete(id) {
  const lista = carregarLembretes().filter((l) => l.id !== id);
  salvarLembretes(lista);
}

module.exports = { carregarLembretes, salvarLembretes, adicionarLembrete, removerLembrete };
