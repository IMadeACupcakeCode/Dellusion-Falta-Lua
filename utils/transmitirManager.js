// ══════════════════════════════════════════════════════════════
// Transmitir Manager — Desbloqueio de Live/Câmera no Discord
// Relança o cliente desktop do Discord com proxy fora do Brasil
// (login/gateway fora do país → destrava Live; mídia/CDN direto).
// ══════════════════════════════════════════════════════════════
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const { testarProxyGateway, parseUrlProxy } = require('./socks5Handshake');

// ── Constantes ────────────────────────────────────────────────

// CDN/media direto na internet nativa (evita tela preta e não quebra a mídia)
const PROXY_BYPASS_LIST =
  '*.discordapp.net;cdn.discordapp.com;media.discordapp.net;*.discord.media;*.tenor.com;*.giphy.com;localhost;127.0.0.1';
const FLAG_WEBRTC = '--force-webrtc-ip-handling-policy=disable_non_proxied_udp';

const CACHE_TTL = 60 * 60 * 1000; // 1h

const FLAVORES = [
  { nome: 'Discord (Stable)', pasta: 'Discord', exe: 'Discord.exe' },
  { nome: 'Discord Canary', pasta: 'DiscordCanary', exe: 'DiscordCanary.exe' },
  { nome: 'Discord PTB', pasta: 'DiscordPTB', exe: 'DiscordPTB.exe' },
  { nome: 'Discord Development', pasta: 'DiscordDevelopment', exe: 'DiscordDevelopment.exe' },
];

// Nós públicos de referência (América Latina prioritária + Tor local)
const NO_CANDIDATOS = [
  { proto: 'socks5', host: '200.50.249.224', port: 1080, pais: 'Argentina' },
  { proto: 'socks5', host: '170.245.50.65', port: 1080, pais: 'Chile' },
  { proto: 'socks5', host: '190.61.43.122', port: 1080, pais: 'Colômbia' },
  { proto: 'socks5', host: '146.235.122.7', port: 1080, pais: 'EUA' },
  { proto: 'socks5', host: '172.104.202.116', port: 1080, pais: 'EUA' },
  { proto: 'socks5', host: '127.0.0.1', port: 9050, pais: 'Tor Local' },
  { proto: 'socks5', host: '127.0.0.1', port: 9150, pais: 'Tor Local' },
];

// Lê proxies do teste/proxies_benchmark.csv do usuário como candidatos extras
function candidatosDoBenchmark() {
  const caminho = path.join(__dirname, '..', 'teste', 'proxies_benchmark.csv');
  const lista = [];
  try {
    const linhas = fs.readFileSync(caminho, 'utf-8').split('\n').slice(1);
    for (const linha of linhas) {
      const col = linha.replace('\r', '').split(',');
      if (col.length >= 1 && col[0].startsWith('socks5://')) {
        const p = parseUrlProxy(col[0]);
        if (p) lista.push({ proto: p.proto, host: p.host, port: p.port, pais: 'Benchmark', origem: 'csv' });
      }
    }
  } catch {
    // arquivo ausente não é erro
  }
  return lista;
}

// ── Estado singleton (o Discord é por-máquina, não por-servidor) ──

const state = {
  ativo: false,
  guildAtiva: null,
  proxyUrl: null,
  pais: null,
  latencia: null,
  useManual: false,
  mutex: Promise.resolve(),
};

// ── Detecção da instalação do Discord ─────────────────────────

function detectarInstalacaoDoDiscord() {
  if (os.platform() !== 'win32') {
    // caminhos mac/linux simples (referência mínima)
    for (const p of ['/Applications/Discord.app/Contents/MacOS/Discord', '/usr/bin/discord']) {
      if (fs.existsSync(p)) return { path: p, tipo: 'direct', folder: 'Discord' };
    }
    return null;
  }
  const localAppData = process.env.LOCALAPPDATA || '';
  if (!localAppData) return null;

  for (const f of FLAVORES) {
    const globDir = path.join(localAppData, f.pasta);
    if (!fs.existsSync(globDir)) continue;

    // procura app-*/*.exe (mais recente por mtime)
    let melhor = null;
    let melhorMtime = 0;
    for (const dir of fs.readdirSync(globDir)) {
      if (!dir.startsWith('app-')) continue;
      const exe = path.join(globDir, dir, f.exe);
      if (!fs.existsSync(exe)) continue;
      const mtime = fs.statSync(exe).mtimeMs;
      if (mtime > melhorMtime) {
        melhor = exe;
        melhorMtime = mtime;
      }
    }
    if (melhor) return { path: melhor, tipo: 'direct', folder: f.pasta };

    // fallback: Update.exe
    const update = path.join(globDir, 'Update.exe');
    if (fs.existsSync(update)) return { path: update, tipo: 'updater', folder: f.pasta };
  }

  // Vesktop
  const vesktop = path.join(localAppData, 'Programs', 'Vesktop', 'Vesktop.exe');
  if (fs.existsSync(vesktop)) return { path: vesktop, tipo: 'direct', folder: 'Vesktop' };

  return null;
}

// ── Matar processos do Discord ────────────────────────────────

function matarDiscord() {
  if (os.platform() !== 'win32') return { mortos: 0, erros: [] };
  const nomes = ['Discord.exe', 'DiscordCanary.exe', 'DiscordPTB.exe', 'DiscordDevelopment.exe', 'Vesktop.exe'];
  let mortos = 0;
  const erros = [];
  for (const nome of nomes) {
    const r = spawnSync('taskkill', ['/F', '/IM', nome], { stdio: 'ignore', windowsHide: true });
    // taskkill retorna 0 quando achou e matou; 128 quando nada rodando (não é erro)
    if (r.status === 0) mortos += 1;
  }
  return { mortos, erros };
}

