const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { criarEmbed, THEME } = require('../utils/theme');
const { registerChallenge } = require('../utils/guerraManager');
const { registrarVitoria, atualizarNome, top } = require('../utils/guerraStore');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TRANSITION_DELAY = 1600;
const ACTION_DELAY = 1800;

// Guerra: comando de batalha um-contra-outro por reação (turnos).
// Implementação com pool de ataques temáticos de memes, pickups,
// aceitação de desafio e animações por edição de embed.

const EMOJI_NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
const REACT_PICKUP = '🎁';
const REACT_SPECIAL = '⚡';
const REACT_DEFEND = '🛡️';

const TIPOS_MEME = ['ragememe', 'dankmeme', 'brmeme', 'normiememe'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getTypeLabel(type) {
  const map = {
    ragememe: 'Rage Meme',
    dankmeme: 'Dank Meme',
    brmeme: 'BR Meme',
    normiememe: 'Normie Meme',
  };
  return map[type] || type;
}

function getEffectLabel(effect) {
  const map = {
    burn: '🔥 Burn (dano ao longo do tempo)',
    armor: '🛡️ Escudo (reduz dano)',
    drain: '💧 Drain (cura parte do dano)',
    stun: '⚡ Stun (pula o próximo turno)',
  };
  return map[effect] || '';
}

function formatStatusLine(player) {
  if (!player.statuses || !player.statuses.length) return 'Nenhum status ativo';
  return player.statuses.map((status) => {
    if (status.type === 'burn') return `🔥 Burn (${status.turns} turns)`;
    if (status.type === 'armor') return `🛡️ Escudo (${status.turns} turns)`;
    if (status.type === 'stun') return `⚡ Stun (${status.turns} turns)`;
    return status.type;
  }).join(' • ');
}

function applyStartOfTurnEffects(player) {
  if (!player.statuses) return { text: '', skip: false };
  let text = '';
  let skip = false;
  const nextStatuses = [];

  for (const status of player.statuses) {
    if (status.type === 'burn') {
      player.hp = Math.max(0, player.hp - status.damage);
      text += `🔥 ${player.user.username} sofreu ${status.damage} de burn.\n`;
    }
    if (status.type === 'stun') {
      text += `⚡ ${player.user.username} está atordoado e pula o turno.\n`;
      skip = true;
    }
    if (status.type === 'armor') {
      text += `🛡️ ${player.user.username} está protegido por um escudo.\n`;
    }

    status.turns -= 1;
    if (status.turns > 0) {
      nextStatuses.push(status);
    }
  }

  player.statuses = nextStatuses;
  return { text: text.trim(), skip };
}

function buildAttackPool() {
  const pool = [];
  const types = TIPOS_MEME;
  const names = {
    ragememe: [
      'Rage Face Smash', 'Triggered Keyboard', 'Calma, Copa do Mundo!', 'Furação TikTok', 'Grito de Meme',
      'Crash de Tablet', 'Fúria do Cereal', 'Meus Dados!', 'Churrasco Furioso', 'Estourada de Pipoca',
      'Furioso no Zap', 'Explosão de Caps Lock', 'Trem Brasileiro', 'Chave de Fenda Grace', 'Seu Wifi',
      'Gente Fofinha', 'Emoji Louco', 'NinguémMandou', 'Bugou o Sistema', 'Rage Quit Dono',
    ],
    dankmeme: [
      'Meme do Dedinho', 'Pasta de Memes', 'Vibe do Pepe', 'Cabelo de Bolha', 'Café com Jojo',
      'Meme do Porquinho', 'Telefone da Mãe', 'No Chill', 'Realidade Cancelada', 'Meme Clássico',
      'Leg Day do Bot', 'Tá Tranquilo', 'Coringa do Discord', 'Biscoito da Sorte', 'Dandinho',
      'Tornar GIF', 'Não Foi Bom', 'Rank S Memes', 'Sem Contexto', 'Meme do Baile',
    ],
    brmeme: [
      'Senta Pai', 'É Hoje que Tem', 'Fora Temer', 'Chama no Pix', 'Tô de Corneta',
      'Tira a Mão do Bolinho', 'É Nóis', 'Simsalabim do Meme', 'Vai Desce', 'Pagode de Batalha',
      'Booyah do Zap', 'Meme do Churras', 'Cade meu Troco', 'Pé de Vento', 'Senta Tchutchuca',
      'Bode no Topo', 'Senta Que Lage', 'Guerra de Katana', 'Me Chama no PV', 'Bomba de Risada',
    ],
    normiememe: [
      'Senta Pai Normal', 'É Hoje que Tem Normal', 'Fora Temer Normal', 'Chama no Pix Normal', 'Tô de Corneta Normal',
      'Tira a Mão do Bolinho Normal', 'É Nóis Normal', 'Simsalabim do Meme Normal', 'Vai Desce Normal', 'Pagode de Batalha Normal',
      'Booyah do Zap Normal', 'Meme do Churras Normal', 'Cade meu Troco Normal', 'Pé de Vento Normal', 'Senta Tchutchuca Normal',
      'Bode no Topo Normal', 'Senta Que Lage Normal', 'Guerra de Katana Normal', 'Me Chama no PV Normal', 'Bomba de Risada Normal',
    ],
  };
  const effectMap = { ragememe: 'burn', dankmeme: 'armor', brmeme: 'drain', normiememe: 'stun' };
  const imagesDir = path.resolve(__dirname, '..', 'static', 'guerra');
  const available = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir).filter((f) => /\.(png|jpe?g)$/i.test(f)) : [];
  for (let i = 1; i <= 80; i++) {
    const type = types[i % types.length];
    const namesList = names[type];
    const attackName = namesList[(i - 1) % namesList.length];
    const filename = `atk_${type}_${i}.png`;
    const chosen = available.length > 0 ? available[(i - 1) % available.length] : filename;
    const weakAgainst = type === 'dankmeme' ? 'ragememe' : type === 'ragememe' ? 'brmeme' : type === 'brmeme' ? 'normiememe' : 'dankmeme';
    const effect = effectMap[type];
    pool.push({
      id: `atk${i}`,
      name: attackName,
      type,
      typeLabel: getTypeLabel(type),
      cost: rand(1, 3),
      dmgMin: rand(6, 12),
      dmgMax: rand(12, 28),
      image: `static/guerra/${chosen}`,
      weakAgainst,
      weakLabel: getTypeLabel(weakAgainst),
      effect,
      effectLabel: getEffectLabel(effect),
    });
  }
  return pool;
}

