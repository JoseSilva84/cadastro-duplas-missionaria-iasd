const prisma = require('../lib/prisma');
const { criarNotificacoes } = require('./notificacoes.service');

const PERFIS_GLOBAIS = ['SUPER_ADMIN', 'ADMINISTRADOR'];
const PERFIS_REGIONAIS = ['PASTOR_REGIONAL', 'COORDENADOR_REGIONAL'];
const PERFIS_PUBLICADORES = [...PERFIS_GLOBAIS, ...PERFIS_REGIONAIS, 'PASTOR_DISTRITAL'];
let verificando = false;

function escopoDoAutor(usuario) {
  if (PERFIS_GLOBAIS.includes(usuario.perfil)) return { escopo: 'TODOS', regiaoId: null, distritoId: null };
  if (PERFIS_REGIONAIS.includes(usuario.perfil) && usuario.regiaoId) {
    return { escopo: 'REGIAO', regiaoId: usuario.regiaoId, distritoId: null };
  }
  if (usuario.perfil === 'PASTOR_DISTRITAL' && usuario.distritoId) {
    return { escopo: 'DISTRITO', regiaoId: null, distritoId: usuario.distritoId };
  }
  return null;
}

function filtroDestinatarios(publicacao) {
  const base = { ativo: true };
  if (publicacao.escopo === 'TODOS') return base;
  if (publicacao.escopo === 'REGIAO' && publicacao.regiaoId) {
    const id = publicacao.regiaoId;
    return { ...base, OR: [
      { regiaoId: id },
      { distrito: { is: { regiaoId: id } } },
      { igreja: { is: { distrito: { is: { regiaoId: id } } } } },
      { dupla: { is: { distrito: { is: { regiaoId: id } } } } },
    ] };
  }
  if (publicacao.escopo === 'DISTRITO' && publicacao.distritoId) {
    const id = publicacao.distritoId;
    return { ...base, OR: [
      { distritoId: id },
      { igreja: { is: { distritoId: id } } },
      { dupla: { is: { distritoId: id } } },
    ] };
  }
  throw new Error('Publicação sem abrangência válida.');
}

async function publicar(id) {
  const agora = new Date();
  const reserva = await prisma.publicacaoNotificacao.updateMany({
    where: { id, OR: [
      { status: 'AGENDADA', agendadaPara: { lte: agora }, OR: [{ proximaTentativaEm: null }, { proximaTentativaEm: { lte: agora } }] },
      { status: 'PROCESSANDO', bloqueioAte: { lte: agora } },
    ] },
    data: { status: 'PROCESSANDO', bloqueioAte: new Date(agora.getTime() + 5 * 60_000), tentativas: { increment: 1 } },
  });
  if (!reserva.count) return false;

  try {
    const publicacao = await prisma.publicacaoNotificacao.findUniqueOrThrow({ where: { id } });
    const filtro = filtroDestinatarios(publicacao);
    let ultimoId = 0;
    while (true) {
      const usuarios = await prisma.usuario.findMany({
        where: { ...filtro, id: { gt: ultimoId } },
        select: { id: true }, orderBy: { id: 'asc' }, take: 200,
      });
      if (!usuarios.length) break;
      await criarNotificacoes(usuarios.map((item) => item.id), {
        titulo: publicacao.titulo, mensagem: publicacao.mensagem,
        url: publicacao.url, tipo: publicacao.tipo, publicacaoId: id,
      });
      ultimoId = usuarios[usuarios.length - 1].id;
      await prisma.publicacaoNotificacao.update({
        where: { id }, data: { bloqueioAte: new Date(Date.now() + 5 * 60_000) },
      });
    }
    const quantidadeDestinatarios = await prisma.notificacao.count({ where: { publicacaoId: id } });
    await prisma.publicacaoNotificacao.update({
      where: { id },
      data: { status: 'PUBLICADA', publicadaEm: new Date(), quantidadeDestinatarios, bloqueioAte: null, erro: null },
    });
    return true;
  } catch (erro) {
    console.error(`Falha ao publicar notificação ${id}:`, erro);
    const atual = await prisma.publicacaoNotificacao.findUnique({ where: { id }, select: { tentativas: true } });
    await prisma.publicacaoNotificacao.update({
      where: { id },
      data: {
        status: (atual?.tentativas || 3) >= 3 ? 'ERRO' : 'AGENDADA',
        proximaTentativaEm: new Date(Date.now() + 60_000),
        bloqueioAte: null,
        erro: String(erro.message || erro).slice(0, 500),
      },
    });
    return false;
  }
}

async function verificarAgendadas() {
  if (verificando) return;
  verificando = true;
  try {
    const agora = new Date();
    const pendentes = await prisma.publicacaoNotificacao.findMany({
      where: { OR: [
        { status: 'AGENDADA', agendadaPara: { lte: agora }, OR: [{ proximaTentativaEm: null }, { proximaTentativaEm: { lte: agora } }] },
        { status: 'PROCESSANDO', bloqueioAte: { lte: agora } },
      ] },
      select: { id: true }, orderBy: { agendadaPara: 'asc' }, take: 20,
    });
    for (const item of pendentes) await publicar(item.id);
  } catch (erro) {
    console.error('Falha ao verificar publicações agendadas:', erro);
  } finally {
    verificando = false;
  }
}

function iniciarAgendador() {
  void verificarAgendadas();
  const timer = setInterval(() => void verificarAgendadas(), 15_000);
  timer.unref?.();
}

module.exports = { PERFIS_PUBLICADORES, escopoDoAutor, filtroDestinatarios, publicar, iniciarAgendador };
