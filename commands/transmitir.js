// ══════════════════════════════════════════════════════════════
// Comando $transmitir / /transmitir
// Desbloqueia Live/Câmera no Discord relançando o cliente desktop
// com proxy internacional (login/gateway fora do Brasil).
// ══════════════════════════════════════════════════════════════
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
} = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { isStaff } = require('../utils/perms');
const tmgr = require('../utils/transmitirManager');
const { obterConfig, salvarConfig } = require('../utils/servidorStore');

const COR_TRANSMITIR = 0xC9B8F2;

// ══════════════════════════════════════════════════════════════
// EMBEDS
// ══════════════════════════════════════════════════════════════

function criarEmbedEstado() {
  const st = tmgr.obterEstadoAtual();
  const linhas = [
    `${THEME.div.duplo}`,
    '',
    `**Status:** ${st.ativo ? '🟢 **ATIVO**' : '⚪ Desativado'}`,
    `**Proxy em uso:** ${st.proxyUrl ? '`' + st.proxyUrl + '`' : '`nenhum`'}`,
    `**Região:** ${st.pais || '—'}`,
    `**Latência:** ${st.latencia != null ? st.latencia + ' ms' : '—'}`,
    `**Modo:** ${st.useManual ? '📡 Manual' : '🌐 Auto'}`,
    st.guildAtiva ? `**Ativado por (servidor):** \`${st.guildAtiva}\`` : '',
    '',
    `${THEME.div.duplo}`,
    '',
    st.discordDetectado
      ? `🎯 **Discord detectado:**\n\`${st.discordDetectado}\``
      : '❌ **Nenhum Discord detectado nesta máquina.**',
  ];
  return criarEmbed({
    titulo: '🎥 Transmitir no Falta Lua',
    descricao: linhas.filter(Boolean).join('\n'),
    cor: COR_TRANSMITIR,
    rodape: 'Live/Câmera desbloqueada para contas BR • Chat.exe',
  });
}

function criarEmbedPainel() {
  const st = tmgr.obterEstadoAtual();
  return criarEmbed({
    titulo: '🎥 Transmitir no Falta Lua',
    descricao: [
      `${THEME.div.duplo}`,
      '',
      'Quer fazer **Live (Go Live)** ou **Câmera** aqui no servidor?',
      'O Discord bloqueia esses recursos para contas do **Brasil**,',
      'validando o país **no login/gateway**.',
      '',
      'Esta bot relança o **Discord desktop desta máquina** com um proxy',
      'internacional — o login sai fora do país e a transmissão libera.',
      '',
      '**✅ Passos:**',
      '`1.` Defina uma proxy confiável (`$transmitir proxy socks5://IP:PORTA`)',
      '`2.` Clique em **Ativar** — o Discord fecha e reabre roteado',
      '`3.` Inicie o Go Live normalmente',
      '',
      `**Modo atual:** ${st.ativo ? '🟢 ATIVO' : '⚪ Desativado'}`,
      st.proxyUrl ? `**Proxy:** \`${st.proxyUrl}\`` : '',
      '',
      '💡 *Use `$transmitir ps5 ...` apenas para proxies SOCKS5;',
      '*Mídia/CDN continua na sua internet direta (sem tela preta).*',
    ].filter(Boolean).join('\n'),
    cor: COR_TRANSMITIR,
    rodape: 'Funciona só nesta máquina (onde o bot roda) • Chat.exe',
  });
}

