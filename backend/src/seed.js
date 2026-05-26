// Seed do banco de dados — Dados iniciais para o sistema
// Execução: npm run db:seed  ou  node src/seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Cores para as regiões
  const cores = ['#1A3A6B', '#C9963A', '#2D6A4F', '#7B2D8B', '#C44D34', '#0d9488', '#b45309'];

  // Criação das regiões
  const regioes = await Promise.all([
    prisma.regiao.upsert({ where: { nome: 'Centro de São Paulo' }, update: {}, create: { nome: 'Centro de São Paulo', descricao: 'Região central da capital', cor: cores[0] } }),
    prisma.regiao.upsert({ where: { nome: 'Baixada Santista' }, update: {}, create: { nome: 'Baixada Santista', descricao: 'Região litorânea', cor: cores[1] } }),
    prisma.regiao.upsert({ where: { nome: 'Osasco' }, update: {}, create: { nome: 'Osasco', descricao: 'Região de Osasco e entorno', cor: cores[2] } }),
    prisma.regiao.upsert({ where: { nome: 'Cotia e ABCD' }, update: {}, create: { nome: 'Cotia e ABCD', descricao: 'Grande ABCD e Cotia', cor: cores[3] } }),
    prisma.regiao.upsert({ where: { nome: 'Barueri' }, update: {}, create: { nome: 'Barueri', descricao: 'Região de Barueri e Alphaville', cor: cores[4] } }),
    prisma.regiao.upsert({ where: { nome: 'Sul Paulistana' }, update: {}, create: { nome: 'Sul Paulistana', descricao: 'Regiao sul da Associacao Paulistana', cor: cores[5] } }),
    prisma.regiao.upsert({ where: { nome: 'Oeste Paulistana' }, update: {}, create: { nome: 'Oeste Paulistana', descricao: 'Regiao oeste da Associacao Paulistana', cor: cores[6] } }),
  ]);

  console.log(`✅ ${regioes.length} regiões criadas/verificadas.`);

  // Criação dos distritos
  const distritos = await Promise.all([
    // Centro SP
    prisma.distrito.upsert({ where: { id: 1 }, update: {}, create: { nome: 'Centro Histórico', regiaoId: regioes[0].id } }),
    prisma.distrito.upsert({ where: { id: 2 }, update: {}, create: { nome: 'Lapa', regiaoId: regioes[0].id } }),
    // Baixada Santista
    prisma.distrito.upsert({ where: { id: 3 }, update: {}, create: { nome: 'Santos', regiaoId: regioes[1].id } }),
    prisma.distrito.upsert({ where: { id: 4 }, update: {}, create: { nome: 'São Vicente', regiaoId: regioes[1].id } }),
    // Osasco
    prisma.distrito.upsert({ where: { id: 5 }, update: {}, create: { nome: 'Osasco Centro', regiaoId: regioes[2].id } }),
    // Cotia e ABCD
    prisma.distrito.upsert({ where: { id: 6 }, update: {}, create: { nome: 'Cotia', regiaoId: regioes[3].id } }),
    prisma.distrito.upsert({ where: { id: 7 }, update: {}, create: { nome: 'São Bernardo do Campo', regiaoId: regioes[3].id } }),
    prisma.distrito.upsert({ where: { id: 8 }, update: {}, create: { nome: 'Santo André', regiaoId: regioes[3].id } }),
    // Barueri
    prisma.distrito.upsert({ where: { id: 9 }, update: {}, create: { nome: 'Barueri', regiaoId: regioes[4].id } }),
    prisma.distrito.upsert({ where: { id: 10 }, update: {}, create: { nome: 'Granja Viana', regiaoId: regioes[4].id } }),
    // Sul Paulistana
    prisma.distrito.upsert({ where: { id: 11 }, update: {}, create: { nome: 'Campo Limpo', regiaoId: regioes[5].id } }),
    prisma.distrito.upsert({ where: { id: 12 }, update: {}, create: { nome: 'Santo Amaro', regiaoId: regioes[5].id } }),
    // Oeste Paulistana
    prisma.distrito.upsert({ where: { id: 13 }, update: {}, create: { nome: 'Butanta', regiaoId: regioes[6].id } }),
    prisma.distrito.upsert({ where: { id: 14 }, update: {}, create: { nome: 'Pinheiros', regiaoId: regioes[6].id } }),
  ]);

  console.log(`✅ ${distritos.length} distritos criados/verificados.`);

  // Criação de igrejas
  const igrejas = await Promise.all([
    prisma.igreja.upsert({ where: { id: 1 }, update: {}, create: { nome: 'Igreja Central SP', distritoId: distritos[0].id } }),
    prisma.igreja.upsert({ where: { id: 2 }, update: {}, create: { nome: 'Igreja Santana', distritoId: distritos[1].id } }),
    prisma.igreja.upsert({ where: { id: 3 }, update: {}, create: { nome: 'Igreja Santos Sede', distritoId: distritos[2].id } }),
    prisma.igreja.upsert({ where: { id: 4 }, update: {}, create: { nome: 'Igreja Osasco Central', distritoId: distritos[4].id } }),
  ]);

  console.log(`✅ ${igrejas.length} igrejas criadas/verificadas.`);

  // ─── Duplas de exemplo ────────────────────────────────────────────────────────
  // Usamos createMany + skipDuplicates; depois buscamos a dupla 1 para vincular ao usuario DUPLA_MISSIONARIA
  await prisma.dupla.createMany({
    skipDuplicates: true,
    data: [
      {
        regiaoNome: 'Centro de São Paulo',
        distritoId: distritos[0].id,
        igrejaId: igrejas[0].id,
        bairro: 'Sé',
        tipoProjeto: 'CASA_A_CASA',
        liderNome: 'João Silva',
        liderTelefone: '(11) 99999-0001',
        liderEmail: 'joao@email.com',
        liderIgreja: 'Igreja Central SP',
        membro2Tipo: 'MEMBRO_IASD',
        membro2Nome: 'Maria Oliveira',
        membro2Telefone: '(11) 99999-0002',
        status: 'ATIVA',
        pessoasAlcancadas: 12,
      },
      {
        regiaoNome: 'Centro de São Paulo',
        distritoId: distritos[0].id,
        bairro: 'Brás',
        tipoProjeto: 'PEQUENOS_GRUPOS',
        liderNome: 'Pedro Souza',
        liderTelefone: '(11) 98888-0001',
        membro2Tipo: 'MEMBRO_IASD',
        membro2Nome: 'Ana Costa',
        status: 'ATIVA',
        pessoasAlcancadas: 8,
      },
      {
        regiaoNome: 'Baixada Santista',
        distritoId: distritos[2].id,
        igrejaId: igrejas[2].id,
        bairro: 'Gonzaga',
        tipoProjeto: 'ACAO_SOCIAL',
        liderNome: 'Carlos Ferreira',
        liderTelefone: '(13) 99999-0001',
        membro2Tipo: 'MEMBRO_IASD',
        membro2Nome: 'Lúcia Santos',
        status: 'PENDENTE',
        pessoasAlcancadas: 0,
      },
    ],
  });

  // Busca a primeira dupla para vincular ao perfil DUPLA_MISSIONARIA
  const primeirasDuplas = await prisma.dupla.findMany({
    take: 2,
    orderBy: { id: 'asc' },
    select: { id: true, liderNome: true, membro2Nome: true },
  });

  console.log(`✅ Duplas de exemplo criadas/verificadas.`);

  // ─── Usuários — 6 perfis ─────────────────────────────────────────────────────

  // 1. SUPER_ADMIN (Programador)
  const superAdminHash = await bcrypt.hash('SuperAdmin@123', 10);
  await prisma.usuario.upsert({
    where: { email: 'superadmin@ap.adventistas.org' },
    update: {},
    create: {
      nome: 'Super Administrador',
      email: 'superadmin@ap.adventistas.org',
      senha: superAdminHash,
      perfil: 'SUPER_ADMIN',
    },
  });

  // 2. ADMINISTRADOR (Departamental MIPES)
  const adminHash = await bcrypt.hash('Admin@123', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@ap.adventistas.org' },
    update: {},
    create: {
      nome: 'Departamental MIPES',
      email: 'admin@ap.adventistas.org',
      senha: adminHash,
      perfil: 'ADMINISTRADOR',
    },
  });

  // 3. PASTOR_REGIONAL (vinculado à região Centro SP)
  const pastorRegionalHash = await bcrypt.hash('Pastor@123', 10);
  await prisma.usuario.upsert({
    where: { email: 'pastor.regional@ap.adventistas.org' },
    update: {},
    create: {
      nome: 'Pastor Regional Centro SP',
      email: 'pastor.regional@ap.adventistas.org',
      senha: pastorRegionalHash,
      perfil: 'PASTOR_REGIONAL',
      regiaoId: regioes[0].id,
    },
  });

  // 4. PASTOR_DISTRITAL (vinculado ao distrito Santos)
  const pastorDistritalHash = await bcrypt.hash('Pastor@123', 10);
  await prisma.usuario.upsert({
    where: { email: 'pastor.santos@ap.adventistas.org' },
    update: {},
    create: {
      nome: 'Pastor Santos',
      email: 'pastor.santos@ap.adventistas.org',
      senha: pastorDistritalHash,
      perfil: 'PASTOR_DISTRITAL',
      distritoId: distritos[2].id,
    },
  });

  // 5. COORDENADOR_REGIONAL (vinculado à região Centro SP)
  const coordHash = await bcrypt.hash('Coord@123', 10);
  await prisma.usuario.upsert({
    where: { email: 'coord.centro@ap.adventistas.org' },
    update: {},
    create: {
      nome: 'Coordenador PG — Centro SP',
      email: 'coord.centro@ap.adventistas.org',
      senha: coordHash,
      perfil: 'COORDENADOR_REGIONAL',
      regiaoId: regioes[0].id,
    },
  });

  // 6. DUPLA_MISSIONARIA (vinculada à 1ª dupla do banco)
  const duplaHash = await bcrypt.hash('Dupla@123', 10);
  const duplaId = primeirasDuplas[0]?.id ?? null;
  await prisma.usuario.upsert({
    where: { email: 'dupla.joao@ap.adventistas.org' },
    update: {},
    create: {
      nome: 'João Silva (Dupla)',
      email: 'dupla.joao@ap.adventistas.org',
      senha: duplaHash,
      perfil: 'DUPLA_MISSIONARIA',
      duplaId,
    },
  });

  console.log('');
  console.log('✅ 6 usuários criados/verificados com sucesso!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📋 CREDENCIAIS DE ACESSO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUPER_ADMIN         superadmin@ap.adventistas.org  / SuperAdmin@123');
  console.log('  ADMINISTRADOR       admin@ap.adventistas.org        / Admin@123');
  console.log('  PASTOR_REGIONAL     pastor.regional@ap.adventistas.org / Pastor@123');
  console.log('  PASTOR_DISTRITAL    pastor.santos@ap.adventistas.org   / Pastor@123');
  console.log('  COORDENADOR_REG.    coord.centro@ap.adventistas.org    / Coord@123');
  if (duplaId) {
    console.log(`  DUPLA_MISSIONARIA   dupla.joao@ap.adventistas.org     / Dupla@123  (duplaId: ${duplaId})`);
  } else {
    console.log('  DUPLA_MISSIONARIA   dupla.joao@ap.adventistas.org     / Dupla@123  (⚠️ sem dupla vinculada)');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
