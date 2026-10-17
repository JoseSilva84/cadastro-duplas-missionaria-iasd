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

async function criarNotificacoes(usuarioIds, { titulo, mensagem, tipo = 'INFO', url = null }) {
  const ids = [...new Set(usuarioIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return [];
  const textoTitulo = String(titulo || '').trim().slice(0, 160);
  const textoMensagem = String(mensagem || '').trim().slice(0, 1000);
  if (!textoTitulo || !textoMensagem) throw new Error('Notificação exige título e mensagem.');
  const destino = urlInterna(url);
  const criadas = [];
  for (let inicio = 0; inicio < ids.length; inicio += 200) {
    const lote = ids.slice(inicio, inicio + 200);
    criadas.push(...await prisma.$transaction(lote.map((usuarioId) => prisma.notificacao.create({
      data: { usuarioId, titulo: textoTitulo, mensagem: textoMensagem, tipo, url: destino },
    }))));
  }
  for (const notificacao of criadas) {
    io?.to(`usuario:${notificacao.usuarioId}`).emit('notificacao:nova', notificacao);
  }
  if (chavePublica) {
    const inscricoes = await prisma.inscricaoPush.findMany({ where: { usuarioId: { in: ids } } });
    void Promise.allSettled(inscricoes.map(async (inscricao) => {
      const notificacao = criadas.find((item) => item.usuarioId === inscricao.usuarioId);
      try {
        await webpush.sendNotification({
          endpoint: inscricao.endpoint,
          keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
        }, JSON.stringify({ title: textoTitulo, body: textoMensagem, url: destino || '/dashboard', tag: `pcm-${notificacao.id}` }), {
          TTL: 60 * 60 * 24,
        });
      } catch (erro) {
        if ([404, 410].includes(erro.statusCode)) {
          await prisma.inscricaoPush.deleteMany({ where: { id: inscricao.id } });
        } else {
          console.error('Falha ao enviar Web Push:', erro.statusCode || erro.message);
        }
      }
    }));
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
  return criarNotificacoes(destinatarios.map((item) => item.id), { titulo, mensagem, tipo: 'CALENDARIO', url });
}

module.exports = { criarNotificacoes, avisarNovoItemCalendario, definirSocket, urlInterna, inicializarPush, configuracaoPublica };
