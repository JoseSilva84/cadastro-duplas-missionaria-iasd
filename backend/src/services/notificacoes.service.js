const webpush = require('web-push');
const prisma = require('../lib/prisma');

let io = null;
let chavePublica = null;

async function inicializarPush() {
  let config;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    config = {
      chavePublica: process.env.VAPID_PUBLIC_KEY,
      chavePrivada: process.env.VAPID_PRIVATE_KEY,
      assunto: process.env.VAPID_SUBJECT,
    };
  } else {
    const chaves = webpush.generateVAPIDKeys();
    config = await prisma.configuracaoPush.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        chavePublica: chaves.publicKey,
        chavePrivada: chaves.privateKey,
        assunto: 'https://pcmpaulistana.com.br',
      },
      update: {},
    });
  }
  webpush.setVapidDetails(config.assunto, config.chavePublica, config.chavePrivada);
  chavePublica = config.chavePublica;
}

const configuracaoPublica = () => ({ disponivel: Boolean(chavePublica), chavePublica });

const urlInterna = (valor) => {
  if (typeof valor !== 'string' || !valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return null;
  return valor;
};

function definirSocket(servidorSocket) { io = servidorSocket; }

const mensagemPush = (erro) => String(erro?.body || erro?.message || 'Falha desconhecida no serviço de Push').slice(0, 300);

async function entregarPush(inscricao, payload, { urgencia = 'normal' } = {}) {
  try {
    const resposta = await webpush.sendNotification({
      endpoint: inscricao.endpoint,
      keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
    }, JSON.stringify(payload), {
      TTL: 60 * 60 * 24,
      urgency: urgencia,
    });
    return { id: inscricao.id, sucesso: true, status: Number(resposta?.statusCode) || 201 };
  } catch (erro) {
    return {
      id: inscricao.id,
      sucesso: false,
      status: Number(erro?.statusCode) || 0,
      erro: mensagemPush(erro),
    };
  }
}

async function registrarResultadosPush(resultados) {
  if (!resultados.length) return;
  const agora = new Date();
  const sucessos = resultados.filter((item) => item.sucesso).map((item) => item.id);
  const gruposFalha = new Map();
  resultados.filter((item) => !item.sucesso).forEach((item) => {
    const chave = `${item.status}|${item.erro}`;
    if (!gruposFalha.has(chave)) gruposFalha.set(chave, []);
    gruposFalha.get(chave).push(item.id);
  });
  const operacoes = [];
  if (sucessos.length) {
    operacoes.push(prisma.inscricaoPush.updateMany({
      where: { id: { in: sucessos } },
      data: { ativa: true, ultimoStatus: 201, ultimoErro: null, ultimoSucessoEm: agora },
    }));
  }
  gruposFalha.forEach((ids, chave) => {
    const separador = chave.indexOf('|');
    const status = Number(chave.slice(0, separador)) || 0;
    const erro = chave.slice(separador + 1);
    operacoes.push(prisma.inscricaoPush.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(status === 404 || status === 410 ? { ativa: false } : {}),
        ultimoStatus: status,
        ultimoErro: erro,
        ultimaFalhaEm: agora,
      },
    }));
  });
  await Promise.all(operacoes);
}

async function enviarPushEmSegundoPlano(inscricoes, notificacoesPorUsuario, contagens, dados) {
  const resultados = await Promise.all(inscricoes.map((inscricao) => {
    const notificacao = notificacoesPorUsuario.get(inscricao.usuarioId);
    return entregarPush(inscricao, {
      title: dados.titulo,
      body: dados.mensagem,
      url: dados.url,
      tag: `pcm-${notificacao.id}`,
      unreadCount: contagens.get(inscricao.usuarioId) || 1,
    });
  }));
  await registrarResultadosPush(resultados);
  resultados.filter((item) => !item.sucesso && ![404, 410].includes(item.status))
    .forEach((item) => console.error('Falha ao enviar Web Push:', item.status || item.erro));
}

async function testarInscricaoPush(usuarioId, inscricaoId) {
  if (!chavePublica) throw { status: 503, mensagem: 'Web Push ainda não foi configurado no servidor.' };
  const inscricao = await prisma.inscricaoPush.findFirst({
    where: { id: Number(inscricaoId), usuarioId: Number(usuarioId) },
  });
  if (!inscricao) throw { status: 404, mensagem: 'Dispositivo não encontrado.' };
  const naoLidas = await prisma.notificacao.count({ where: { usuarioId: Number(usuarioId), lidaEm: null } });
  const resultado = await entregarPush(inscricao, {
    title: 'Teste de notificação do PCM',
    body: 'Este aparelho está recebendo as notificações remotas corretamente.',
    url: '/configuracoes',
    tag: `pcm-teste-${Date.now()}`,
    unreadCount: naoLidas,
  }, { urgencia: 'high' });
  await registrarResultadosPush([resultado]);
  if (!resultado.sucesso) {
    throw { status: 502, mensagem: `O serviço de Push recusou o teste (${resultado.status || 'sem status'}).` };
  }
  return { sucesso: true, status: resultado.status, enviadoEm: new Date() };
}