function buildSpecials() {
  const specials = [];
  const imagesDir = path.resolve(__dirname, '..', 'static', 'guerra');
  const available = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir).filter((f) => /\.(png|jpe?g)$/i.test(f)) : [];
  for (let i = 1; i <= 20; i++) {
    const filename = `special_${i}.png`;
    const chosen = available.length > 0 ? available[(100 + i - 1) % available.length] : filename;
    specials.push({
      id: `sp${i}`,
      name: `Especial ${i}`,
      cost: 3,
      dmgMin: rand(18, 28),
      dmgMax: rand(30, 60),
      image: `static/guerra/${chosen}`,
      special: true,
      effect: i % 4 === 0 ? 'heal' : i % 3 === 0 ? 'multi' : 'heavy',
    });
  }
  return specials;
}

const POOL = buildAttackPool();
const SPECIALS = buildSpecials();

function sampleOptions(pool, count = 4) {
  const out = [];
  const used = new Set();
  while (out.length < count && out.length < pool.length) {
    const idx = rand(0, pool.length - 1);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(pool[idx]);
  }
  return out;
}

function shortAvatarField(user) {
  return `${user.username} (${user.discriminator || ''})`;
}

function manualEmbed() {
  return criarEmbed({
    titulo: '⚔️ Manual da Guerra de Memes',
    descricao:
      'Uma batalha 1x1 por reações. Cada jogador começa com **100 HP** e **3 pontos de ação**.\n\n' +
      '**🎯 Como jogar**\n' +
      '• Use `$guerra @alguém` para desafiar. O marcado reage ✅ para aceitar ou ❌ para recusar.\n' +
      '• Marque a própria bot para uma **guerra solo** contra a máquina!\n' +
      '• Sem marcar ninguém? Aparece este manual. Use `$guerra placar` para o ranking.\n\n' +
      '**⚡ As reações por turno**\n' +
      '• `1️⃣ 2️⃣ 3️⃣ 4️⃣` — Atacar com o meme escolhido (cada um tem um **custo em pontos**).\n' +
      '• `🛡️` — **Defender**: ganha +1 ponto de ação (máx 5), não ataca.\n' +
      '• `⚡` — **Especial**: usa a arma coletada (custa 3 pontos; sorteia heal/multi/heavy).\n' +
      '• `🎁` — Aparece sozinho de vez em quando: reaja para pegar uma arma (bônus de dano).\n\n' +
      '**🧩 Tipos e efeitos**\n' +
      '• Rage Meme → 🔥 **Burn** (dano ao longo do tempo).\n' +
      '• Dank Meme → 🛡️ **Escudo** (reduz o dano que você recebe).\n' +
      '• BR Meme → 💧 **Drain** (cura parte do dano causado).\n' +
      '• Normie Meme → ⚡ **Stun** (o inimigo pula o próximo turno).\n\n' +
      '**🏆 Regras**\n' +
      '• Fraqueza de tipo dá **+25% de dano** (cada tipo é fraco contra outro).\n' +
      '• Sem pontos suficientes para um ataque? Você perde a vez.\n' +
      '• Vence quem deixar o HP do oponente em 0. Cada vitória entra no **placar**!',
    cor: THEME.corPrincipal,
    rodape: 'Use $guerra @oponente e bom combate ✧',
  });
}

