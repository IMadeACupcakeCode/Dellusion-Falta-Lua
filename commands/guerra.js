const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { botao } = require('../utils/ui');

const NAIPES = ['🌑', '🌙', '✨', '💜'];
const VALORES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function carta() {
  const v = VALORES[Math.floor(Math.random() * VALORES.length)];
  const n = Math.floor(Math.random() * NAIPES.length);
  return { v, n, forca: VALORES.indexOf(v) * 4 + n };
}
function nomeCarta(c) {
  return `${NAIPES[c.n]}${c.v}`;
}

module.exports = {
  data: new SlashCommandBuilder().setName('guerra').setDescription('⚔️ Mini guerra de cartas: você vs bot, melhor de 3'),
  async execute(interaction) {
    let voce = 0;
    let bot = 0;
    let rodada = 1;

    const row = new ActionRowBuilder().addComponents(
      botao('⚔️ Próxima rodada', 'guerra_next', ButtonStyle.Primary, '⚔️')
    );

    function render() {
      return criarEmbed({
        titulo: '⚔️ Guerra de Cartas',
        descricao: `Placar — **Você:** ${voce}  •  **Bot:** ${bot}\nRodada ${rodada}/3`,
        cor: THEME.corPrincipal,
        rodape: `Desafiante: ${interaction.user.username}`,
      });
    }

    const resposta = await interaction.reply({ embeds: [render()], components: [row], fetchReply: true });

    const coletor = resposta.createMessageComponentCollector({ time: 120000, filter: () => true });
    coletor.on('collect', async (i) => {
      if (rodada > 3) return;
      const c1 = carta();
      const c2 = carta();
      let linha;
      if (c1.forca > c2.forca) {
        voce++;
        linha = `Você: ${nomeCarta(c1)}  vs  Bot: ${nomeCarta(c2)}\n**Você venceu esta rodada!** ⚔️`;
      } else if (c2.forca > c1.forca) {
        bot++;
        linha = `Você: ${nomeCarta(c1)}  vs  Bot: ${nomeCarta(c2)}\n**O bot venceu esta rodada.** 🌑`;
      } else {
        linha = `Você: ${nomeCarta(c1)}  vs  Bot: ${nomeCarta(c2)}\n**Empate!** 🌙`;
      }
      const embed = render();
      embed.addFields({ name: `Rodada ${rodada}`, value: linha, inline: false });
      rodada++;
      if (rodada > 3) {
        const vencedor = voce > bot ? '🌟 Você venceu a guerra!' : bot > voce ? '🌑 O bot venceu a guerra.' : '🌙 Empate na guerra!';
        embed.addFields({ name: '🏆 Resultado final', value: `${vencedor}\nPlacar: Você ${voce} × ${bot} Bot`, inline: false });
        await i.update({ embeds: [embed], components: [] });
        coletor.stop();
        return;
      }
      await i.update({ embeds: [embed], components: [row] });
    });
    coletor.on('end', async () => {
      try {
        await resposta.edit({ components: [] });
      } catch {}
    });
  },
};