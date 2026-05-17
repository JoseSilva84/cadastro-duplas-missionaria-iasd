// Servidor principal — Duplas Missionárias — Associação Paulistana
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const regiaoRoutes = require('./routes/regioes');
const distritoRoutes = require('./routes/distritos');
const duplaRoutes = require('./routes/duplas');
const relatorioRoutes = require('./routes/relatorios');
const usuarioRoutes = require('./routes/usuarios');
const igrejaRoutes = require('./routes/igrejas');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/regioes', regiaoRoutes);
app.use('/api/distritos', distritoRoutes);
app.use('/api/igrejas', igrejaRoutes);
app.use('/api/duplas', duplaRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/usuarios', usuarioRoutes);

const prisma = require('./lib/prisma');

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sistema: 'Duplas Missionárias — Associação Paulistana' });
});

// Rota pública de estatísticas
app.get('/api/public/estatisticas', async (req, res) => {
  try {
    const [regioes, distritos, duplas] = await Promise.all([
      prisma.regiao.count(),
      prisma.distrito.count(),
      prisma.dupla.count(),
    ]);
    res.json({ regioes, distritos, duplas });
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
