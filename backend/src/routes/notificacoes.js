const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, apenasAdmins, autorizar } = require('../middlewares/auth');
const { criarNotificacoes, configuracaoPublica, urlInterna } = require('../services/notificacoes.service');
const { PERFIS_PUBLICADORES, escopoDoAutor, filtroDestinatarios, publicar } = require('../services/publicacoesNotificacoes.service');

const router = express.Router();
router.use(autenticar);
const responder = (res, erro) => {
  console.error('Notificações:', erro);
  return res.status(500).json({ erro: 'Não foi possível concluir a operação de notificações.' });
};

router.get('/', async (req, res) => {
  try {
    const pagina = Math.max(1, Math.min(10000, Number(req.query.pagina) || 1));
    const limite = 20;
    const where = { usuarioId: req.usuario.id };
    const [itens, naoLidas, total] = await Promise.all([
      prisma.notificacao.findMany({ where, orderBy: { criadaEm: 'desc' }, skip: (pagina - 1) * limite, take: limite }),
      prisma.notificacao.count({ where: { ...where, lidaEm: null } }),
      prisma.notificacao.count({ where }),
    ]);
    return res.json({ itens, naoLidas, total, pagina, paginas: Math.ceil(total / limite) });
  } catch (erro) { return responder(res, erro); }
});

router.patch('/lidas', async (req, res) => {
  try {
    await prisma.notificacao.updateMany({ where: { usuarioId: req.usuario.id, lidaEm: null }, data: { lidaEm: new Date() } });
    return res.status(204).end();
  } catch (erro) { return responder(res, erro); }
});

router.patch('/:id/lida', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'Notificação inválida.' });
  try {
    const atualizada = await prisma.notificacao.updateMany({ where: { id, usuarioId: req.usuario.id, lidaEm: null }, data: { lidaEm: new Date() } });
    return res.json({ atualizada: atualizada.count > 0 });
  } catch (erro) { return responder(res, erro); }
});

router.get('/push/config', (req, res) => res.json(configuracaoPublica()));

router.post('/push/inscricoes', async (req, res) => {
  if (!configuracaoPublica().disponivel) return res.status(503).json({ erro: 'Web Push ainda não foi configurado no servidor.' });
  const { endpoint, keys } = req.body || {};
  if (typeof endpoint !== 'string' || endpoint.length > 2048 || !endpoint.startsWith('https://') ||
    typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string' ||
    keys.p256dh.length > 512 || keys.auth.length > 512) {
    return res.status(400).json({ erro: 'Inscrição push inválida.' });
  }
  try {
    const inscricao = await prisma.inscricaoPush.upsert({
      where: { endpoint },
      create: { usuarioId: req.usuario.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { usuarioId: req.usuario.id, p256dh: keys.p256dh, auth: keys.auth },
    });
    return res.status(201).json({ id: inscricao.id });
  } catch (erro) { return responder(res, erro); }
});

router.delete('/push/inscricoes', async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== 'string') return res.status(400).json({ erro: 'Endpoint inválido.' });
  try {
    await prisma.inscricaoPush.deleteMany({ where: { endpoint, usuarioId: req.usuario.id } });
    return res.status(204).end();
  } catch (erro) { return responder(res, erro); }
});

const apenasPublicadores = autorizar(...PERFIS_PUBLICADORES);

router.get('/publicacoes', apenasPublicadores, async (req, res) => {
  try {
    const escopo = escopoDoAutor(req.usuario);
    if (!escopo) return res.status(403).json({ erro: 'Seu usuário precisa estar vinculado a uma região ou distrito para publicar.' });
    const [itens, destinatarios] = await Promise.all([
      prisma.publicacaoNotificacao.findMany({
        where: { autorId: req.usuario.id },
        orderBy: { criadaEm: 'desc' }, take: 30,
        select: { id: true, titulo: true, mensagem: true, tipo: true, escopo: true, agendadaPara: true, publicadaEm: true, status: true, quantidadeDestinatarios: true, erro: true, criadaEm: true },
      }),
      prisma.usuario.count({ where: filtroDestinatarios(escopo) }),
    ]);
    return res.json({ itens, escopo: escopo.escopo, destinatarios });
  } catch (erro) { return responder(res, erro); }
});

router.post('/publicacoes', apenasPublicadores, async (req, res) => {
  const { titulo, mensagem, url, agendadaPara, tipo } = req.body || {};
  const escopo = escopoDoAutor(req.usuario);
  if (!escopo) return res.status(403).json({ erro: 'Seu usuário precisa estar vinculado a uma região ou distrito para publicar.' });
  const tituloLimpo = typeof titulo === 'string' ? titulo.trim() : '';
  const mensagemLimpa = typeof mensagem === 'string' ? mensagem.trim() : '';
  if (!tituloLimpo || tituloLimpo.length > 160 || !mensagemLimpa || mensagemLimpa.length > 1000 ||
      (url && !urlInterna(url)) || !['COMUNICADO', 'NOVIDADE'].includes(tipo || 'COMUNICADO') ||
      (tipo === 'NOVIDADE' && req.usuario.perfil !== 'SUPER_ADMIN')) {
    return res.status(400).json({ erro: 'Confira o título, a mensagem e o link da notificação.' });
  }
  const agora = new Date();
  const data = agendadaPara ? new Date(agendadaPara) : agora;
  if (Number.isNaN(data.getTime()) || (agendadaPara && (data <= agora || data.getTime() > agora.getTime() + 366 * 86_400_000))) {
    return res.status(400).json({ erro: 'Escolha uma data futura dentro dos próximos 12 meses.' });
  }
  try {
    const item = await prisma.publicacaoNotificacao.create({
      data: {
        autorId: req.usuario.id, titulo: tituloLimpo, mensagem: mensagemLimpa,
        url: url || null, tipo: tipo || 'COMUNICADO', ...escopo, agendadaPara: data,
      },
    });
    if (!agendadaPara) await publicar(item.id);
    const atual = await prisma.publicacaoNotificacao.findUnique({ where: { id: item.id } });
    return res.status(201).json({ item: atual });
  } catch (erro) { return responder(res, erro); }
});

router.delete('/publicacoes/:id', apenasPublicadores, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'Publicação inválida.' });
  try {
    const cancelada = await prisma.publicacaoNotificacao.updateMany({
      where: { id, autorId: req.usuario.id, status: 'AGENDADA' },
      data: { status: 'CANCELADA' },
    });
    if (!cancelada.count) return res.status(404).json({ erro: 'Publicação não encontrada ou já iniciada.' });
    return res.status(204).end();
  } catch (erro) { return responder(res, erro); }
});

router.post('/enviar', apenasAdmins, async (req, res) => {
  const { usuarioIds, titulo, mensagem, url } = req.body || {};
  if (!Array.isArray(usuarioIds) || usuarioIds.length > 500 || !usuarioIds.length ||
    !usuarioIds.every((id) => Number.isInteger(Number(id)) && Number(id) > 0) ||
    typeof titulo !== 'string' || !titulo.trim() || titulo.length > 160 ||
    typeof mensagem !== 'string' || !mensagem.trim() || mensagem.length > 1000 ||
    (url && !urlInterna(url))) return res.status(400).json({ erro: 'Dados da notificação inválidos.' });
  try {
    const usuarios = await prisma.usuario.findMany({ where: { id: { in: usuarioIds.map(Number) }, ativo: true }, select: { id: true } });
    const criadas = await criarNotificacoes(usuarios.map((item) => item.id), { titulo, mensagem, url });
    return res.status(201).json({ enviadas: criadas.length });
  } catch (erro) { return responder(res, erro); }
});

module.exports = router;
