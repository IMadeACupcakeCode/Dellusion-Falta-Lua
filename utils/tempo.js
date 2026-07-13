// Converte strings como "10m", "1h", "2h30m", "45s", "1d" em milissegundos
function parseTempo(texto) {
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

function formatarDuracao(ms) {
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

module.exports = { parseTempo, formatarDuracao };
