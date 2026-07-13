const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { criarEmbed, THEME } = require('../utils/theme');

// Guerra: comando de batalha um-contra-outro por reação (turnos).
// Implementação com pool de ataques (100 ataques + ~20 especiais), pickups
// de "armas" (Mudae-like), aceitação de desafio e animações por edição de embed.

const EMOJI_NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
const REACT_PICKUP = '🎁';
const REACT_SPECIAL = '⚡';
const REACT_DEFEND = '🛡️';

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildAttackPool() {
  const pool = [];
  const types = ['dank', 'rage', 'brasileiro', 'classic'];
  const imagesDir = path.resolve(__dirname, '..', 'static', 'guerra');
  const available = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir).filter(f => /\.(png|jpe?g)$/i.test(f)) : [];
  for (let i = 1; i <= 100; i++) {
    const type = types[i % types.length];
    const filename = `atk_${type}_${i}.png`;
    const chosen = (available.length > 0) ? available[(i - 1) % available.length] : filename;
    pool.push({
      id: `atk${i}`,
      name: `${type === 'dank' ? 'Dank' : type === 'rage' ? 'Rage' : type === 'brasileiro' ? 'Brasileiro' : 'Classic'} Strike ${i}`,
      type,
      cost: rand(1, 3),
      dmgMin: rand(6, 12),
      dmgMax: rand(12, 28),
      image: `static/guerra/${chosen}`,
      weakAgainst: type === 'dank' ? 'rage' : type === 'rage' ? 'brasileiro' : type === 'brasileiro' ? 'classic' : 'dank',
    });
  }
  return pool;
}