async function criarNotificacoes(usuarioIds, {
  titulo, mensagem, tipo = 'INFO', url = null, publicacaoId = null,
  remetenteUsuarioId = null, notificacaoOrigemId = null,
}) {
  const ids = [...new Set(usuarioIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return [];
  const textoTitulo = String(titulo || '').trim().slice(0, 160);
  const textoMensagem = String(mensagem || '').trim().slice(0, 1000);
  if (!textoTitulo || !textoMensagem) throw new Error('Notificação exige título e mensagem.');
  const destino = urlInterna(url);
  const remetenteId = Number(remetenteUsuarioId);
  const origemId = Number(notificacaoOrigemId);
  const vinculos = {
    remetenteUsuarioId: Number.isInteger(remetenteId) && remetenteId > 0 ? remetenteId : null,
    notificacaoOrigemId: Number.isInteger(origemId) && origemId > 0 ? origemId : null,
  };
  const criadas = [];
  for (let inicio = 0; inicio < ids.length; inicio += 200) {
    const lote = ids.slice(inicio, inicio + 200);
    if (publicacaoId) {
      // A chave única impede duplicatas se o servidor reiniciar durante um envio agendado.
      criadas.push(...await prisma.notificacao.createManyAndReturn({
        data: lote.map((usuarioId) => ({ usuarioId, titulo: textoTitulo, mensagem: textoMensagem, tipo, url: destino, publicacaoId, ...vinculos })),
        skipDuplicates: true,
      }));
    } else {
      criadas.push(...await prisma.$transaction(lote.map((usuarioId) => prisma.notificacao.create({
        data: { usuarioId, titulo: textoTitulo, mensagem: textoMensagem, tipo, url: destino, ...vinculos },
      }))));
    }
  }
  for (const notificacao of criadas) {
    io?.to(`usuario:${notificacao.usuarioId}`).emit('notificacao:nova', notificacao);
  }
  if (chavePublica) {
    const criadasPorUsuario = new Map(criadas.map((item) => [item.usuarioId, item]));
    const usuariosComNotificacao = [...criadasPorUsuario.keys()];
    const inscricoes = await prisma.inscricaoPush.findMany({
      where: { usuarioId: { in: usuariosComNotificacao }, ativa: true },
    });
    if (inscricoes.length) {
      const totais = await prisma.notificacao.groupBy({
        by: ['usuarioId'],
        where: { usuarioId: { in: usuariosComNotificacao }, lidaEm: null },
        _count: { _all: true },
      });
      const contagens = new Map(totais.map((item) => [item.usuarioId, item._count._all]));
      void enviarPushEmSegundoPlano(inscricoes, criadasPorUsuario, contagens, {
        titulo: textoTitulo,
        mensagem: textoMensagem,
        url: destino || '/dashboard',
      }).catch((erro) => console.error('Falha no processamento de Web Push:', erro.message));
    }
  }
  return criadas;
}

async function avisarNovoItemCalendario(usuario, { titulo, mensagem, url, alvo = {} }) {
  const local = [];
  if (alvo.igrejaId) {
    local.push({ igrejaId: alvo.igrejaId }, { dupla: { is: { igrejaId: alvo.igrejaId } } });
    local.push({ perfil: { in: ['PASTOR_REGIONAL', 'COORDENADOR_REGIONAL'] }, regiaoId: alvo.regiaoId });
    local.push({ perfil: 'PASTOR_DISTRITAL', distritoId: alvo.distritoId });
  } else if (alvo.distritoId) {
    local.push({ distritoId: alvo.distritoId }, { igreja: { is: { distritoId: alvo.distritoId } } }, { dupla: { is: { distritoId: alvo.distritoId } } });
    local.push({ perfil: { in: ['PASTOR_REGIONAL', 'COORDENADOR_REGIONAL'] }, regiaoId: alvo.regiaoId });
  } else if (alvo.regiaoId) {
    local.push({ regiaoId: alvo.regiaoId }, { distrito: { is: { regiaoId: alvo.regiaoId } } });
    local.push({ igreja: { is: { distrito: { is: { regiaoId: alvo.regiaoId } } } } });
    local.push({ dupla: { is: { distrito: { is: { regiaoId: alvo.regiaoId } } } } });
  }
  const destinatarios = await prisma.usuario.findMany({
    where: {
      ativo: true,
      id: { not: usuario.id },
      ...(local.length ? { OR: [{ perfil: { in: ['SUPER_ADMIN', 'ADMINISTRADOR'] } }, ...local] } : {}),
    },
    select: { id: true },
  });
  return criarNotificacoes(destinatarios.map((item) => item.id), {
    titulo, mensagem, tipo: 'CALENDARIO', url, remetenteUsuarioId: usuario.id,
  });
}

module.exports = {
  criarNotificacoes,
  avisarNovoItemCalendario,
  definirSocket,
  urlInterna,
  inicializarPush,
  configuracaoPublica,
  testarInscricaoPush,
};