function placarEmbed() {
  const lista = top(10);
  const corpo = lista.length
    ? lista.map((e, i) => `**${i + 1}.** ${e.nome} — \`${e.vitorias}\` vitória(s)`).join('\n')
    : 'Ainda não houve batalhas. Seja o primeiro campeão!';
  return criarEmbed({
    titulo: '🏆 Placar de Guerra',
    descricao: corpo,
    cor: THEME.corPrincipal,
    rodape: 'Maiores guerreiros de meme da lua ✧',
  });
}

module.exports = {
  data: { name: 'guerra', description: '⚔️ Inicia uma batalha contra outro usuário (desafie usando @)' },
  async execute(interaction) {
    const args = interaction.options && typeof interaction.options.getString === 'function'
      ? (interaction.options.getString('sub') || '').toLowerCase()
      : (interaction._guerraArgs || []).join(' ').toLowerCase();

    // Placar
    if (args === 'placar' || args === 'ranking') {
      return interaction.reply({ embeds: [placarEmbed()] });
    }
    // Manual explícito
    if (args === 'manual' || args === 'ajuda' || args === 'help') {
      return interaction.reply({ embeds: [manualEmbed()] });
    }

    // Resolução do oponente: prefere a menção da própria mensagem
    let opponent = interaction.options && interaction.options.getUser ? interaction.options.getUser('usuario') : null;
    if (!opponent && interaction._guerraMention) opponent = interaction._guerraMention;
    if (!opponent && interaction.channel) {
      const mencaoDireta = interaction.message && interaction.message.mentions && interaction.message.mentions.users
        ? interaction.message.mentions.users.first()
        : null;
      if (mencaoDireta) opponent = mencaoDireta;
    }

    // Sem oponente válido (ou bot que não seja a própria) -> mostra o manual
    if (!opponent || (opponent.bot && opponent.id !== interaction.client.user.id)) {
      return interaction.reply({ embeds: [manualEmbed()] });
    }

    const isBotOponente = opponent.id === interaction.client.user.id;

    // Guerra solo: a própria bot aceita automaticamente
    if (!isBotOponente) {
      const chal = criarEmbed({
        titulo: '⚔️ Desafio de Guerra',
        descricao: `${interaction.user} desafiou ${opponent} para uma batalha!\n${opponent}, reaja com ✅ para aceitar ou ❌ para recusar.`,
        cor: THEME.corPrincipal,
      });
      const msg = await interaction.reply({ embeds: [chal], fetchReply: true });
      await msg.react('✅');
      await msg.react('❌');
      await msg.fetch();

      let accepted = false;
      try {
        const result = await registerChallenge(msg, opponent.id, 60000);
        if (result === '❌') {
          await msg.edit({ embeds: [criarEmbed({ titulo: 'Desafio recusado', descricao: `${opponent} recusou o desafio.`, cor: 0xE67E80 })], components: [] });
          return;
        }
        accepted = result === '✅';
      } catch (e) {
        await msg.edit({ embeds: [criarEmbed({ titulo: 'Desafio expirado', descricao: 'Ninguém respondeu ao desafio.', cor: 0xE67E80 })] });
        return;
      }
      if (!accepted) {
        await msg.edit({ embeds: [criarEmbed({ titulo: 'Desafio recusado', descricao: `${opponent} recusou o desafio.`, cor: 0xE67E80 })], components: [] });
        return;
      }
    } else {
      const chal = criarEmbed({
        titulo: '🤖 Guerra Solo!',
        descricao: `${interaction.user} desafiou a própria máquina! Prepare-se para lutar contra ${opponent}...`,
        cor: THEME.corPrincipal,
      });
      await interaction.reply({ embeds: [chal], fetchReply: true });
    }

    // Inicializa combatentes
    const p1 = { id: interaction.user.id, user: interaction.user, hp: 100, points: 3, type: TIPOS_MEME[rand(0, 3)], weapons: [], statuses: [], avatar: interaction.user.displayAvatarURL({ size: 256 }), isBot: false };
    const botUser = isBotOponente ? opponent : interaction.client.user;
    const p2 = { id: opponent.id, user: opponent, hp: 100, points: 3, type: TIPOS_MEME[rand(0, 3)], weapons: [], statuses: [], avatar: opponent.displayAvatarURL({ size: 256 }), isBot: isBotOponente };
    const players = [p1, p2];

    let turn = 0;
    let round = 1;

    const renderStatusEmbed = (stateText = '') => {
      const embed = criarEmbed({
        titulo: '⚔️ Status da Guerra',
        descricao: `**${shortAvatarField(p1.user)}** — HP: \`${p1.hp}\` • Pontos: \`${p1.points}\` • Armas: \`${p1.weapons.length}\`\n${formatStatusLine(p1)}\n**${shortAvatarField(p2.user)}** — HP: \`${p2.hp}\` • Pontos: \`${p2.points}\` • Armas: \`${p2.weapons.length}\`\n${formatStatusLine(p2)}\n\n${stateText}`,
        cor: THEME.corPrincipal,
      });
      return embed;
    };

    const renderActionEmbed = (actor, text = '') => {
      const embed = criarEmbed({
        titulo: `Turno de ${actor.user.username}`,
        descricao: text || 'Escolha sua ação reagindo com um ícone abaixo.',
        cor: THEME.corPrincipal,
      });
      embed.setThumbnail(actor.avatar);
      return embed;
    };

    let battleMsg = await interaction.editReply({ embeds: [renderStatusEmbed('Preparando batalha...'), renderActionEmbed(interaction.user, 'Aguardando início da batalha...')] });

    const attackPool = POOL.slice();

    // Decide a ação do bot (escolha simples: ataca o mais forte que pode pagar, senão defende)
    async function botAct() {
      const bot = players[1];
      const opts = sampleOptions(attackPool, 4);
      const affordable = opts.filter((o) => bot.points >= o.cost);
      if (affordable.length && bot.points >= 1) {
        const atk = affordable[rand(0, affordable.length - 1)];
        return { kind: 'attack', atk };
      }
      return { kind: 'defend' };
    }

    async function spawnPickup(actorId) {
      if (Math.random() > 0.18) return null;
      const item = { id: `wp_${Date.now()}`, name: `Arma Aleatória ${rand(1, 999)}`, bonus: rand(3, 12) };
      const pickEmbed = criarEmbed({ titulo: '🎁 Uma arma apareceu!', descricao: `Reaja com ${REACT_PICKUP} para pegar **${item.name}** (bônus ${item.bonus}).`, cor: 0xFFD166 });
      try {
        battleMsg = await interaction.editReply({ embeds: [renderStatusEmbed('Arma disponível!'), pickEmbed] });
        await battleMsg.react(REACT_PICKUP);
        const filter = (r, u) => r.emoji.name === REACT_PICKUP && [p1.id, p2.id].includes(u.id);
        const collected = await battleMsg.awaitReactions({ filter, max: 1, time: 8000 });
        const reaction = collected.first();
        if (reaction) {
          const user = reaction.users.cache.find((u) => [p1.id, p2.id].includes(u.id));
          if (user) {
            const owner = user.id === p1.id ? p1 : p2;
            owner.weapons.push(item);
            await battleMsg.edit({ embeds: [renderStatusEmbed(`Arma capturada por ${owner.user.username}!`), criarEmbed({ titulo: '🎉 Arma pega!', descricao: `${owner.user} pegou **${item.name}**!`, cor: 0x88E0EF })] });
            await sleep(TRANSITION_DELAY);
          }
        }
      } catch {}
      battleMsg = await interaction.editReply({ embeds: [renderStatusEmbed(), renderActionEmbed(players[turn], 'A batalha continua...')] });
    }

    while (p1.hp > 0 && p2.hp > 0) {
      const actor = players[turn];
      const target = players[1 - turn];

      const options = sampleOptions(attackPool, 4);
      const hasSpecial = actor.weapons && actor.weapons.length;

      const optsText = options.map((opt, i) => {
        const cant = actor.points < opt.cost;
        return `${EMOJI_NUM[i]} **${opt.name}** — tipo ${opt.typeLabel} / custo ${opt.cost}${cant ? ' (sem pontos!)' : ''} / dano ${opt.dmgMin}-${opt.dmgMax}${opt.effect ? ` / efeito ${opt.effectLabel}` : ''}`;
      }).join('\n');
      const actionText = `${optsText}\n\nSeus pontos: \`${actor.points}\`. Reaja com o número para atacar (gasta pontos). ${REACT_DEFEND} para defender (+1 ponto). ${REACT_SPECIAL} para usar Especial ${hasSpecial ? '(custa 3 pontos)' : '(sem armas)'}.`;

      const startEffects = applyStartOfTurnEffects(actor);
      const statusHeader = startEffects.text ? `Efeitos ativos:\n${startEffects.text}` : '';

      if (startEffects.skip) {
        battleMsg = await interaction.editReply({ embeds: [renderStatusEmbed(`⚡ ${actor.user.username} está atordoado e perdeu a vez!`), renderActionEmbed(actor, `⚡ Stun! ${actor.user.username} não pode agir neste turno.`)] });
        await sleep(TRANSITION_DELAY);
        try { await battleMsg.reactions.removeAll(); } catch {}
        turn = 1 - turn;
        round++;
        continue;
      }

      battleMsg = await interaction.editReply({ embeds: [renderStatusEmbed(`Round ${round} — vez de ${actor.user.username}`), renderActionEmbed(actor, `${statusHeader}\n${actionText}`)] });

      for (let i = 0; i < options.length; i++) await battleMsg.react(EMOJI_NUM[i]);
      await battleMsg.react(REACT_DEFEND);
      await battleMsg.react(REACT_SPECIAL);

      let choice = null;
      try {
        if (actor.isBot) {
          await sleep(ACTION_DELAY);
          const acao = await botAct();
          if (acao.kind === 'attack') {
            const idx = options.indexOf(acao.atk);
            choice = EMOJI_NUM[idx >= 0 ? idx : 0];
          } else {
            choice = REACT_DEFEND;
          }
        } else {
          const filter = (reaction, user) => {
            const emoji = reaction.emoji.name;
            return [REACT_DEFEND, REACT_SPECIAL, ...EMOJI_NUM].includes(emoji) && user.id === actor.id;
          };
          const collected = await battleMsg.awaitReactions({ filter, max: 1, time: 25000 });
          const reaction = collected.first();
          choice = reaction ? reaction.emoji.name : null;
        }
      } catch (e) {
        await battleMsg.edit({ embeds: [renderStatusEmbed('Ação perdida!'), criarEmbed({ titulo: 'Tempo esgotado', descricao: `${actor.user} não reagiu a tempo.`, cor: 0xE67E80 })] });
        await sleep(TRANSITION_DELAY);
      }

      // resolve ação
      try {
        if (choice === REACT_DEFEND) {
          actor.points = Math.min(5, actor.points + 1);
          await battleMsg.edit({ embeds: [renderStatusEmbed(`${actor.user.username} defendeu!`), criarEmbed({ titulo: `${actor.user.username} defendeu!`, descricao: `Ganhou 1 ponto de ação.`, cor: 0x9AE66E })] });
          await sleep(ACTION_DELAY);
        } else if (choice === REACT_SPECIAL && actor.weapons.length) {
          if (actor.points < 3) {
            await battleMsg.edit({ embeds: [renderStatusEmbed(`${actor.user.username} não tem pontos!`), criarEmbed({ titulo: 'Pontos insuficientes', descricao: `${actor.user.username} precisa de 3 pontos para o Especial (tem ${actor.points}). Perdeu a vez.`, cor: 0xE67E80 })] });
            await sleep(TRANSITION_DELAY);
          } else {
            actor.points -= 3;
            const w = actor.weapons.shift();
            const sp = SPECIALS[rand(0, SPECIALS.length - 1)];
            let dmg = w.bonus + rand(6, 18);
            let extra = '';
            if (sp.effect === 'heal') {
              const c = Math.min(15, Math.floor(dmg * 0.5));
              actor.hp = Math.min(100, actor.hp + c);
              extra = `\n💚 Curou ${c} de HP!`;
            } else if (sp.effect === 'multi') {
              dmg = Math.floor(dmg * 1.6);
              extra = '\n💥 Acerto múltiplo!';
            } else if (sp.effect === 'heavy') {
              dmg = Math.floor(dmg * 1.3);
              extra = '\n🏋️ Golpe pesado!';
            }
            target.hp = Math.max(0, target.hp - dmg);
            await battleMsg.edit({ embeds: [renderStatusEmbed(`${actor.user.username} usou Especial! (-3 pt)`), criarEmbed({ titulo: `${actor.user.username} usou ${sp.name}!`, descricao: `Causou ${dmg} de dano.${extra}`, cor: 0xFF7BAC })] });
            await sleep(ACTION_DELAY);
          }
        } else if (choice && EMOJI_NUM.includes(choice)) {
          const idx = EMOJI_NUM.indexOf(choice);
          const atk = options[idx];
          if (actor.points < atk.cost) {
            await battleMsg.edit({ embeds: [renderStatusEmbed(`${actor.user.username} não tem pontos!`), criarEmbed({ titulo: 'Pontos insuficientes', descricao: `${actor.user.username} precisava de ${atk.cost} ponto(s) (tem ${actor.points}). Perdeu a vez.`, cor: 0xE67E80 })] });
            await sleep(TRANSITION_DELAY);
          } else {
            actor.points -= atk.cost;
            let dmg = rand(atk.dmgMin, atk.dmgMax);
            const statusText = [];
            if (atk.weakAgainst && atk.weakAgainst === target.type) {
              dmg = Math.floor(dmg * 1.25);
              statusText.push(`✨ Bônus de fraqueza contra ${atk.weakLabel}!`);
            }
            const armor = target.statuses && target.statuses.find((s) => s.type === 'armor');
            if (armor) {
              const reduction = Math.min(6, Math.max(2, Math.floor(dmg * 0.22)));
              dmg = Math.max(0, dmg - reduction);
              statusText.push(`🛡️ Escudo reduziu ${reduction} de dano!`);
            }
            target.hp = Math.max(0, target.hp - dmg);
            if (atk.effect === 'burn') {
              target.statuses.push({ type: 'burn', turns: 2, damage: 4 });
              statusText.push('🔥 Burn aplicado!');
            } else if (atk.effect === 'drain') {
              const heal = Math.min(6, Math.floor(dmg * 0.35));
              actor.hp = Math.min(100, actor.hp + heal);
              statusText.push(`💧 Drain curou ${heal} de HP!`);
            } else if (atk.effect === 'stun') {
              target.statuses.push({ type: 'stun', turns: 1 });
              statusText.push('⚡ Stun aplicado!');
            } else if (atk.effect === 'armor') {
              target.statuses.push({ type: 'armor', turns: 2 });
              statusText.push('🛡️ Escudo aplicado!');
            }
            const statusLine = statusText.length ? `\n${statusText.join('\n')}` : '';
            await battleMsg.edit({ embeds: [renderStatusEmbed(`${actor.user.username} atacou! (-${atk.cost} pt)`), criarEmbed({ titulo: `${actor.user.username} usou ${atk.name}!`, descricao: `${actor.user} → ${target.user}\nDano: \`${dmg}\`${statusLine}`, cor: 0xF5A962 })] });
            await sleep(ACTION_DELAY);
          }
        } else {
          await battleMsg.edit({ embeds: [renderStatusEmbed('Ação perdida!'), criarEmbed({ titulo: 'Tempo esgotado', descricao: `${actor.user} não executou ação, perdeu a vez.`, cor: 0xE67E80 })] });
          await sleep(TRANSITION_DELAY);
        }
      } catch (e) {
        await battleMsg.edit({ embeds: [renderStatusEmbed('Ação perdida!'), criarEmbed({ titulo: 'Tempo esgotado', descricao: `${actor.user} não reagiu a tempo.`, cor: 0xE67E80 })] });
        await sleep(TRANSITION_DELAY);
      }

      await spawnPickup(actor.id);

      try { await battleMsg.reactions.removeAll(); } catch {}
      turn = 1 - turn;
      round++;
    }

    battleMsg = await interaction.editReply({ embeds: [renderStatusEmbed('Final da batalha!'), renderActionEmbed(players[turn], 'Resultado chegando...')] });

    const winner = p1.hp > 0 ? p1 : p2;
    const loser = p1.hp > 0 ? p2 : p1;

    // Registra vitória no placar (ignora vitória da própria bot)
    try {
      if (!winner.isBot) {
        registrarVitoria(winner.id, winner.user.username);
      } else {
        atualizarNome(loser.id, loser.user.username);
      }
    } catch {}

    const frames = [
      criarEmbed({ titulo: `🏆 ${winner.user.username} venceu!`, descricao: `${shortAvatarField(winner.user)} triunfou sobre ${shortAvatarField(loser.user)}.`, cor: 0xFFD166 }),
      criarEmbed({ titulo: `✨ Fraude Concluída`, descricao: `${winner.user} é o vencedor!`, cor: 0x88E0EF }),
    ];
    for (const f of frames) {
      try {
        await interaction.editReply({ embeds: [f] });
        await new Promise((r) => setTimeout(r, 900));
      } catch {}
    }

    return;
  },
};