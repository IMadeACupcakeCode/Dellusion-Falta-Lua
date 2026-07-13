const { criarEmbed, THEME } = require('./theme');
const { verificarCanal, obterConfig, salvarConfig, TIPOS_ANUNCIO } = require('./servidorStore');
const { adicionarLembrete, carregarLembretes, removerLembrete } = require('./lembretesStore');
const { agendarLembrete } = require('./agendador');
const { parseTempo, formatarDuracao } = require('./tempo');
const crypto = require('crypto');

const PREFIXO = '$';

// ── Helpers de parsing ────────────────────────────────────────────────

// Interpreta notação de dados: NdM+X ou NdM-X
function rolarDados(notacao) {
  const regex = /^(\d{1,2})d(\d{1,4})([+-]\d{1,3})?$/i;
  const match = notacao.trim().match(regex);
  if (!match) return null;

  const quantidade = parseInt(match[1], 10);
  const lados = parseInt(match[2], 10);
  const modificador = match[3] ? parseInt(match[3], 10) : 0;
  if (quantidade < 1 || quantidade > 50 || lados < 2 || lados > 1000) return null;

  const rolagens = [];
  let soma = 0;
  for (let i = 0; i < quantidade; i++) {
    const valor = Math.floor(Math.random() * lados) + 1;
    rolagens.push(valor);
    soma += valor;
  }
  return { quantidade, lados, modificador, rolagens, total: soma + modificador };
}

