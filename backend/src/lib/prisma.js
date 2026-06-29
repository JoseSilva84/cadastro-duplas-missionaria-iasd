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

const isConnectionError = (error) => (
  error.message?.includes('terminating connection')
  || error.message?.includes('Connection terminated')
  || error.message?.includes("Can't reach database server")
  || ['E57P01', 'P1001', 'P1008', 'P1017'].includes(error.code)
);

// Middleware para reconectar em caso de conexao perdida
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    if (isConnectionError(error)) {
      console.log('Reconectando ao banco de dados...');
      await prisma.$disconnect();
      await prisma.$connect();
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

// Inicia a conexao
connectWithRetry().catch(console.error);

module.exports = prisma;
