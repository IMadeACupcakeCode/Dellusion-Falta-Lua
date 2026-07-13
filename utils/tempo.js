// Converte strings como "10m", "1h", "2h30m", "45s", "1d" em milissegundos
// Também suporta datas absolutas: "25/12/2026 15:30", "amanhã 14:00"
function parseTempo(texto) {
  if (!texto) return null;

  // Tenta interpretar como data absoluta primeiro
  const dataAbs = parseDataAbsoluta(texto);
  if (dataAbs) return dataAbs;

  // Fallback: formato relativo (10m, 1h30m, 2d, etc.)
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let totalMs = 0;
  let encontrouAlgo = false;
  let match;

  while ((match = regex.exec(texto)) !== null) {
    encontrouAlgo = true;
    const valor = parseInt(match[1], 10);
    const unidade = match[2].toLowerCase();

    switch (unidade) {
      case 'd':
        totalMs += valor * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        totalMs += valor * 60 * 60 * 1000;
        break;
      case 'm':
        totalMs += valor * 60 * 1000;
        break;
      case 's':
        totalMs += valor * 1000;
        break;
    }
  }

  if (!encontrouAlgo || totalMs <= 0) return null;
  return totalMs;
}

// Interpreta datas absolutas no formato:
//   "25/12/2026 15:30" → timestamp futuro
//   "25/12/2026"       → meia-noite desse dia
//   "amanhã 14:00"     → amanhã às 14:00
//   "hoje 18:30"       → hoje às 18:30
function parseDataAbsoluta(texto) {
  const t = texto.trim().toLowerCase();

  // "amanhã" / "hoje" com hora opcional
  const agora = new Date();
  let alvo = new Date(agora);

  if (t.startsWith('amanhã') || t.startsWith('amanha')) {
    alvo.setDate(alvo.getDate() + 1);
    const resto = t.replace(/^amanh[ãa]/, '').trim();
    if (resto) {
      const partes = resto.match(/^(\d{1,2})[.:](\d{2})$/);
      if (partes) {
        alvo.setHours(parseInt(partes[1], 10), parseInt(partes[2], 10), 0, 0);
      }
    } else {
      alvo.setHours(9, 0, 0, 0); // padrão 9:00
    }
    return alvo.getTime() - Date.now();
  }

  if (t.startsWith('hoje')) {
    const resto = t.replace(/^hoje/, '').trim();
    if (resto) {
      const partes = resto.match(/^(\d{1,2})[.:](\d{2})$/);
      if (partes) {
        alvo.setHours(parseInt(partes[1], 10), parseInt(partes[2], 10), 0, 0);
      }
    } else {
      alvo.setHours(23, 59, 0, 0); // padrão fim do dia
    }
    const diff = alvo.getTime() - Date.now();
    return diff > 0 ? diff : null;
  }

  // "25/12/2026 15:30" ou "25/12/2026"
  const matchData = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})[.:](\d{2}))?$/);
  if (matchData) {
    const dia = parseInt(matchData[1], 10);
    const mes = parseInt(matchData[2], 10) - 1;
    const ano = parseInt(matchData[3], 10);
    alvo = new Date(ano, mes, dia);
    if (matchData[4] && matchData[5]) {
      alvo.setHours(parseInt(matchData[4], 10), parseInt(matchData[5], 10), 0, 0);
    } else {
      alvo.setHours(9, 0, 0, 0);
    }
    const diff = alvo.getTime() - Date.now();
    return diff > 0 ? diff : null;
  }

  return null;
}

function formatarDuracao(ms) {
  if (ms <= 0) return 'agora';
  const segundos = Math.floor(ms / 1000);
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;

  const partes = [];
  if (dias) partes.push(`${dias}d`);
  if (horas) partes.push(`${horas}h`);
  if (minutos) partes.push(`${minutos}m`);
  if (segs && !dias) partes.push(`${segs}s`);

  return partes.join(' ') || '0s';
}

function formatarDataAbsoluta(ts) {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

module.exports = { parseTempo, formatarDuracao, formatarDataAbsoluta, parseDataAbsoluta };