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

// Filtros: { userId?, pessoa?, ordenar?, status? }
function filtrarLembretes(opcoes = {}) {
  let lista = carregarLembretes();
  const agora = Date.now();

  // Filtro por usuário específico
  if (opcoes.userId) {
    lista = lista.filter((l) => l.userId === opcoes.userId);
  }

  // Filtro por pessoa (nome ou ID)
  if (opcoes.pessoa) {
    const termo = opcoes.pessoa.toLowerCase();
    lista = lista.filter((l) => {
      const nome = (l.usuarioNome || '').toLowerCase();
      return nome.includes(termo) || l.userId === termo;
    });
  }

  // Filtro por status
  if (opcoes.status === 'pendentes') {
    lista = lista.filter((l) => l.disparaEm > agora);
  } else if (opcoes.status === 'vencidos') {
    lista = lista.filter((l) => l.disparaEm <= agora);
  }

  // Ordenação
  if (opcoes.ordenar === 'mais_antigo') {
    lista.sort((a, b) => a.disparaEm - b.disparaEm);
  } else if (opcoes.ordenar === 'mais_recente') {
    lista.sort((a, b) => b.disparaEm - a.disparaEm);
  } else {
    // padrão: mais próximo de vencer primeiro
    lista.sort((a, b) => a.disparaEm - b.disparaEm);
  }

  return lista;
}

module.exports = { carregarLembretes, salvarLembretes, adicionarLembrete, removerLembrete, filtrarLembretes };