// ── Resolver o melhor proxy (manual → cache → Tor/candidatos) ──

async function resolverProxy(config) {
  const manual = config?.manual;
  const cache = config?.cache;

  // 1. Manual (prioridade máxima)
  if (manual) {
    const p = parseUrlProxy(manual);
    if (p) {
      const lat = await testarProxyGateway({ host: p.host, port: p.port, proto: p.proto });
      if (lat) return { url: manual, pais: 'Manual', latencia: lat, usoManual: true };
    }
  }

  // 2. Cache TTL
  if (cache && Date.now() - (cache.ts || 0) < CACHE_TTL) {
    const p = parseUrlProxy(cache.url);
    if (p) {
      const lat = await testarProxyGateway({ host: p.host, port: p.port, proto: p.proto });
      if (lat) return { url: cache.url, pais: cache.pais || 'Cache', latencia: lat, usoManual: false };
    }
  }

  // 3. Candidatos (nós de referência + benchmark local) — testa em paralelo
  const candidatos = [...NO_CANDIDATOS, ...candidatosDoBenchmark()].slice(0, 12);
  const resultados = await Promise.all(
    candidatos.map(async (c) => {
      const lat = await testarProxyGateway({ host: c.host, port: c.port, proto: c.proto });
      return lat
        ? { url: `socks5://${c.host}:${c.port}`, pais: c.pais, latencia: lat, origem: c.origem }
        : null;
    })
  );
  const funcs = resultados.filter(Boolean).sort((a, b) => a.latencia - b.latencia);
  if (funcs.length) {
    const v = funcs[0];
    return { url: v.url, pais: v.pais, latencia: v.latencia, usoManual: false };
  }

  return null;
}

// ── Spawn do Discord com proxy ────────────────────────────────

function iniciarDiscordComProxy(install, proxyUrl) {
  const argsProxy =
    proxyUrl == null
      ? []
      : [`--proxy-server=${proxyUrl}`, `--proxy-bypass-list=${PROXY_BYPASS_LIST}`, FLAG_WEBRTC];
  const argv =
    install.tipo === 'updater'
      ? [install.path, '--processStart', `${install.folder}.exe`, '--process-args'].concat(
          argsProxy.length ? [argsProxy.join(' ')] : [],
        )
      : [install.path, ...argsProxy];

  return new Promise((resolve) => {
    try {
      const child = spawn(argv[0], argv.slice(1), {
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
      });
      child.on('error', (e) => resolve({ ok: false, erro: e.message }));
      child.on('spawn', () => {
        child.unref();
        resolve({ ok: true });
      });
      // Watchdog: se o processo não disparar em 10s, reporta (sem prender o bot)
      setTimeout(() => {
        if (!child.pid) {
          try { child.kill(); } catch {}
        }
      }, 10000).unref();
    } catch (e) {
      resolve({ ok: false, erro: e.message });
    }
  });
}

// ── Fluxo de ativação ─────────────────────────────────────────

async function ativarTransmissao(config) {
  const install = detectarInstalacaoDoDiscord();
  if (!install) {
    return { ok: false, erro: 'Não encontrei o Discord instalado nesta máquina.' };
  }

  // mata instâncias abertas antes de relançar
  matarDiscord();
  await new Promise((r) => setTimeout(r, 400));

  const proxy = await resolverProxy(config);
  if (!proxy) {
    return { ok: false, erro: 'Nenhum proxy internacional respondeu ao gateway do Discord.' };
  }

  const r = await iniciarDiscordComProxy(install, proxy.url);
  if (!r.ok) {
    return { ok: false, erro: r.erro };
  }

  state.ativo = true;
  state.guildAtiva = config?.guildId || null;
  state.proxyUrl = proxy.url;
  state.pais = proxy.pais;
  state.latencia = proxy.latencia;
  state.useManual = proxy.usoManual;

  return {
    ok: true,
    proxyUrl: proxy.url,
    pais: proxy.pais,
    latencia: proxy.latencia,
    discord: install.path,
    usoManual: proxy.usoManual,
  };
}

// ── Desativar (restaurar Discord normal) ──────────────────────

async function desativarProxy() {
  matarDiscord();
  await new Promise((r) => setTimeout(r, 400));
  const install = detectarInstalacaoDoDiscord();
  let relancado = '';
  if (install) {
    const r = await iniciarDiscordComProxy(install, null); // sem proxy
    if (r.ok) relancado = install.path;
  }
  state.ativo = false;
  state.guildAtiva = null;
  state.proxyUrl = null;
  state.pais = null;
  state.latencia = null;
  state.useManual = false;
  return { ok: true, discord: relancado };
}

// ── Estado atual ──────────────────────────────────────────────

function obterEstadoAtual() {
  const discord = detectarInstalacaoDoDiscord();
  return {
    ativo: state.ativo,
    guildAtiva: state.guildAtiva,
    proxyUrl: state.proxyUrl,
    pais: state.pais,
    latencia: state.latencia,
    useManual: state.useManual,
    discordDetectado: discord ? discord.path : null,
    discord,
  };
}

// ── Mutex para evitar concorrência entre guilds ───────────────

function comMutex(fn) {
  const exec = state.mutex.then(fn);
  state.mutex = exec.catch(() => {});
  return exec;
}

module.exports = {
  testarProxyGateway, // re-exporta o handshake (o comando chama sem saber do módulo interno)
  detectarInstalacaoDoDiscord,
  matarDiscord,
  resolverProxy,
  iniciarDiscordComProxy,
  ativarTransmissao,
  desativarProxy,
  obterEstadoAtual,
  comMutex,
  state,
  PROXY_BYPASS_LIST,
  FLAG_WEBRTC,
};