const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeString(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\(gp\)/g, '')
    .replace(/ i$/g, '') // for cases like 'Vila Menck I'
    .replace(/ d'abril/g, " d'abril") // just in case
    .trim();
}

async function main() {
  console.log('Lendo arquivos markdown...');
  const regioesContent = fs.readFileSync('../regiaoDistritoIgreja.md', 'utf-8');
  const membrosContent = fs.readFileSync('../membros_por_igreja.md', 'utf-8');

  // Parse membros
  const membrosPorIgreja = {}; // normalized name -> members
  const membrosPorDistrito = {}; // normalized name -> members

  const membrosLines = membrosContent.split('\n');
  let currentDistrito = null;

  for (const line of membrosLines) {
    const distMatch = line.match(/^##\s+(.+?)\s+—\s+([\d.,]+)\s+membros/i);
    if (distMatch) {
      currentDistrito = normalizeString(distMatch[1]);
      membrosPorDistrito[currentDistrito] = parseInt(distMatch[2].replace(/\./g, ''));
      continue;
    }

    if (line.startsWith('|') && !line.includes('Igreja | Tipo') && !line.includes('---|---')) {
      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length === 3) {
        const igrejaName = normalizeString(parts[0]);
        const members = parseInt(parts[2].replace(/\./g, '')) || 0;
        membrosPorIgreja[igrejaName] = members;
      }
    }
  }

  // Parse Regiões, Distritos e Igrejas
  const regioesLines = regioesContent.split('\n');
  let currentRegiaoName = null;
  let currentDistritoName = null;
  
  const hierarchy = {}; // regiao -> { distrito: [igrejas] }

  for (const line of regioesLines) {
    const regMatch = line.match(/^##\s+(REGIÃO\s+\d+)/i);
    if (regMatch) {
      currentRegiaoName = regMatch[1];
      hierarchy[currentRegiaoName] = {};
      currentDistritoName = null;
      continue;
    }

    const distMatch = line.match(/^\*\*([^*]+)\*\*/);
    if (distMatch && currentRegiaoName) {
      currentDistritoName = distMatch[1].trim();
      hierarchy[currentRegiaoName][currentDistritoName] = [];
      continue;
    }

    const igMatch = line.match(/^-\s+(.+)/);
    if (igMatch && currentDistritoName) {
      hierarchy[currentRegiaoName][currentDistritoName].push(igMatch[1].trim());
    }
  }

  console.log('Limpando dados antigos (mantendo usuários)...');
  await prisma.dupla.deleteMany();
  await prisma.igreja.deleteMany();
  await prisma.distrito.deleteMany();
  await prisma.regiao.deleteMany();

  console.log('Inserindo regiões, distritos e igrejas...');
  for (const regiaoName of Object.keys(hierarchy)) {
    const regiao = await prisma.regiao.create({
      data: {
        nome: regiaoName,
        descricao: regiaoName
      }
    });

    for (const distritoName of Object.keys(hierarchy[regiaoName])) {
      const distNorm = normalizeString(distritoName);
      let distMembros = membrosPorDistrito[distNorm] || 0;

      // Se não achou exato, tenta achar o distrito que inclui o nome ou vice versa
      if (distMembros === 0) {
        const key = Object.keys(membrosPorDistrito).find(k => k.includes(distNorm) || distNorm.includes(k));
        if (key) distMembros = membrosPorDistrito[key];
      }

      const distrito = await prisma.distrito.create({
        data: {
          nome: distritoName,
          regiaoId: regiao.id,
          membros: distMembros
        }
      });

      for (const igrejaName of hierarchy[regiaoName][distritoName]) {
        const igNorm = normalizeString(igrejaName);
        let igMembros = membrosPorIgreja[igNorm] || 0;

        if (igMembros === 0) {
          const key = Object.keys(membrosPorIgreja).find(k => k.includes(igNorm) || igNorm.includes(k));
          if (key) igMembros = membrosPorIgreja[key];
        }

        await prisma.igreja.create({
          data: {
            nome: igrejaName,
            distritoId: distrito.id,
            membros: igMembros
          }
        });
      }
    }
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
