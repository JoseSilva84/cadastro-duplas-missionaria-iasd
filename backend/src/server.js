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

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sistema: 'Duplas Missionárias — Associação Paulistana' });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`✝️  Servidor rodando na porta ${PORT}`);
  console.log(`📖  API: http://localhost:${PORT}/api`);
});