function extrairCanal(mensagem) {
  const match = mensagem.content.match(/<#(\d+)>/);
  return match ? match[1] : null;
}

function responder(mensagem, embed, ephemeral) {
  return mensagem.reply({ embeds: [embed], ephemeral: !!ephemeral });
}

async function enviarConfiguracao(mensagem, guildId) {
  const cfg = obterConfig(guildId);
  const mencionar = (ids) =>
    ids && ids.length ? ids.map((id) => `<#${id}>`).join('  ·  ') : '`nenhum definido`';

  const anuncios = TIPOS_ANUNCIO.map((t) => {
    const id = cfg.anuncios[t];
    return `˖ **${t}**: ${id ? `<#${id}>` : '`não definido`'}`;
  }).join('\n');

  const embed = criarEmbed({
    titulo: 'Configuração atual da lua',
    descricao:
      `**Canais permitidos:** ${mencionar(cfg.canaisPermitidos)}\n` +
      `**Canais proibidos:** ${mencionar(cfg.canaisBloqueados)}\n\n` +
      `**Anúncios por tipo:**\n${anuncios}`,
    cor: THEME.corPrincipal,
  });
  return responder(mensagem, embed, true);
}

// ── Tratador principal ────────────────────────────────────────────────

async function handlePrefix(message, client) {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIXO)) return;

  const args = message.content.slice(PREFIXO.length).trim().split(/\s+/);
  const comando = (args.shift() || '').toLowerCase();
  if (!comando) return;

  const guildId = message.guild?.id;

  // Configurar é livre em qualquer canal (para reconfigurar)
  if (comando !== 'configurar') {
    if (guildId) {
      const checagem = verificarCanal(guildId, message.channelId);
      if (!checagem.ok) {
        const motivos = {
          bloqueado: 'Este canal está na lista de **proibidos**. Use outro ou ajuste com `$configurar`.',
          foraDaLista: 'Só falo nos canais permitidos. Veja com `$configurar ver`.',
        };
        const embed = criarEmbed({
          titulo: 'Silêncio sob a lua',
          descricao: motivos[checagem.motivo] || 'Não falo aqui.',
          cor: 0xE67E80,
        });
        return responder(message, embed, true);
      }
    }
  }

  // ── $ping ──
  if (comando === 'ping') {
    return responder(message, criarEmbed({ titulo: 'Pong!', descricao: 'Pong! ✧', cor: THEME.corPrincipal }));
  }

  // ── $dado NdM ──
  if (comando === 'dado') {
    const notacao = args[0] || '';
    const resultado = rolarDados(notacao);
    if (!resultado) {
      return responder(
        message,
        criarEmbed({
          titulo: 'Notação inválida',
          descricao: 'Use `NdM` ou `NdM±X`, ex: `$dado 1d20`, `$dado 2d6+3`.',
          cor: 0xE67E80,
        }),
        true
      );
    }
    const { quantidade, lados, modificador, rolagens, total } = resultado;
    const linha = rolagens.map((v) => `\`${v}\``).join('  ·  ');
    const linhaMod = modificador !== 0 ? `\n**Modificador:** ${modificador > 0 ? '+' : ''}$modificador}` : '';
    return responder(
      message,
      criarEmbed({
        titulo: 'A lua decidiu os dados',
        descricao: `${THEME.iconeFooter} Rolando **${quantidade}d${lados}**...\n\n${linha}${linhaMod}\n\n**✦ Resultado final: \`${total}\`**`,
        cor: THEME.corDado,
        rodape: `${THEME.nome} rolou para ${message.author.username}`,
      })
    );
  }

  // ── $roleta / $sortear ──
  if (comando === 'roleta' || comando === 'sortear') {
    const opcoes = args.join(' ').split(',').map((o) => o.trim()).filter((o) => o.length > 0);
    if (opcoes.length < 2) {
      return responder(
        message,
        criarEmbed({
          titulo: 'Opções insuficientes',
          descricao: 'Preciso de **pelo menos duas opções** separadas por vírgula. Ex: `$roleta pizza, sushi, hambúrguer`',
          cor: 0xE67E80,
        }),
        true
      );
    }
    const escolhida = opcoes[Math.floor(Math.random() * opcoes.length)];
    const lista = opcoes.map((o) => (o === escolhida ? `**✧ ${o} ✧**` : `˖ ${o}`)).join('\n');
    return responder(
      message,
      criarEmbed({
        titulo: 'A roleta girou sob a lua',
        descricao: `${lista}\n\n**✦ Escolhida: \`${escolhida}\`**`,
        cor: THEME.corRoleta,
        rodape: `${THEME.nome} girou para ${message.author.username}`,
      })
    );
  }

  // ── $lembrete ──
  if (comando === 'lembrete') {
    const sub = (args[0] || '').toLowerCase();
    if (sub === 'listar') {
      const meus = carregarLembretes().filter((l) => l.userId === message.author.id);
      if (meus.length === 0) {
        return responder(
          message,
          criarEmbed({ titulo: 'Nenhum lembrete por aqui', descricao: 'Você não tem lembretes ativos.', cor: THEME.corLembrete }),
          true
        );
      }
      const linhas = meus
        .sort((a, b) => a.disparaEm - b.disparaEm)
        .map((l) => {
          const restante = l.disparaEm - Date.now();
          return `˖ \`${l.id}\` — "${l.mensagem}" em **${formatarDuracao(Math.max(restante, 0))}**`;
        })
        .join('\n');
      return responder(
        message,
        criarEmbed({ titulo: 'Seus lembretes ativos', descricao: linhas, cor: THEME.corLembrete }),
        true
      );
    }
    if (sub === 'cancelar') {
      const id = args[1];
      const alvo = carregarLembretes().find((l) => l.id === id && l.userId === message.author.id);
      if (!alvo) {
        return responder(
          message,
          criarEmbed({ titulo: 'Lembrete não encontrado', descricao: `Não encontrei \`${id}\` seu.`, cor: 0xE67E80 }),
          true
        );
      }
      removerLembrete(id);
      return responder(
        message,
        criarEmbed({ titulo: 'Lembrete cancelado', descricao: `O lembrete \`${id}\` foi apagado.`, cor: THEME.corLembrete }),
        true
      );
    }
    // criar: $lembrete <tempo> <mensagem...>
    const tempoTexto = args[0];
    const mensagemTxt = args.slice(1).join(' ');
    if (!tempoTexto || !mensagemTxt) {
      return responder(
        message,
        criarEmbed({
          titulo: 'Uso incorreto',
          descricao: 'Use: `$lembrete 10m beber água` ou `$lembrete listar`.',
          cor: 0xE67E80,
        }),
        true
      );
    }
    const ms = parseTempo(tempoTexto);
    if (!ms || ms > 30 * 24 * 60 * 60 * 1000) {
      return responder(
        message,
        criarEmbed({ titulo: 'Tempo inválido', descricao: 'Use algo como `10m`, `1h30m`, `2d` (máx 30 dias).', cor: 0xE67E80 }),
        true
      );
    }
    const id = crypto.randomBytes(3).toString('hex');
    const lembrete = { id, userId: message.author.id, channelId: message.channelId, mensagem: mensagemTxt, disparaEm: Date.now() + ms };
    adicionarLembrete(lembrete);
    agendarLembrete(client, lembrete);
    return responder(
      message,
      criarEmbed({
        titulo: 'Lembrete guardado sob a lua',
        descricao: `Vou te lembrar em **${formatarDuracao(ms)}**:\n> "${mensagemTxt}"\n\n**ID:** \`${id}\``,
        cor: THEME.corLembrete,
        rodape: `${THEME.nome} não vai esquecer, ${message.author.username}`,
      })
    );
  }

  // ── $anuncio <tipo> <mensagem> ──
  if (comando === 'anuncio') {
    const tipo = (args[0] || '').toLowerCase();
    const mensagemTxt = args.slice(1).join(' ');
    if (!TIPOS_ANUNCIO.includes(tipo) || !mensagemTxt) {
      return responder(
        message,
        criarEmbed({
          titulo: 'Uso incorreto',
          descricao: `Use: \`$anuncio <tipo> <mensagem>\`. Tipos: ${TIPOS_ANUNCIO.join(', ')}.`,
          cor: 0xE67E80,
        }),
        true
      );
    }
    const cfg = obterConfig(guildId);
    const canalId = cfg.anuncios[tipo];
    if (!canalId) {
      return responder(
        message,
        criarEmbed({
          titulo: 'Nenhum canal configurado',
          descricao: `Não há canal para anúncios do tipo **${tipo}**. Use \`$configurar anuncio ${tipo} #canal\`.`,
          cor: 0xE67E80,
        }),
        true
      );
    }
    let canal;
    try {
      canal = await client.channels.fetch(canalId);
    } catch {
      canal = null;
    }
    if (!canal) {
      return responder(
        message,
        criarEmbed({ titulo: 'Canal não encontrado', descricao: 'O canal salvo sumiu ou não tenho acesso.', cor: 0xE67E80 }),
        true
      );
    }
    const rotulos = {
      geral: { titulo: 'Aviso Geral', emoji: '📣', cor: THEME.corPrincipal },
      evento: { titulo: 'Evento Lunar', emoji: '🎉', cor: 0xC9B8F2 },
      regra: { titulo: 'Regra do Servidor', emoji: '📜', cor: 0xA895E0 },
      atualizacao: { titulo: 'Atualização', emoji: '✨', cor: THEME.corRoleta },
      aviso: { titulo: 'Aviso Importante', emoji: '⚠️', cor: 0xE67E80 },
    };
    const rotulo = rotulos[tipo] || { titulo: 'Anúncio', emoji: '📢', cor: THEME.corPrincipal };
    const embed = criarEmbed({
      titulo: `${rotulo.emoji} ${rotulo.titulo}`,
      descricao: mensagemTxt,
      cor: rotulo.cor,
      rodape: `Anunciado por ${message.author.username} • ${THEME.nome}`,
    });
    try {
      await canal.send({ embeds: [embed] });
    } catch (erro) {
      return responder(
        message,
        criarEmbed({ titulo: 'Não consegui enviar', descricao: `Falhou: ${erro.message}`, cor: 0xE67E80 }),
        true
      );
    }
    return responder(
      message,
      criarEmbed({ titulo: 'Anúncio enviado', descricao: `Seu anúncio do tipo **${tipo}** foi para ${canal}.`, cor: THEME.corSucesso }),
      true
    );
  }

  // ── $configurar ... ──
  if (comando === 'configurar') {
    const sub = (args[0] || '').toLowerCase();
    if (!message.memberPermissions || !message.memberPermissions.has('ManageGuild')) {
      return responder(
        message,
        criarEmbed({ titulo: 'Sem permissão', descricao: 'Você precisa de **Gerir Servidor** para usar isso.', cor: 0xE67E80 }),
        true
      );
    }
    const cfg = obterConfig(guildId);
    if (sub === 'ver') return enviarConfiguracao(message, guildId);

    if (sub === 'permitir' || sub === 'liberar') {
      const canalId = extrairCanal(message);
      if (!canalId) return responder(message, criarEmbed({ titulo: 'Canal?', descricao: 'Marque um canal: `$configurar permitir #canal`.', cor: 0xE67E80 }), true);
      if (sub === 'permitir') {
        if (!cfg.canaisPermitidos.includes(canalId)) cfg.canaisPermitidos.push(canalId);
      } else {
        cfg.canaisPermitidos = cfg.canaisPermitidos.filter((id) => id !== canalId);
      }
      salvarConfig(guildId, cfg);
      const txt = sub === 'permitir' ? 'Agora falo em' : 'Removi dos permitidos';
      return responder(message, criarEmbed({ titulo: 'Pronto', descricao: `${txt} <#${canalId}>.`, cor: THEME.corSucesso }), true);
    }

    if (sub === 'proibir' || sub === 'desproibir') {
      const canalId = extrairCanal(message);
      if (!canalId) return responder(message, criarEmbed({ titulo: 'Canal?', descricao: 'Marque um canal: `$configurar proibir #canal`.', cor: 0xE67E80 }), true);
      if (sub === 'proibir') {
        if (!cfg.canaisBloqueados.includes(canalId)) cfg.canaisBloqueados.push(canalId);
      } else {
        cfg.canaisBloqueados = cfg.canaisBloqueados.filter((id) => id !== canalId);
      }
      salvarConfig(guildId, cfg);
      const txt = sub === 'proibir' ? 'Parei de falar em' : 'Liberei para falar em';
      return responder(message, criarEmbed({ titulo: 'Pronto', descricao: `${txt} <#${canalId}>.`, cor: THEME.corSucesso }), true);
    }

    if (sub === 'anuncio') {
      const tipo = (args[1] || '').toLowerCase();
      const canalId = extrairCanal(message);
      if (!TIPOS_ANUNCIO.includes(tipo) || !canalId) {
        return responder(
          message,
          criarEmbed({ titulo: 'Uso incorreto', descricao: 'Use: `$configurar anuncio <tipo> #canal`.', cor: 0xE67E80 }),
          true
        );
      }
      cfg.anuncios[tipo] = canalId;
      salvarConfig(guildId, cfg);
      return responder(
        message,
        criarEmbed({ titulo: 'Canal de anúncio definido', descricao: `Anúncios do tipo **${tipo}** vão para <#${canalId}>.`, cor: THEME.corSucesso }),
        true
      );
    }

    if (sub === 'limparanuncio') {
      const tipo = (args[1] || '').toLowerCase();
      if (!TIPOS_ANUNCIO.includes(tipo)) {
        return responder(message, criarEmbed({ titulo: 'Tipo?', descricao: `Tipos: ${TIPOS_ANUNCIO.join(', ')}.`, cor: 0xE67E80 }), true);
      }
      cfg.anuncios[tipo] = null;
      salvarConfig(guildId, cfg);
      return responder(message, criarEmbed({ titulo: 'Limpo', descricao: `Canal de **${tipo}** removido.`, cor: THEME.corSucesso }), true);
    }

    return responder(
      message,
      criarEmbed({
        titulo: 'Subcomandos de $configurar',
        descricao:
          '`ver` · `permitir #canal` · `liberar #canal` · `proibir #canal` · `desproibir #canal` · `anuncio <tipo> #canal` · `limparanuncio <tipo>`',
        cor: THEME.corPrincipal,
      }),
      true
    );
  }

  // ── $organizar ──
  if (comando === 'organizar') {
    const cfg = obterConfig(guildId);
    const roteamento = TIPOS_ANUNCIO.map((t) => {
      const id = cfg.anuncios[t];
      return `˖ **${t}** → ${id ? `<#${id}>` : '`sem canal`'}`;
    }).join('\n');
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor(THEME.corPrincipal)
      .setTitle(`${THEME.iconeFooter} Painel de Organização`)
      .setDescription('Comandos por prefixo `$` e slash `/` funcionam igual. Use `$configurar` para ajustar canais.')
      .addFields(
        { name: '🎲 Diversão', value: '`$dado`, `$roleta`', inline: true },
        { name: '⏰ Lembretes', value: '`$lembrete`', inline: true },
        { name: '📣 Comunicação', value: '`$anuncio`, `$configurar`', inline: true },
        { name: '📍 Roteamento de anúncios', value: roteamento, inline: false },
        {
          name: '🗣️ Onde a bot fala',
          value:
            cfg.canaisPermitidos.length > 0
              ? `Somente em: ${cfg.canaisPermitidos.map((id) => `<#${id}>`).join('  ·  ')}`
              : 'Em qualquer canal (exceto os bloqueados)',
          inline: false,
        }
      )
      .setFooter({ text: `${THEME.nome} organiza por aqui...` })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  // ── $ajuda ──
  if (comando === 'ajuda' || comando === 'help') {
    const embed = criarEmbed({
      titulo: 'Comandos por prefixo $',
      descricao:
        '`$ping` · `$dado 1d20` · `$roleta a, b` · `$lembrete 10m msg` · `$lembrete listar` · `$anuncio <tipo> msg` · `$configurar ver` · `$organizar`\n\n' +
        'Todos também funcionam como slash `/`. Para gerenciar canais use `$configurar`.',
      cor: THEME.corPrincipal,
    });
    return responder(message, embed, true);
  }
}

module.exports = { PREFIXO, handlePrefix };