function criarBotoesPainel(ativo) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('transmitir_ativar')
        .setLabel(ativo ? '🔄 Reativar' : '✅ Ativar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('transmitir_status')
        .setLabel('🔎 Status')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('transmitir_off')
        .setLabel('⏻ Desativar')
        .setStyle(ativo ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(!ativo),
      new ButtonBuilder()
        .setCustomId('transmitir_manual')
        .setLabel('📡 Proxy manual')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

// ══════════════════════════════════════════════════════════════
// AÇÕES
// ══════════════════════════════════════════════════════════════

async function ativarConfig(interacao, guildId, manualUrl = null) {
  // Guard: não reativar se já está ativo em outro servidor (Discord por-máquina)
  if (tmgr.state.ativo && tmgr.state.guildAtiva !== guildId) {
    await respostaSimples(interacao, {
      titulo: 'Já ativo',
      descricao: `Já existe uma transmissão ativa iniciada pelo servidor \`${tmgr.state.guildAtiva}\`.`,
    });
    return;
  }

  const cfg = obterConfig(guildId);
  if (manualUrl) cfg.transmitir.manual = manualUrl;
  salvarConfig(guildId, cfg);

  await respostaSimples(interacao, {
    titulo: '🌙 Preparando a transmissão...',
    descricao: 'Vou fechar o Discord desta máquina e relançá-lo pelo melhor proxy disponível. Um momento...',
  });

  const r = await tmgr.comMutex(() => tmgr.ativarTransmissao(cfg.transmitir));

  if (!r.ok) {
    await respostaSimples(interacao, { titulo: '❌ Não consegui ativar', descricao: r.erro, erro: true });
    return;
  }

  const embed = criarEmbed({
    titulo: '🎥 Transmissão Ativada!',
    descricao: [
      '🟢 **Discord relançado com proxy internacional!**',
      '',
      `**Proxy:** \`${r.proxyUrl}\``,
      `**Região:** ${r.pais}`,
      `**Latência:** ${r.latencia} ms`,
      `**Modo:** ${r.usoManual ? '📡 Manual' : '🌐 Auto'}`,
      '',
      'Agora entre no canal de voz e clique em **Iniciar Transmissão** (Go Live).',
      '',
      '⚠️ *O tráfego de vídeo pode sair pelo caminho direto (WebRTC/UDP).*',
    ].join('\n'),
    cor: THEME.corSucesso,
    rodape: 'Falta Lua • transmissão no ar 🌙',
  });
  await respostaSimples(interacao, null, { embeds: [embed] });
}

async function desativarConfig(interacao, guildId) {
  await respostaSimples(interacao, {
    titulo: '⏻ Desativando...',
    descricao: 'Vou fechar o Discord e relançá-lo sem proxy (modo normal).',
  });
  const r = await tmgr.comMutex(tmgr.desativarProxy);
  const embed = criarEmbed({
    titulo: '🟢 Transmissão desativada',
    descricao: 'Discord relançado **sem proxy** — modo normal restaurado.',
    cor: THEME.corSucesso,
  });
  await respostaSimples(interacao, null, { embeds: [embed] });
}

async function definirProxyManual(interacao) {
  const st = tmgr.obterEstadoAtual();
  const desc = [
    'Informe uma **proxy SOCKS5** confiável (de provedor pago).',
    '🇦🇷🇨🇱🇨🇴 EUA, Argentina, Chile... — qualquer fora do Brasil serve.',
    '',
    'Formato: `socks5://IP:PORTA`  ou  `socks5://host:porta`',
    'Exemplo: `socks5://45.32.10.20:1080`',
    '',
    st.proxyUrl ? `**Atual:** \`${st.proxyUrl}\`` : '**Atual:** nenhum',
  ].join('\n');
  const payload = {
    embeds: [criarEmbed({ titulo: '📡 Informar proxy manual', descricao: desc, cor: COR_TRANSMITIR })],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('transmitir_modal_abrir')
          .setLabel('✍️ Abrir formulário')
          .setStyle(ButtonStyle.Primary),
      ),
      voltarBotoes(),
    ],
  };
  // No painel (botão) → edita no lugar; no prefixo sem args → nova mensagem
  if (typeof interacao.update === 'function') {
    await interacao.update(payload);
  } else {
    await respostaSimples(interacao, null, payload);
  }
}

function voltarBotoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('transmitir_voltar').setLabel('◀ Voltar').setStyle(ButtonStyle.Secondary),
  );
}

// ══════════════════════════════════════════════════════════════
// HELPERS DE RESPOSTA
// ══════════════════════════════════════════════════════════════

// Responde num objeto que pode ser interação slash ou interação sintética do $.
async function respostaSimples(alvo, texto, payload = {}) {
  const opts = { ...payload };
  if (texto) {
    opts.embeds = [
      criarEmbed({
        titulo: texto.titulo,
        descricao: texto.descricao,
        cor: texto.erro ? THEME.corErro : THEME.corPrincipal,
      }),
    ];
  }
  if (typeof alvo.reply === 'function') {
    try {
      if (alvo.replied || alvo.deferred) return alvo.followUp(opts);
      return alvo.reply(opts);
    } catch {
      return alvo.followUp && alvo.followUp(opts);
    }
  }
}

