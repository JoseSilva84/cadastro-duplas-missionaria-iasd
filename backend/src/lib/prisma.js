// Instância global do Prisma Client
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  // Configuração para reconexão automática em bancos serverless (Neon)
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Middleware para reconectar em caso de conexão perdida
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    // Erro de conexão perdida - tenta reconectar
    if (error.message?.includes('terminating connection') || 
        error.code === 'E57P01' ||
        error.message?.includes('Connection terminated')) {
      console.log('🔄 Reconectando ao banco de dados...');
      await prisma.$disconnect();
      await prisma.$connect();
      // Tenta a operação novamente
      return await next(params);
    }
    throw error;
  }
});

// Conexão inicial com retry
async function connectWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('✅ Conectado ao banco de dados (Neon)');
      return;
    } catch (error) {
      console.log(`⚠️ Tentativa ${i + 1}/${retries} falhou. Tentando novamente em ${delay}ms...`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Inicia a conexão
connectWithRetry().catch(console.error);

module.exports = prisma;
