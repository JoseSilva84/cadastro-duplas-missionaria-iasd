const prisma = require('../lib/prisma');
const { criarNotificacoes } = require('./notificacoes.service');

function filtroLiderancas({ regiaoId, distritoId, igrejaId }) {
  const alcances = [{ perfil: { in: ['SUPER_ADMIN', 'ADMINISTRADOR'] } }];
  if (regiaoId) alcances.push({ perfil: { in: ['PASTOR_REGIONAL', 'COORDENADOR_REGIONAL'] }, regiaoId: Number(regiaoId) });
  if (distritoId) alcances.push({ perfil: 'PASTOR_DISTRITAL', distritoId: Number(distritoId) });
  if (igrejaId) alcances.push({ perfil: 'DIRETOR_MISSIONARIO_IGREJA', igrejaId: Number(igrejaId) });
  return { ativo: true, OR: alcances };
}

async function resolverLocal({ duplaId, igrejaId, distritoId, regiaoId }) {
  if (duplaId) {
    const dupla = await prisma.dupla.findUnique({
      where: { id: Number(duplaId) },
      select: {
        igrejaId: true, distritoId: true, igreja: { select: { nome: true } },
        distrito: { select: { nome: true, regiaoId: true, regiao: { select: { nome: true } } } },
      },
    });
    if (dupla) return {
      igrejaId: dupla.igrejaId, distritoId: dupla.distritoId, regiaoId: dupla.distrito.regiaoId,
      igrejaNome: dupla.igreja?.nome, distritoNome: dupla.distrito.nome, regiaoNome: dupla.distrito.regiao.nome,
    };
  }
  if (igrejaId) {
    const igreja = await prisma.igreja.findUnique({
      where: { id: Number(igrejaId) },
      select: { id: true, nome: true, distritoId: true, distrito: { select: { nome: true, regiaoId: true, regiao: { select: { nome: true } } } } },
    });
    if (igreja) return {
      igrejaId: igreja.id, distritoId: igreja.distritoId, regiaoId: igreja.distrito.regiaoId,
      igrejaNome: igreja.nome, distritoNome: igreja.distrito.nome, regiaoNome: igreja.distrito.regiao.nome,
    };
  }
  if (distritoId) {
    const distrito = await prisma.distrito.findUnique({ where: { id: Number(distritoId) }, select: { nome: true, regiaoId: true, regiao: { select: { nome: true } } } });
    if (distrito) return {
      igrejaId: null, distritoId: Number(distritoId), regiaoId: distrito.regiaoId,
      distritoNome: distrito.nome, regiaoNome: distrito.regiao.nome,
    };
  }
  if (regiaoId) {
    const regiao = await prisma.regiao.findUnique({ where: { id: Number(regiaoId) }, select: { nome: true } });
    return { igrejaId: null, distritoId: null, regiaoId: Number(regiaoId), regiaoNome: regiao?.nome };
  }
  return { igrejaId: null, distritoId: null, regiaoId: null };
}

async function notificarAtividade({ ator, duplaId, igrejaId, distritoId, regiaoId, titulo, mensagem, url }) {
  const local = await resolverLocal({ duplaId, igrejaId, distritoId, regiaoId });
  const usuarios = await prisma.usuario.findMany({ where: filtroLiderancas(local), select: { id: true } });
  const lugar = [local.igrejaNome && `Igreja ${local.igrejaNome}`, local.distritoNome && `Distrito ${local.distritoNome}`, local.regiaoNome && `Região ${local.regiaoNome}`]
    .filter(Boolean).join(' · ');
  const autoria = ator?.nome ? ` · Registrado por ${ator.nome}` : '';
  return criarNotificacoes(usuarios.map((usuario) => usuario.id), {
    titulo,
    mensagem: `${mensagem}${lugar ? ` · ${lugar}` : ''}${autoria}`.slice(0, 1000),
    tipo: 'ATIVIDADE',
    url,
  });
}

// A ação principal permanece salva mesmo se o canal de notificações estiver indisponível.
async function registrarAtividade(evento) {
  try {
    return await notificarAtividade(evento);
  } catch (erro) {
    console.error('Falha ao registrar notificação de atividade:', erro);
    return [];
  }
}

module.exports = { filtroLiderancas, resolverLocal, notificarAtividade, registrarAtividade };
