require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const REGIOES_OFICIAIS = Array.from({ length: 7 }, (_, index) => `REGIÃO ${index + 1}`);
const EMAIL_DOMINIO = 'ap.adventistas.org';
const LEGADOS_DEMO = [
  'pastor.regional@ap.adventistas.org',
  'pastor.santos@ap.adventistas.org',
  'coord.centro@ap.adventistas.org',
  'dupla.joao@ap.adventistas.org',
];
const EMAIL_DUPLA_UNIFICADA = `duplas.missionarias@${EMAIL_DOMINIO}`;
const ARQUIVO_SENHAS = path.resolve(__dirname, '../../../senha.md');

const lerSenhasExistentes = () => {
  if (!fs.existsSync(ARQUIVO_SENHAS)) return {};
  const conteudo = fs.readFileSync(ARQUIVO_SENHAS, 'utf8');
  return conteudo.split(/\r?\n/).reduce((acc, linha) => {
    if (!linha.startsWith('|') || linha.includes('---')) return acc;
    const colunas = linha.split('|').map((coluna) => coluna.trim());
    const email = colunas[4];
    const senha = colunas[5];
    if (email && senha && email.includes('@')) acc[email] = senha;
    return acc;
  }, {});
};

const slug = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const ordemRegiao = (nome = '') => {
  const resultado = String(nome).match(/^REGIÃO\s+(\d+)$/i);
  return resultado ? Number(resultado[1]) : 999;
};

const senhaForte = () => {
  const grupos = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%&*_-+=?',
  ];
  const todos = grupos.join('');
  const chars = grupos.map((grupo) => grupo[crypto.randomInt(grupo.length)]);
  while (chars.length < 18) {
    chars.push(todos[crypto.randomInt(todos.length)]);
  }
  return chars
    .map((char) => ({ char, peso: crypto.randomInt(1000000) }))
    .sort((a, b) => a.peso - b.peso)
    .map((item) => item.char)
    .join('');
};

const upsertUsuario = async (credencial) => {
  const senha = await bcrypt.hash(credencial.senha, 10);
  const data = {
    nome: credencial.nome,
    email: credencial.email,
    senha,
    perfil: credencial.perfil,
    ativo: true,
    regiaoId: credencial.regiaoId || null,
    distritoId: credencial.distritoId || null,
    igrejaId: credencial.igrejaId || null,
    duplaId: credencial.duplaId || null,
  };

  await prisma.usuario.upsert({
    where: { email: credencial.email },
    update: data,
    create: data,
  });
};

const gerarMarkdown = (credenciais, resumo) => {
  const secoes = [
    ['Contas Administrativas', credenciais.filter((item) => ['SUPER_ADMIN', 'ADMINISTRADOR'].includes(item.perfil))],
    ['Pastores Regionais', credenciais.filter((item) => item.perfil === 'PASTOR_REGIONAL')],
    ['Coordenadores Regionais', credenciais.filter((item) => item.perfil === 'COORDENADOR_REGIONAL')],
    ['Pastores Distritais', credenciais.filter((item) => item.perfil === 'PASTOR_DISTRITAL')],
    ['Diretores Missionários de Igreja', credenciais.filter((item) => item.perfil === 'DIRETOR_MISSIONARIO_IGREJA')],
    ['Duplas Missionárias', credenciais.filter((item) => item.perfil === 'DUPLA_MISSIONARIA')],
  ];

  const linhas = [
    '# Credenciais de Acesso',
    '',
    `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}`,
    '',
    `Resumo: ${resumo.total} contas ativas geradas/atualizadas.`,
    '',
    '> Guarde este arquivo em local seguro. Estas senhas dão acesso real ao sistema.',
    '',
  ];

  secoes.forEach(([titulo, itens]) => {
    linhas.push(`## ${titulo}`);
    linhas.push('');
    linhas.push('| Perfil | Escopo | Nome | E-mail | Senha |');
    linhas.push('|---|---|---|---|---|');
    itens.forEach((item) => {
      linhas.push(`| ${item.perfil} | ${item.escopo} | ${item.nome} | ${item.email} | ${item.senha} |`);
    });
    linhas.push('');
  });

  if (resumo.legadosDesativados.length) {
    linhas.push('## Contas antigas de demonstração desativadas');
    linhas.push('');
    resumo.legadosDesativados.forEach((email) => linhas.push(`- ${email}`));
    linhas.push('');
  }

  return `${linhas.join('\n')}\n`;
};

