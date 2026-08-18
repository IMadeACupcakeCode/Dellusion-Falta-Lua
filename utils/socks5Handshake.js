// ══════════════════════════════════════════════════════════════
// Handshake SOCKS5 + TLS puro (sem dependências externas)
// Testa se um proxy SOCKS5 consegue alcançar o gateway do Discord.
// ══════════════════════════════════════════════════════════════
const net = require('net');
const tls = require('tls');
const url = require('url');

const ALVO = { host: 'gateway.discord.gg', port: 443 };

/**
 * Testa um proxy contra o Gateway WebSocket do Discord.
 * Para SOCKS5: handshake SOCKS5 (no-auth) + CONNECT por domínio + TLS real.
 * Para HTTP: CONNECT via proxy (método do Chromium) + TLS real.
 * Retorna a latência em ms, ou null se o proxy não responder/aprovar.
 */
function testarProxyGateway({ host, port, proto = 'socks5', timeout = 1500 } = {}) {
  if (proto === 'socks5') return testarSocks5Gateway({ host, port, timeout });
  if (proto === 'http' || proto === 'https') return testarHttpGateway({ host, port, timeout });
  return Promise.resolve(null);
}

// ── SOCKS5 ────────────────────────────────────────────────────

function testarSocks5Gateway({ host, port, timeout }) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let fase = 0;
    let buf = Buffer.alloc(0);
    let abortado = false;

    const abort = () => {
      if (abortado) return;
      abortado = true;
      s.destroy();
      resolve(null);
    };

    const s = net.connect({ host, port }, () => {
      s.setNoDelay(true);
      s.write(Buffer.from([0x05, 0x01, 0x00])); // greeting: SOCKS5, 1 método, no-auth
    });

    s.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      try {
        // Fase 0 → resposta do greeting (2 bytes)
        if (fase === 0 && buf.length >= 2) {
          if (buf[0] !== 5 || buf[1] !== 0) return abort(); // método != no-auth
          buf = buf.subarray(2);
          fase = 1;
          const alvo = Buffer.from(ALVO.host, 'ascii');
          s.write(Buffer.concat([
            Buffer.from([0x05, 0x01, 0x00, 0x03, alvo.length]), alvo,
            Buffer.from([443 >> 8, 443 & 0xff]),
          ])); // CONNECT, ATYP=3 (domínio), porta 443 BE
        }
        // Fase 1 → resposta do CONNECT (mínimo 7 bytes)
        if (fase === 1 && buf.length >= 7) {
          if (buf[0] !== 5 || buf[1] !== 0) return abort(); // rep != success
          fase = 2;
          s.removeAllListeners('data');
          const tlsSock = tls.connect({ socket: s, servername: ALVO.host, rejectUnauthorized: false }, () => {
            tlsSock.write('GET / HTTP/1.1\r\nHost: gateway.discord.gg\r\nConnection: close\r\n\r\n');
            tlsSock.once('data', () => {
              const ms = Date.now() - t0;
              tlsSock.destroy();
              resolve(ms);
            });
          });
          tlsSock.once('error', abort);
        }
      } catch {
        abort();
      }
    });

    s.once('error', abort);
    s.once('close', () => {
      if (!abortado && fase !== 2) resolve(null);
    });
    s.setTimeout(timeout, () => {
      s.destroy();
      resolve(null);
    });
  });
}

// ── HTTP CONNECT (proxy HTTP/HTTPS) ───────────────────────────

function testarHttpGateway({ host, port, timeout }) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let abortado = false;

    const abort = () => {
      if (abortado) return;
      abortado = true;
      s.destroy();
      resolve(null);
    };

    const s = net.connect({ host, port, timeout }, () => {
      s.setNoDelay(true);
      s.write(
        `CONNECT ${ALVO.host}:443 HTTP/1.1\r\nHost: ${ALVO.host}:443\r\nProxy-Connection: keep-alive\r\n\r\n`
      );
    });

    let acumulado = '';
    s.on('data', (d) => {
      acumulado += d.toString('latin1');
      const fim = acumulado.indexOf('\r\n\r\n');
      if (fim === -1) {
        if (acumulado.length > 2048) return abort(); // resposta grande demais
        return;
      }
      const linha = acumulado.slice(0, fim);
      const status = parseInt(linha.split(' ')[1] || '0', 10);
      if (status !== 200) return abort();
      s.removeAllListeners('data');
      const tlsSock = tls.connect({ socket: s, servername: ALVO.host, rejectUnauthorized: false }, () => {
        tlsSock.write('GET / HTTP/1.1\r\nHost: gateway.discord.gg\r\nConnection: close\r\n\r\n');
        tlsSock.once('data', () => {
          const ms = Date.now() - t0;
          tlsSock.destroy();
          resolve(ms);
        });
      });
      tlsSock.once('error', abort);
    });

    s.once('error', abort);
    s.once('close', () => {
      if (!abortado) resolve(null);
    });
    s.setTimeout(timeout, () => {
      s.destroy();
      resolve(null);
    });
  });
}

// ── Helpers de URL ────────────────────────────────────────────

/**
 * Extrai { host, port, proto } de uma URL de proxy (socks5://, http://, https://).
 * Porta padrão: 1080 para SOCKS5, 80 HTTP, 443 HTTPS.
 */
function parseUrlProxy(proxyUrl) {
  try {
    const u = new url.URL(proxyUrl);
    const proto = u.protocol.replace(':', '');
    const port = u.port || (proto === 'socks5' ? 1080 : proto === 'https' ? 443 : 80);
    return { host: u.hostname, port: parseInt(port, 10), proto };
  } catch {
    return null;
  }
}

module.exports = { testarProxyGateway, parseUrlProxy, ALVO };