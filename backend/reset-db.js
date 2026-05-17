const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deletando duplas...');
  await prisma.dupla.deleteMany();
  console.log('Deletando igrejas...');
  await prisma.igreja.deleteMany();
  console.log('Deletando distritos...');
  await prisma.distrito.deleteMany();
  console.log('Deletando regioes...');
  await prisma.regiao.deleteMany();
  console.log('Limpeza concluída!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
