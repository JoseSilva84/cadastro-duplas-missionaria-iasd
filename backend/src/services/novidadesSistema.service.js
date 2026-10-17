const prisma = require('../lib/prisma');
const { publicar } = require('./publicacoesNotificacoes.service');

// Registre aqui cada nova ferramenta ou mudança importante lançada no sistema.
// A chave única no banco publica o aviso uma vez, inclusive com várias instâncias.
const NOVIDADES = [
  {
    chave: 'publicar-notificacoes-v1',
    titulo: 'Nova ferramenta: publicar notificações',
    mensagem: 'As lideranças agora podem publicar comunicados imediatamente ou agendá-los para sua abrangência. Acesse Publicar notificação no menu.',
    url: '/dashboard',
  },
];

async function anunciarNovidadesSistema() {
  for (const novidade of NOVIDADES) {
    try {
      const publicacao = await prisma.$transaction(async (tx) => {
        await tx.cacheIntegracao.create({
          data: { chave: `novidade-sistema:${novidade.chave}`, dados: { titulo: novidade.titulo } },
        });
        return tx.publicacaoNotificacao.create({
          data: {
            titulo: novidade.titulo, mensagem: novidade.mensagem, url: novidade.url,
            tipo: 'NOVIDADE', escopo: 'TODOS', agendadaPara: new Date(),
          },
        });
      });
      await publicar(publicacao.id);
    } catch (erro) {
      if (erro.code !== 'P2002') console.error(`Falha ao anunciar novidade ${novidade.chave}:`, erro);
    }
  }
}

module.exports = { anunciarNovidadesSistema };
