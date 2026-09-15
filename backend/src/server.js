// Servidor principal — Duplas Missionárias — Associação Paulistana
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const regiaoRoutes = require('./routes/regioes');
const distritoRoutes = require('./routes/distritos');
const duplaRoutes = require('./routes/duplas');
const relatorioRoutes = require('./routes/relatorios');
const usuarioRoutes = require('./routes/usuarios');
const igrejaRoutes = require('./routes/igrejas');
const estudosBiblicosRoutes = require('./routes/estudosBiblicos');
const evangelismosRoutes = require('./routes/evangelismos');
const acompanhamentosRoutes = require('./routes/acompanhamentos');
const escolaSabatinaRoutes = require('./routes/escolaSabatina');
const mapaIgrejaRoutes = require('./routes/mapaIgreja');
const configuracaoRoutes = require('./routes/configuracoes');
const interessadosNovoTempoRoutes = require('./routes/interessadosNovoTempo');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use((req, res, next) => {
  const host = req.get('host') || '';
  const forwardedProto = req.get('x-forwarded-proto');
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const isSecureRequest = req.secure || forwardedProto === 'https';

  if (isProduction && !isLocalhost && !isSecureRequest) {
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }

  if (isProduction && isSecureRequest) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return next();
});

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://pcmpaulistana.com.br', 
    'https://pcmpaulistana.com.br', 
    'http://www.pcmpaulistana.com.br', 
    'https://www.pcmpaulistana.com.br'
  ],
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json({ limit: '50mb' }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/regioes', regiaoRoutes);
app.use('/api/distritos', distritoRoutes);
app.use('/api/igrejas', igrejaRoutes);
app.use('/api/duplas', duplaRoutes);
app.use('/api/estudos-biblicos', estudosBiblicosRoutes);
app.use('/api/evangelismos', evangelismosRoutes);
app.use('/api/acompanhamentos', acompanhamentosRoutes);
app.use('/api/escola-sabatina', escolaSabatinaRoutes);
app.use('/api/mapa-igreja', mapaIgrejaRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/interessados-nt', interessadosNovoTempoRoutes);

const publicDir = path.join(__dirname, '..', 'public');
const indexHtml = path.join(publicDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(indexHtml);
  });
}

const prisma = require('./lib/prisma');

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sistema: 'Duplas Missionárias — Associação Paulistana' });
});

// Rota pública de estatísticas
app.get('/api/public/estatisticas', async (req, res) => {
  try {
    const whereEstudoEmAndamento = {
      encerrado: false,
      statusEstudo: 'EM_ANDAMENTO',
    };
    const [regioes, distritos, duplas, pontosEstudo, classesBiblicas, estudosIndividuais, estudantesPontos, estudantesClasses] = await Promise.all([
      prisma.regiao.count(),
      prisma.distrito.count(),
      prisma.dupla.count(),
      prisma.estudoBiblico.count({ where: { ...whereEstudoEmAndamento, tipoEstudo: 'PONTO' } }),
      prisma.estudoBiblico.count({ where: { ...whereEstudoEmAndamento, tipoEstudo: 'CLASSE' } }),
      prisma.estudoBiblico.count({ where: { ...whereEstudoEmAndamento, tipoEstudo: 'UNICO' } }),
      prisma.participante.count({ where: { estudo: { ...whereEstudoEmAndamento, tipoEstudo: 'PONTO' } } }),
      prisma.participante.count({ where: { estudo: { ...whereEstudoEmAndamento, tipoEstudo: 'CLASSE' } } }),
    ]);
    const classes = pontosEstudo + classesBiblicas;
    const estudantes = estudosIndividuais + estudantesPontos + estudantesClasses;
    res.json({
      regioes,
      distritos,
      duplas,
      classes,
      pontosEstudo,
      classesBiblicas,
      estudantes,
      estudosIndividuais,
      estudantesPontos,
      estudantesClasses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar estatísticas' });
  }
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`✝️  Servidor rodando na porta ${PORT}`);
  console.log(`📖  API: http://localhost:${PORT}/api`);
});
