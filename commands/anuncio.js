const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { criarEmbed, THEME } = require('../utils/theme');
const { obterConfig, TIPOS_ANUNCIO } = require('../utils/servidorStore');

// Rótulos bonitos + emojis para cada tipo de anúncio
const ROTULOS = {
  geral: { titulo: 'Aviso Geral', emoji: '📣', cor: THEME.corPrincipal },
  evento: { titulo: 'Evento Lunar', emoji: '🎉', cor: 0xC9B8F2 },
  regra: { titulo: 'Regra do Servidor', emoji: '📜', cor: 0xA895E0 },
  atualizacao: { titulo: 'Atualização', emoji: '✨', cor: THEME.corRoleta },
  aviso: { titulo: 'Aviso Importante', emoji: '⚠️', cor: 0xE67E80 },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Envia um anúncio classificado no canal configurado para o tipo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((op) =>
      op
        .setName('tipo')
        .setDescription('Tipo de anúncio (define para qual canal vai)')
        .setRequired(true)
        .addChoices(...TIPOS_ANUNCIO.map((t) => ({ name: t, value: t })))
    )
    .addStringOption((op) =>
      op
        .setName('titulo')
        .setDescription('Título do anúncio')
        .setRequired(false)
    )
    .addStringOption((op) =>
      op
        .setName('mensagem')
        .setDescription('Conteúdo do anúncio')
        .setRequired(true)
    )
    .addBooleanOption((op) =>
      op
        .setName('mencionar')
        .setDescription('Mencionar @everyone no anúncio?')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const tipo = interaction.options.getString('tipo');
    const mensagem = interaction.options.getString('mensagem');
    const tituloPersonalizado = interaction.options.getString('titulo');
    const mencionar = interaction.options.getBoolean('mencionar') || false;

    const cfg = obterConfig(guildId);
    const canalId = cfg.anuncios[tipo];

    if (!canalId) {
      const embedErro = criarEmbed({
        titulo: 'Nenhum canal configurado',
        descricao:
          `Não há um canal definido para anúncios do tipo **${tipo}**.\n` +
          `Use \`/configurar anuncio tipo:${tipo} canal:#...\` primeiro.`,
        cor: 0xE67E80,
      });
      return interaction.reply({ embeds: [embedErro], ephemeral: true });
    }

    let canal;
    try {
      canal = await client.channels.fetch(canalId);
    } catch {
      canal = null;
    }

    if (!canal) {
      const embedErro = criarEmbed({
        titulo: 'Canal não encontrado',
        descricao: `O canal salvo para **${tipo}** sumiu ou não tenho acesso a ele.`,
        cor: 0xE67E80,
      });
      return interaction.reply({ embeds: [embedErro], ephemeral: true });
    }

    const rotulo = ROTULOS[tipo] || { titulo: 'Anúncio', emoji: '📢', cor: THEME.corPrincipal };
    const embed = criarEmbed({
      titulo: `${rotulo.emoji} ${tituloPersonalizado || rotulo.titulo}`,
      descricao: mensagem,
      cor: rotulo.cor,
      rodape: `Anunciado por ${interaction.user.username} • ${THEME.nome}`,
    });

    try {
      await canal.send({
        content: mencionar ? '@everyone' : undefined,
        embeds: [embed],
      });
    } catch (erro) {
      const embedErro = criarEmbed({
        titulo: 'Não consegui enviar',
        descricao: `Tentei mandar em <#${canalId}>, mas falhou: ${erro.message}`,
        cor: 0xE67E80,
      });
      return interaction.reply({ embeds: [embedErro], ephemeral: true });
    }

    const embedOk = criarEmbed({
      titulo: 'Anúncio enviado',
      descricao: `Seu anúncio do tipo **${tipo}** foi para ${canal}.`,
      cor: THEME.corSucesso,
    });
    return interaction.reply({ embeds: [embedOk], ephemeral: true });
  },
};