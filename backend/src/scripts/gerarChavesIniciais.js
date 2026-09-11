const prisma = require('../lib/prisma');

function gerarSlugChave(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function inicializarChaves() {
  console.log('--- Inicializando Chaves de Acesso ---');

  // 1. Regiões
  const regioes = await prisma.regiao.findMany({ orderBy: { id: 'asc' } });
  for (const regiao of regioes) {
    if (!regiao.chaveAcesso) {
      let slug = gerarSlugChave(regiao.nome);
      if (!slug.includes('REGIAO')) {
        slug = `REGIAO-${regiao.id}`;
      }
      const chave = `${slug}-2026`;
      await prisma.regiao.update({
        where: { id: regiao.id },
        data: { chaveAcesso: chave, chaveAtiva: true },
      });
      console.log(`Região: ${regiao.nome} -> Chave: ${chave}`);
    } else {
      console.log(`Região: ${regiao.nome} já possui chave: ${regiao.chaveAcesso}`);
    }
  }

  // 2. Distritos
  const distritos = await prisma.distrito.findMany({ orderBy: { id: 'asc' } });
  const chavesUsadas = new Set();
  const regioesComChave = await prisma.regiao.findMany({ select: { chaveAcesso: true } });
  regioesComChave.forEach(r => r.chaveAcesso && chavesUsadas.add(r.chaveAcesso));

  for (const distrito of distritos) {
    if (!distrito.chaveAcesso) {
      let slug = gerarSlugChave(distrito.nome);
      // Se for muito longo, simplifica
      if (slug.length > 18) {
        // Pega as primeiras palavras ou reduz
        const palavras = slug.split('-');
        if (palavras.length > 2) {
          slug = palavras.slice(0, 2).join('-');
        } else {
          slug = slug.substring(0, 18);
        }
      }
      let chave = `${slug}-2026`;
      let contador = 1;
      while (chavesUsadas.has(chave)) {
        chave = `${slug}-${contador}-2026`;
        contador++;
      }
      chavesUsadas.add(chave);

      await prisma.distrito.update({
        where: { id: distrito.id },
        data: { chaveAcesso: chave, chaveAtiva: true },
      });
      console.log(`Distrito: ${distrito.nome} -> Chave: ${chave}`);
    } else {
      chavesUsadas.add(distrito.chaveAcesso);
      console.log(`Distrito: ${distrito.nome} já possui chave: ${distrito.chaveAcesso}`);
    }
  }

  console.log('--- Chaves de Acesso inicializadas com sucesso! ---');
  await prisma.$disconnect();
}

inicializarChaves().catch((err) => {
  console.error('Erro ao inicializar chaves:', err);
  prisma.$disconnect();
  process.exit(1);
});