async function main() {
  const regioes = (await prisma.regiao.findMany({
    where: { nome: { in: REGIOES_OFICIAIS } },
    select: { id: true, nome: true, nomeConselheiro: true },
  })).sort((a, b) => ordemRegiao(a.nome) - ordemRegiao(b.nome));

  if (regioes.length !== 7) {
    throw new Error(`Esperadas 7 regiões oficiais, encontradas ${regioes.length}.`);
  }

  const distritos = await prisma.distrito.findMany({
    where: { regiao: { is: { nome: { in: REGIOES_OFICIAIS } } } },
    include: { regiao: { select: { id: true, nome: true } } },
    orderBy: [{ regiaoId: 'asc' }, { nome: 'asc' }],
  });

  const igrejas = await prisma.igreja.findMany({
    where: { distrito: { is: { regiao: { is: { nome: { in: REGIOES_OFICIAIS } } } } } },
    include: {
      distrito: { include: { regiao: { select: { nome: true } } } },
    },
    orderBy: [{ distritoId: 'asc' }, { nome: 'asc' }],
  });

  const credenciais = [];
  const senhasExistentes = lerSenhasExistentes();
  const adicionar = (item) => {
    credenciais.push({ ...item, senha: senhasExistentes[item.email] || senhaForte() });
  };

  adicionar({
    perfil: 'SUPER_ADMIN',
    escopo: 'Sistema',
    nome: 'Super Administrador',
    email: `superadmin@${EMAIL_DOMINIO}`,
  });
  adicionar({
    perfil: 'ADMINISTRADOR',
    escopo: 'Associação Paulistana',
    nome: 'Administrador do Sistema',
    email: `admin@${EMAIL_DOMINIO}`,
  });

  regioes.forEach((regiao) => {
    const sufixo = slug(regiao.nome).replace('regiao-', 'regiao');
    adicionar({
      perfil: 'PASTOR_REGIONAL',
      escopo: regiao.nome,
      nome: `Pastor Regional - ${regiao.nome}`,
      email: `pastor.regional.${sufixo}@${EMAIL_DOMINIO}`,
      regiaoId: regiao.id,
    });
    adicionar({
      perfil: 'COORDENADOR_REGIONAL',
      escopo: regiao.nome,
      nome: `Coordenador Regional - ${regiao.nome}`,
      email: `coord.regional.${sufixo}@${EMAIL_DOMINIO}`,
      regiaoId: regiao.id,
    });
  });

  distritos.forEach((distrito) => {
    adicionar({
      perfil: 'PASTOR_DISTRITAL',
      escopo: `${distrito.nome} / ${distrito.regiao.nome}`,
      nome: distrito.nomePastor || `Pastor Distrital - ${distrito.nome}`,
      email: `pastor.distrital.${distrito.id}.${slug(distrito.nome)}@${EMAIL_DOMINIO}`,
      distritoId: distrito.id,
    });
  });

  igrejas.forEach((igreja) => {
    adicionar({
      perfil: 'DIRETOR_MISSIONARIO_IGREJA',
      escopo: `${igreja.nome} / ${igreja.distrito.nome}`,
      nome: igreja.nomeCoordInteressados || igreja.nomeDiretorMinisterioPessoal || `Diretor Missionário - ${igreja.nome}`,
      email: `diretor.missionario.${igreja.id}.${slug(igreja.nome)}@${EMAIL_DOMINIO}`,
      igrejaId: igreja.id,
    });
  });

  adicionar({
    perfil: 'DUPLA_MISSIONARIA',
    escopo: 'Todas as duplas missionárias',
    nome: 'Duplas Missionárias',
    email: EMAIL_DUPLA_UNIFICADA,
  });

  for (const credencial of credenciais) {
    await upsertUsuario(credencial);
  }

  const emailsGerados = new Set(credenciais.map((item) => item.email));
  const legadosDesativados = LEGADOS_DEMO.filter((email) => !emailsGerados.has(email));
  if (legadosDesativados.length) {
    await prisma.usuario.updateMany({
      where: { email: { in: legadosDesativados } },
      data: { ativo: false },
    });
  }
  await prisma.usuario.updateMany({
    where: {
      perfil: 'DUPLA_MISSIONARIA',
      email: {
        startsWith: 'dupla.',
        not: EMAIL_DUPLA_UNIFICADA,
      },
    },
    data: { ativo: false },
  });

  fs.writeFileSync(ARQUIVO_SENHAS, gerarMarkdown(credenciais, {
    total: credenciais.length,
    legadosDesativados,
  }), 'utf8');

  console.log(`Contas geradas/atualizadas: ${credenciais.length}`);
  console.log(`Pastores regionais: ${credenciais.filter((item) => item.perfil === 'PASTOR_REGIONAL').length}`);
  console.log(`Coordenadores regionais: ${credenciais.filter((item) => item.perfil === 'COORDENADOR_REGIONAL').length}`);
  console.log(`Pastores distritais: ${credenciais.filter((item) => item.perfil === 'PASTOR_DISTRITAL').length}`);
  console.log(`Diretores missionários de igreja: ${credenciais.filter((item) => item.perfil === 'DIRETOR_MISSIONARIO_IGREJA').length}`);
  console.log(`Duplas missionárias: ${credenciais.filter((item) => item.perfil === 'DUPLA_MISSIONARIA').length}`);
  console.log(`Arquivo atualizado: ${ARQUIVO_SENHAS}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
