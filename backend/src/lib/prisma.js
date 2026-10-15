// Instancia global do Prisma Client
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  // Configuracao para reconexao automatica em bancos serverless (Neon)
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
let reconexaoEmCurso = null;

const isConnectionError = (error) => (
  error.message?.includes('terminating connection')
  || error.message?.includes('Connection terminated')
  || error.message?.includes("Can't reach database server")
  || ['E57P01', 'P1001', 'P1008', 'P1017'].includes(error.code)
);

const reconectarUmaVez = async () => {
  if (!reconexaoEmCurso) {
    reconexaoEmCurso = (async () => {
      console.log('Reconectando ao banco de dados...');
      await prisma.$disconnect().catch(() => {});
      await prisma.$connect();
    })().finally(() => {
      reconexaoEmCurso = null;
    });
  }
  return reconexaoEmCurso;
};

// Middleware para reconectar em caso de conexao perdida. Todas as consultas
// compartilham a mesma tentativa, evitando uma tempestade de reconexoes.
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    if (isConnectionError(error)) {
      await reconectarUmaVez();
      return await next(params);
    }
    throw error;
  }
});

// Conexao inicial com retry
async function connectWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('Conectado ao banco de dados (Neon)');
      return;
    } catch (error) {
      console.log(`Tentativa ${i + 1}/${retries} falhou. Tentando novamente em ${delay}ms...`);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// O servidor aguarda esta etapa antes de abrir a porta HTTP.
prisma.connectWithRetry = connectWithRetry;

module.exports = prisma;