async function atualizarMensagem(alvo, payload) {
  if (typeof alvo.update === 'function') return alvo.update(payload);
  if (typeof alvo.editReply === 'function') return alvo.editReply(payload);
}

// ══════════════════════════════════════════════════════════════
// PAINEL (via reply + coletor)
// ══════════════════════════════════════════════════════════════

function montarPainelPayload() {
  const st = tmgr.obterEstadoAtual();
  return {
    embeds: [criarEmbedPainel()],
    components: criarBotoesPainel(st.ativo),
  };
}

async function abrirPainel(alvo) {
  // alvo pode ser uma Message ($comando, tem .author) ou uma Interação
  // (slash/componente, tem .user). Normaliza o id do dono do painel.
  const userId = alvo.user?.id || alvo.author?.id || alvo.member?.id || null;
  const guildId = alvo.guildId || alvo.guild?.id;

  const payload = montarPainelPayload();
  let reply;
  try {
    // Interação precisa de fetchReply para o reply retornar a Message do coletor;
    // para Message o fetchReply é ignorado e o reply já retorna a Message.
    reply = await alvo.reply({ ...payload, fetchReply: true });
  } catch (e) {
    console.error('Erro ao abrir painel transmitir:', e);
    return respostaSimples(alvo, {
      titulo: 'Erro ao abrir painel',
      descricao: 'Não consegui criar o painel de transmissão aqui.',
      erro: true,
    });
  }

  // Filtro defensivo: nunca deve lançar dentro do coletor (isso crasha o processo).
  const dono = userId;
  const coletor = reply.createMessageComponentCollector({
    time: 5 * 60 * 1000,
    filter: (i) => !dono || (i.user && i.user.id === dono),
  });

  coletor.on('collect', async (i) => {
    try {
      if (i.customId === 'transmitir_ativar') {
        await i.deferUpdate();
        await ativarConfig(i, guildId);
      } else if (i.customId === 'transmitir_status') {
        await i.update({ embeds: [criarEmbedEstado()], components: criarBotoesPainel(tmgr.obterEstadoAtual().ativo) });
      } else if (i.customId === 'transmitir_off') {
        await i.deferUpdate();
        await desativarConfig(i, guildId);
      } else if (i.customId === 'transmitir_manual') {
        await definirProxyManual(i);
      } else if (i.customId === 'transmitir_modal_abrir') {
        // Abre o modal no lugar do painel
        const modal = criarModalProxy();
        await i.showModal(modal);
        try {
          const sub = await i.awaitModalSubmit({ filter: (m) => !dono || m.user?.id === dono, time: 120_000 });
          const url = sub.fields.getTextInputValue('transmitir_proxy_url').trim();
          await ativarConfig(sub, guildId, url);
        } catch {
          // modal expirado
        }
      } else if (i.customId === 'transmitir_voltar') {
        const st = tmgr.obterEstadoAtual();
        await i.update({ embeds: [criarEmbedPainel()], components: criarBotoesPainel(st.ativo) });
      } else if (i.customId === 'transmitir_modal_cancelar') {
        await i.update({ content: '✅ Cancelado.', embeds: [], components: [] });
      }
    } catch (e) {
      console.error('Erro no coletor transmitir:', e);
    }
  });

  coletor.on('end', async () => {
    try {
      await reply.edit({ components: [] });
    } catch {}
  });
}

function criarModalProxy() {
  const modal = new ModalBuilder()
    .setCustomId('transmitir_modal_proxy')
    .setTitle('📡 Proxy SOCKS5 para transmissão');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('transmitir_proxy_url')
        .setLabel('Proxy (socks5://IP:PORTA)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('socks5://45.32.10.20:1080')
        .setMaxLength(200)
        .setRequired(true),
    ),
  );
  return modal;
}

// ══════════════════════════════════════════════════════════════
// SUBCOMANDOS
// ══════════════════════════════════════════════════════════════