function buildSpecials() {
  const specials = [];
  const imagesDir = path.resolve(__dirname, '..', 'static', 'guerra');
  const available = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir).filter(f => /\.(png|jpe?g)$/i.test(f)) : [];
  for (let i = 1; i <= 20; i++) {
    const filename = `special_${i}.png`;
    const chosen = (available.length > 0) ? available[(100 + i - 1) % available.length] : filename;
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

module.exports = {
  data: { name: 'guerra', description: '⚔️ Inicia uma batalha contra outro usuário (desafie usando @)' },
  async execute(interaction) {
    // Determine opponent: try option, else scan recent messages by author for mention
    let opponent = interaction.options && interaction.options.getUser ? interaction.options.getUser('usuario') : null;
    if (!opponent && interaction.channel) {
      try {
        const msgs = await interaction.channel.messages.fetch({ limit: 12 });
        const mine = msgs.find((m) => m.author && m.author.id === interaction.user.id && m.mentions && m.mentions.users && m.mentions.users.size);
        if (mine) opponent = mine.mentions.users.first();
      } catch {}
    }

    if (!opponent || opponent.bot) {
      return interaction.reply({ embeds: [criarEmbed({ titulo: 'Uso: `$guerra @oponente`', descricao: 'Mencione um usuário humano no canal para desafiar.', cor: 0xE67E80 })], ephemeral: true });
    }

    // Send challenge embed with accept/decline via reactions
    const chal = criarEmbed({ titulo: '⚔️ Desafio de Guerra', descricao: `${interaction.user} desafiou ${opponent} para uma batalha!\n${opponent}, reaja com ✅ para aceitar ou ❌ para recusar.`, cor: THEME.corPrincipal });
    const msg = await interaction.reply({ embeds: [chal], fetchReply: true });

    await msg.react('✅');
    await msg.react('❌');

    // Check if opponent already reacted (fast reaction before collector started)
    let accepted = false;
    try {
      const acceptReaction = msg.reactions.cache.get('✅');
      if (acceptReaction) {
        const users = await acceptReaction.users.fetch();
        if (users.has(opponent.id)) accepted = true;
      }
      const declineReaction = msg.reactions.cache.get('❌');
      if (declineReaction && !accepted) {
        const users2 = await declineReaction.users.fetch();
        if (users2.has(opponent.id)) {
          await msg.edit({ embeds: [criarEmbed({ titulo: 'Desafio recusado', descricao: `${opponent} recusou o desafio.`, cor: 0xE67E80 })], components: [] });
          return;
        }
      }
    } catch (e) {
      // ignore fetch errors and fall back to collector
    }

    if (!accepted) {
      const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === opponent.id;
      try {
        const collected = await msg.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] });
        const choice = collected.first().emoji.name;
        if (choice === '❌') {
          await msg.edit({ embeds: [criarEmbed({ titulo: 'Desafio recusado', descricao: `${opponent} recusou o desafio.`, cor: 0xE67E80 })], components: [] });
          return;
        }
      } catch (e) {
        await msg.edit({ embeds: [criarEmbed({ titulo: 'Desafio expirado', descricao: 'Ninguém respondeu ao desafio.', cor: 0xE67E80 })] });
        return;
      }
    }

    // Initialize combatants
    const p1 = { id: interaction.user.id, user: interaction.user, hp: 100, points: 3, weapons: [], avatar: interaction.user.displayAvatarURL({ size: 256 }) };
    const p2 = { id: opponent.id, user: opponent, hp: 100, points: 3, weapons: [], avatar: opponent.displayAvatarURL({ size: 256 }) };
    const players = [p1, p2];

    let turn = 0; // index of active player
    let round = 1;

    // main battle message
    const renderBattle = (stateText = '') => {
      const embed = criarEmbed({
        titulo: `⚔️ Guerra — Round ${round}`,
        descricao: `**${shortAvatarField(p1.user)}** — HP: \`${p1.hp}\`  •  **${shortAvatarField(p2.user)}** — HP: \`${p2.hp}\`\n\n${stateText}`,
        cor: THEME.corPrincipal,
      });
      embed.setThumbnail(players[turn].avatar);
      return embed;
    };

    let battleMsg = await interaction.editReply({ embeds: [renderBattle('Preparando batalha...')] });

    const attackPool = POOL.slice();

    async function spawnPickup() {
      // 18% chance each turn
      if (Math.random() > 0.18) return null;
      const item = { id: `wp_${Date.now()}`, name: `Arma Aleatória ${rand(1,999)}`, bonus: rand(3, 12) };
      const pickEmbed = criarEmbed({ titulo: '🎁 Uma arma apareceu!', descricao: `Reaja com ${REACT_PICKUP} para pegar **${item.name}** (bonus ${item.bonus}).`, cor: 0xFFD166 });
      try {
        const pm = await battleMsg.edit({ embeds: [pickEmbed] });
        await pm.react(REACT_PICKUP);
        const filter = (r, u) => r.emoji.name === REACT_PICKUP && [p1.id, p2.id].includes(u.id);
        const collected = await pm.awaitReactions({ filter, max: 1, time: 8000 });
        const user = collected.first().users.cache.filter((u) => u.id !== msg.author.id).first();
        if (user) {
          const owner = user.id === p1.id ? p1 : p2;
          owner.weapons.push(item);
          await pm.edit({ embeds: [criarEmbed({ titulo: '🎉 Arma pega!', descricao: `${owner.user} pegou **${item.name}**!`, cor: 0x88E0EF })] });
          await sleep(900);
        }
      } catch {}
      // restore battle embed
      battleMsg = await interaction.editReply({ embeds: [renderBattle()] });
    }

    // battle loop
    while (p1.hp > 0 && p2.hp > 0) {
      const actor = players[turn];
      const target = players[1 - turn];

      // sample attack options for this turn
      const options = sampleOptions(attackPool, 4);
      // allow special if player has specials or by chance
      const hasSpecial = actor.weapons && actor.weapons.length;

      const optsText = options.map((opt, i) => `${EMOJI_NUM[i]} **${opt.name}** — custo ${opt.cost} / dano ${opt.dmgMin}-${opt.dmgMax}`).join('\n');
      const turnEmbed = criarEmbed({ titulo: `Turno de ${actor.user.username}`, descricao: `${optsText}\n\nReaja com o número para atacar. ${REACT_DEFEND} para defender. ${REACT_SPECIAL} para usar Especial (se disponível).`, cor: THEME.corPrincipal });
      turnEmbed.setThumbnail(actor.avatar);

      battleMsg = await battleMsg.edit({ embeds: [turnEmbed] });

      // add reactions
      for (let i = 0; i < options.length; i++) await battleMsg.react(EMOJI_NUM[i]);
      await battleMsg.react(REACT_DEFEND);
      await battleMsg.react(REACT_SPECIAL);

      // wait for actor reaction
      try {
        const filter = (reaction, user) => {
          const emoji = reaction.emoji.name;
          return [REACT_DEFEND, REACT_SPECIAL, ...EMOJI_NUM].includes(emoji) && user.id === actor.id;
        };
        const collected = await battleMsg.awaitReactions({ filter, max: 1, time: 25000 });
        const choice = collected.first().emoji.name;

        // resolve action
        if (choice === REACT_DEFEND) {
          // defend reduces incoming damage next turn
          // simple: restore small points
          actor.points = Math.min(5, actor.points + 1);
          await battleMsg.edit({ embeds: [criarEmbed({ titulo: `${actor.user.username} defendeu!`, descricao: `Ganhou 1 ponto de ação.`, cor: 0x9AE66E })] });
          await sleep(800);
        } else if (choice === REACT_SPECIAL && actor.weapons.length) {
          // use a weapon as special: consume first
          const w = actor.weapons.shift();
          const dmg = w.bonus + rand(6, 18);
          target.hp = Math.max(0, target.hp - dmg);
          await battleMsg.edit({ embeds: [criarEmbed({ titulo: `${actor.user.username} usou ${w.name}!`, descricao: `Causou ${dmg} de dano.`, cor: 0xFF7BAC })] });
          await sleep(900);
        } else if (EMOJI_NUM.includes(choice)) {
          const idx = EMOJI_NUM.indexOf(choice);
          const atk = options[idx];
          const dmg = rand(atk.dmgMin, atk.dmgMax);
          // weakness bonus
          let realDmg = dmg;
          if (atk.weakAgainst && atk.weakAgainst === target.type) realDmg = Math.floor(dmg * 1.25);
          target.hp = Math.max(0, target.hp - realDmg);
          await battleMsg.edit({ embeds: [criarEmbed({ titulo: `${actor.user.username} usou ${atk.name}!`, descricao: `${actor.user} → ${target.user}\nDano: \`${realDmg}\``, cor: 0xF5A962 })] });
          await sleep(900);
        } else {
          // no valid action
          await battleMsg.edit({ embeds: [criarEmbed({ titulo: 'Tempo esgotado', descricao: `${actor.user} não executou ação, perdeu a vez.`, cor: 0xE67E80 })] });
          await sleep(700);
        }
      } catch (e) {
        // timeout
        await battleMsg.edit({ embeds: [criarEmbed({ titulo: 'Tempo esgotado', descricao: `${actor.user} não reagiu a tempo.`, cor: 0xE67E80 })] });
        await sleep(700);
      }

      // spawn pickup chance
      await spawnPickup();

      // remove reactions to keep message clean
      try {
        await battleMsg.reactions.removeAll();
      } catch {}

      // next turn
      turn = 1 - turn;
      round++;

      // update battle status message
      battleMsg = await interaction.editReply({ embeds: [renderBattle()] });
    }

    // determine winner
    const winner = p1.hp > 0 ? p1 : p2;
    const loser = p1.hp > 0 ? p2 : p1;

    // victory animation (few frames)
    const frames = [
      criarEmbed({ titulo: `🏆 ${winner.user.username} venceu!`, descricao: `${shortAvatarField(winner.user)} triunfou sobre ${shortAvatarField(loser.user)}.`, cor: 0xFFD166 }),
      criarEmbed({ titulo: `✨ Fraude Concluída`, descricao: `${winner.user} é o vencedor!`, cor: 0x88E0EF }),
    ];
    for (const f of frames) {
      try {
        await interaction.editReply({ embeds: [f] });
        // small pause
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 900));
      } catch {}
    }

    return;
  },
};
