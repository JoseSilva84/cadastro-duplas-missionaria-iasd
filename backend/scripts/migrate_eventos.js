const prisma = require('../src/lib/prisma');

async function migrate() {
  console.log('Iniciando migração de CalendarioEvento no PostgreSQL...');

  // 1. Criar tabela CalendarioEvento
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CalendarioEvento" (
      "id" SERIAL PRIMARY KEY,
      "temaId" INTEGER NOT NULL,
      "nome" TEXT NOT NULL,
      "descricao" TEXT,
      "data" TIMESTAMP(3),
      "departamento" TEXT DEFAULT 'OUTRO',
      "criadoPorId" INTEGER,
      "criadoPorPerfil" TEXT,
      "criadoPorNome" TEXT,
      "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CalendarioEvento_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "CalendarioTema"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('Tabela CalendarioEvento criada ou confirmada.');

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CalendarioEvento_temaId_idx" ON "CalendarioEvento"("temaId");
  `);

  // 2. Adicionar coluna eventoId em CalendarioAcaoMissionaria
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CalendarioAcaoMissionaria" ADD COLUMN IF NOT EXISTS "eventoId" INTEGER;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CalendarioAcaoMissionaria_eventoId_fkey'
      ) THEN
        ALTER TABLE "CalendarioAcaoMissionaria"
        ADD CONSTRAINT "CalendarioAcaoMissionaria_eventoId_fkey"
        FOREIGN KEY ("eventoId") REFERENCES "CalendarioEvento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CalendarioAcaoMissionaria_eventoId_idx" ON "CalendarioAcaoMissionaria"("eventoId");
  `);
  console.log('Coluna e foreign key eventoId adicionadas a CalendarioAcaoMissionaria.');

  // 3. Obter os 5 temas oficiais de 2027
  const temas = await prisma.calendarioTema.findMany({ where: { ano: 2027 } });
  console.log('Temas encontrados:', temas.map(t => `${t.id}: ${t.nome}`));

  const temaPorNome = {};
  temas.forEach(t => { temaPorNome[t.nome.toLowerCase()] = t; });

  // Lista dos 14 eventos oficiais conforme a planilha
  const eventosOficiais = [
    // Semana Santa
    { tema: 'semana santa', nome: 'Ações ASA', data: '2026-12-05', departamento: 'ASA', descricao: 'Planejamento e ações de assistência social (ASA) preparando a Semana Santa.' },
    { tema: 'semana santa', nome: 'Mult. Pesq. Bíblicas', data: '2027-01-16', departamento: 'MINISTERIO_PESSOAL', descricao: 'Multiplicação de pesquisas e instrutores bíblicos.' },
    { tema: 'semana santa', nome: 'Feira de Saúde', data: '2027-01-30', departamento: 'SAUDE', descricao: 'Feiras e circuito de saúde para a comunidade.' },
    { tema: 'semana santa', nome: 'Time Life', data: '2027-02-13', departamento: 'JOVENS', descricao: 'Mobilização jovem Time Life.' },
    { tema: 'semana santa', nome: 'Mult. Pesq. Bíblicas II', data: '2027-02-27', departamento: 'MINISTERIO_PESSOAL', descricao: 'Segunda etapa da multiplicação bíblica.' },
    { tema: 'semana santa', nome: 'Mult. Visitação', data: '2027-03-06', departamento: 'MINISTERIO_PESSOAL', descricao: 'Visitação integrada a interessados e famílias.' },

    // Evangelismo Feminino
    { tema: 'evangelismo feminino', nome: 'Chá Mulheres', data: '2027-04-10', departamento: 'MULHERES', descricao: 'Chá evangelístico para amigas e interessadas.' },
    { tema: 'evangelismo feminino', nome: 'Perda de Peso', data: '2027-05-01', departamento: 'SAUDE', descricao: 'Programa comunitário de saúde e perda de peso.' },
    { tema: 'evangelismo feminino', nome: 'Dia da Beleza', data: '2027-05-15', departamento: 'MULHERES', descricao: 'Ação comunitária de autocuidado e acolhimento.' },

    // Evangelismo Jovem
    { tema: 'evangelismo jovem', nome: 'Pesq. Bíblica Caleb', data: '2027-07-03', departamento: 'JOVENS', descricao: 'Missão Calebe e estudos bíblicos comunitários.' },
    { tema: 'evangelismo jovem', nome: 'Ecla Cristã Férias', data: '2027-07-10', departamento: 'DESBRAVADORES', descricao: 'Escola Cristã de Férias para crianças.' },
    { tema: 'evangelismo jovem', nome: 'Corte de Cabelo', data: '2027-07-17', departamento: 'JOVENS', descricao: 'Ação jovem solidária na comunidade.' },

    // Evangelismo Primavera
    { tema: 'evangelismo primavera', nome: 'Apelo Adolescente', data: '2027-08-21', departamento: 'JOVENS', descricao: 'Decisões e apelo com adolescentes e juvenis.' },

    // Evangelismo Colheita
    { tema: 'evangelismo colheita', nome: 'Apelo Campori', data: '2027-11-06', departamento: 'DESBRAVADORES', descricao: 'Batismos e apelo de decisão no Campori.' },
  ];

  for (const ev of eventosOficiais) {
    const tema = temaPorNome[ev.tema];
    if (!tema) {
      console.warn(`Tema ${ev.tema} não encontrado!`);
      continue;
    }

    // Verificar se o evento já existe
    const existentes = await prisma.$queryRawUnsafe(
      `SELECT id FROM "CalendarioEvento" WHERE "temaId" = $1 AND "nome" = $2`,
      tema.id,
      ev.nome
    );

    let eventoId;
    if (existentes && existentes.length > 0) {
      eventoId = existentes[0].id;
      console.log(`Evento já existe: ${ev.nome} (ID: ${eventoId})`);
    } else {
      const inserido = await prisma.$queryRawUnsafe(
        `INSERT INTO "CalendarioEvento" ("temaId", "nome", "descricao", "data", "departamento", "atualizadoEm")
         VALUES ($1, $2, $3, $4::timestamp, $5, NOW()) RETURNING id`,
        tema.id,
        ev.nome,
        ev.descricao,
        new Date(ev.data).toISOString(),
        ev.departamento
      );
      eventoId = inserido[0].id;
      console.log(`Evento criado: ${ev.nome} (ID: ${eventoId})`);
    }

    // Vincular quaisquer ações existentes com o mesmo nome para este eventoId
    await prisma.$executeRawUnsafe(
      `UPDATE "CalendarioAcaoMissionaria" SET "eventoId" = $1 WHERE "temaId" = $2 AND "nome" = $3 AND "eventoId" IS NULL`,
      eventoId,
      tema.id,
      ev.nome
    );
  }

  const contagem = await prisma.$queryRawUnsafe(`SELECT count(*) as total FROM "CalendarioEvento"`);
  console.log('Total de eventos cadastrados no banco:', contagem[0].total);

  await prisma.$disconnect();
  console.log('Migração concluída com sucesso!');
}

migrate().catch(e => {
  console.error('Erro na migração:', e);
  process.exit(1);
});