async function processar(sub, args, alvo, guildId) {
  const st = tmgr.obterEstadoAtual();
  if (sub === 'status') {
    return respostaSimples(alvo, null, { embeds: [criarEmbedEstado()] });
  }
  if (sub === 'ativar' || sub === 'auto') {
    return ativarConfig(alvo, guildId);
  }
  if (sub === 'off' || sub === 'desativar') {
    return desativarConfig(alvo, guildId);
  }
  if (sub === 'proxy') {
    const url = args.join('').trim(); // $transmitir proxy socks5://...
    if (!url) {
      return definirProxyManual(alvo);
    }
    const { parseUrlProxy } = require('../utils/socks5Handshake');
    const p = parseUrlProxy(url);
    if (!p || p.proto !== 'socks5') {
      return respostaSimples(alvo, {
        titulo: 'Formato inválido',
        descricao: 'Use `$transmitir proxy socks5://IP:PORTA`. Só SOCKS5 por ora.',
        erro: true,
      });
    }
    const lat = await tmgr.testarProxyGateway({ host: p.host, port: p.port, proto: 'socks5', timeout: 4000 });
    if (!lat) {
      return respostaSimples(alvo, {
        titulo: 'Proxy não respondeu',
        descricao: 'O proxy não respondeu ao handshake com o Discord. Verifique IP/porta do provedor.',
        erro: true,
      });
    }
    const cfg = obterConfig(guildId);
    cfg.transmitir.manual = url;
    cfg.transmitir.cache = { url, pais: 'Manual', ts: Date.now() };
    salvarConfig(guildId, cfg);
    return respostaSimples(alvo, null, {
      embeds: [
        criarEmbed({
          titulo: '📡 Proxy manual salvo!',
          descricao: [
            `**Proxy:** \`${url}\``,
            `**Latência:** ${lat} ms`,
            '',
            'Agora rode `$transmitir ativar` (ou clique em ✅ Ativar no painel)',
            'para relançar o Discord por ele.',
          ].join('\n'),
          cor: THEME.corSucesso,
        }),
      ],
    });
  }
  if (sub === 'limparproxy') {
    const cfg = obterConfig(guildId);
    cfg.transmitir.manual = null;
    cfg.transmitir.cache = null;
    salvarConfig(guildId, cfg);
    return respostaSimples(alvo, {
      titulo: '🧹 Proxy manual limpo',
      descricao: 'Voltei a usar proxies automáticas na próxima ativação.',
    });
  }
  // sem subcomando → painel
  return abrirPainel(alvo);
}

// ══════════════════════════════════════════════════════════════
// ENTRYPOINTS: slash + prefixo
// ══════════════════════════════════════════════════════════════

async function execute(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      embeds: [criarEmbed({ titulo: 'Acesso negado', descricao: 'Você precisa ser staff para usar isso.', cor: THEME.corErro })],
      ephemeral: true,
    });
  }
  const sub = interaction.options.getSubcommand(false) || '';
  const args = [];
  const url = interaction.options.getString('proxy');
  if (url) args.push(url);
  return processar(sub, args, interaction, interaction.guildId);
}

async function handlePrefix(message, args) {
  if (!isStaff(message.member)) {
    return message.reply({
      embeds: [criarEmbed({ titulo: 'Acesso negado', descricao: 'Você precisa ser staff para usar isso.', cor: THEME.corErro })],
    });
  }
  const sub = (args[0] || '').toLowerCase();
  const restArgs = args.slice(1);
  return processar(sub, restArgs, message, message.guildId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transmitir')
    .setDescription('🎥 Desbloqueia Live/Câmera no Discord (proxy internacional)')
    .addSubcommand((s) => s.setName('status').setDescription('Estado atual da transmissão'))
    .addSubcommand((s) => s.setName('ativar').setDescription('Relança o Discord por proxy (manual → auto)'))
    .addSubcommand((s) => s.setName('off').setDescription('Desativa e restaura o Discord normal'))
    .addSubcommand((s) => s
      .setName('proxy')
      .setDescription('Define uma proxy SOCKS5 manual')
      .addStringOption((o) => o.setName('proxy').setDescription('socks5://IP:PORTA'))),
  execute,
  handlePrefix,
};