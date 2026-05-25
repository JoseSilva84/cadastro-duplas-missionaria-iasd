// Model de Relatório — Operações no banco de dados
const prisma = require('../lib/prisma');

const classificarClasseBiblica = (totalEstudantes = 0) => {
  if (totalEstudantes >= 150) return 'A';
  if (totalEstudantes >= 67) return 'B';
  if (totalEstudantes >= 28) return 'C';
  return null;
};

const totalEstudantesDaClasse = (estudo) => {
  const totalParticipantes = estudo.participantes?.length || estudo._count?.participantes || 0;
  return totalParticipantes > 0 ? totalParticipantes : 1;
};

const criarResumoClassesBiblicas = (estudos = []) => {
  const resumo = {
    A: { total: 0, igrejas: {} },
    B: { total: 0, igrejas: {} },
    C: { total: 0, igrejas: {} },
  };
  const porIgreja = {};

  estudos.forEach((estudo) => {
    const igreja = estudo.dupla?.igreja;
    const igrejaId = igreja?.id || 'sem-igreja';
    const igrejaNome = igreja?.nome || 'Sem igreja vinculada';
    if (!porIgreja[igrejaId]) {
      porIgreja[igrejaId] = { id: igreja?.id || null, nome: igrejaNome, total: 0 };
    }
    porIgreja[igrejaId].total += totalEstudantesDaClasse(estudo);
  });

  Object.values(porIgreja).forEach((igreja) => {
    const classe = classificarClasseBiblica(igreja.total);
    if (!resumo[classe]) return;
    resumo[classe].total += igreja.total;
    resumo[classe].igrejas[igreja.id || igreja.nome] = igreja;
  });

  return Object.fromEntries(Object.entries(resumo).map(([classe, dados]) => [
    classe,
    { total: dados.total, igrejas: Object.values(dados.igrejas).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome)) },
  ]));
};

const RelatorioModel = {
  async resumo() {
    const [totalDuplas, totalAtivas, totalPendentes, totalInativas, totalPessoas, classesBiblicasEstudos] = await Promise.all([
      prisma.dupla.count(),
      prisma.dupla.count({ where: { status: 'ATIVA' } }),
      prisma.dupla.count({ where: { status: 'PENDENTE' } }),
      prisma.dupla.count({ where: { status: 'INATIVA' } }),
      prisma.dupla.aggregate({ _sum: { pessoasAlcancadas: true, batismos: true } }),
      prisma.estudoBiblico.findMany({
        where: { tipoEstudo: 'CLASSE' },
        include: {
          participantes: { select: { id: true } },
          dupla: {
            select: {
              igreja: { select: { id: true, nome: true } },
            },
          },
        },
      }),
    ]);

    const [estudosAtivos, evangelismosAtivos] = await Promise.all([
      prisma.dupla.count({ where: { statusEstudoBiblico: 'ATIVO' } }),
      prisma.dupla.count({ where: { statusEvangelismo: 'ATIVO' } }),
    ]);

    const porProjeto = await prisma.dupla.groupBy({
      by: ['tipoProjeto'],
      _count: { tipoProjeto: true },
    });

    return {
      totalDuplas,
      totalAtivas,
      totalPendentes,
      totalInativas,
      totalPessoasAlcancadas: totalPessoas._sum.pessoasAlcancadas || 0,
      totalBatismos: totalPessoas._sum.batismos || 0,
      estudosAtivos,
      evangelismosAtivos,
      porProjeto,
      classesBiblicas: criarResumoClassesBiblicas(classesBiblicasEstudos),
    };
  },

  // Duplas agrupadas por região
  async porRegiao() {
    const regioes = await prisma.regiao.findMany({
      include: {
        distritos: {
          include: {
            duplas: true,
            _count: { select: { duplas: true } },
          },
        },
      },
    });

    return regioes.map((r) => {
      const todasDuplas = r.distritos.flatMap(d => d.duplas);

      return {
        id: r.id,
        nome: r.nome,
        cor: r.cor,
        totalDistritos: r.distritos.length,
        totalDuplas: todasDuplas.length,
        ativas: todasDuplas.filter(d => d.status === 'ATIVA').length,
        pendentes: todasDuplas.filter(d => d.status === 'PENDENTE').length,
        inativas: todasDuplas.filter(d => d.status === 'INATIVA').length,
        estudosAtivos: todasDuplas.filter(d => d.statusEstudoBiblico === 'ATIVO').length,
        evangelismosAtivos: todasDuplas.filter(d => d.statusEvangelismo === 'ATIVO').length,
        totalBatismos: todasDuplas.reduce((a, d) => a + (d.batismos || 0), 0),
        totalPessoas: todasDuplas.reduce((a, d) => a + (d.pessoasAlcancadas || 0), 0),
        distritos: r.distritos.map(d => ({
          id: d.id,
          nome: d.nome,
          totalDuplas: d._count.duplas,
          totalPessoas: d.duplas.reduce((a, dupla) => a + (dupla.pessoasAlcancadas || 0), 0)
        })).sort((a, b) => b.totalDuplas - a.totalDuplas)
      };
    });
  },

  // Relatório de um distrito específico
  async porDistrito(distritoId) {
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(distritoId) },
      include: {
        regiao: true,
        duplas: true,
        igrejas: true,
      },
    });

    if (!distrito) return null;

    return {
      distrito: distrito.nome,
      regiao: distrito.regiao.nome,
      totalIgrejas: distrito.igrejas.length,
      totalDuplas: distrito.duplas.length,
      ativas: distrito.duplas.filter((d) => d.status === 'ATIVA').length,
      pendentes: distrito.duplas.filter((d) => d.status === 'PENDENTE').length,
      inativas: distrito.duplas.filter((d) => d.status === 'INATIVA').length,
      pessoasAlcancadas: distrito.duplas.reduce((acc, d) => acc + d.pessoasAlcancadas, 0),
    };
  },

  async porIgreja(igrejaId) {
    const igreja = await prisma.igreja.findUnique({
      where: { id: Number(igrejaId) },
      include: {
        distrito: { include: { regiao: true } },
        duplas: {
          include: {
            estudosBiblicos: {
              include: { participantes: true },
              orderBy: { criadoEm: 'desc' },
            },
            evangelismos: true,
          },
          orderBy: { criadoEm: 'desc' },
        },
        escolasSabatina: {
          orderBy: { criadoEm: 'desc' },
          include: { duplas: true },
        },
      },
    });

    if (!igreja) return null;

    const estudos = igreja.duplas.flatMap((dupla) => dupla.estudosBiblicos);
    const evangelismos = igreja.duplas.flatMap((dupla) => dupla.evangelismos);
    const ultimoCadastroEscola = igreja.escolasSabatina[0] || null;
    const totalEstudantesClasseBiblica = estudos
      .filter((estudo) => estudo.tipoEstudo === 'CLASSE')
      .reduce((acc, estudo) => acc + totalEstudantesDaClasse(estudo), 0);
    const classeBiblica = classificarClasseBiblica(totalEstudantesClasseBiblica);

    return {
      igreja: {
        id: igreja.id,
        nome: igreja.nome,
        endereco: igreja.endereco,
        membros: igreja.membros,
        fotoIgreja: igreja.fotoIgreja,
        distrito: igreja.distrito.nome,
        regiao: igreja.distrito.regiao.nome,
      },
      liderancas: {
        diretorMinisterioPessoal: {
          nome: igreja.nomeDiretorMinisterioPessoal,
          endereco: igreja.enderecoDiretorMinisterioPessoal,
          whatsapp: igreja.whatsappDiretorMinisterioPessoal,
          dataNascimento: igreja.dataNascimentoDiretorMinisterioPessoal,
          foto: igreja.fotoDiretorMinisterioPessoal,
        },
        pastor: {
          nome: igreja.distrito.nomePastor,
          cargo: igreja.distrito.cargoPastor,
          foto: igreja.distrito.fotoPastor,
        },
        coordenadorMissionario: {
          nome: igreja.nomeCoordInteressados,
          cargo: igreja.cargoCoordInteressados,
          telefone: igreja.telefoneCoordInteressados,
          endereco: igreja.enderecoCoordInteressados,
          dataNascimento: igreja.dataNascimentoCoordInteressados,
          foto: igreja.fotoCoordInteressados,
        },
      },
      indicadores: {
        quantidadeMembros: igreja.membros,
        quantidadeDuplasMissionarias: igreja.duplas.length,
        quantidadeEstudos: estudos.length,
        quantidadePontosEstudos: estudos.filter((estudo) => estudo.tipoEstudo === 'PONTO').length,
        quantidadeClassesBiblicas: estudos.filter((estudo) => estudo.tipoEstudo === 'CLASSE').length,
        classeBiblica,
        totalEstudantesClasseBiblica,
        estudosAtivos: igreja.duplas.filter((dupla) => dupla.statusEstudoBiblico === 'ATIVO').length,
        evangelismosAtivos: igreja.duplas.filter((dupla) => dupla.statusEvangelismo === 'ATIVO').length,
        batismos: igreja.duplas.reduce((acc, dupla) => acc + (dupla.batismos || 0), 0),
        pessoasAlcancadas: igreja.duplas.reduce((acc, dupla) => acc + (dupla.pessoasAlcancadas || 0), 0),
        participantesEmPontosEClasses: estudos.reduce((acc, estudo) => acc + (estudo.participantes?.length || 0), 0),
        escolaSabatina: ultimoCadastroEscola ? {
          unidadesAcao: ultimoCadastroEscola.unidadesAcao,
          classeProfessores: ultimoCadastroEscola.classeProfessores,
          classeInteressados: ultimoCadastroEscola.classeInteressados,
          quantidadePequenosGrupos: ultimoCadastroEscola.quantidadePequenosGrupos,
        } : null,
      },
      duplas: igreja.duplas.map((dupla) => ({
        id: dupla.id,
        liderNome: dupla.liderNome,
        membro2Nome: dupla.membro2Nome,
        status: dupla.status,
        estudoBiblico: dupla.estudoBiblico,
        statusEstudoBiblico: dupla.statusEstudoBiblico,
        statusEvangelismo: dupla.statusEvangelismo,
        batismos: dupla.batismos,
        pessoasAlcancadas: dupla.pessoasAlcancadas,
        estudos: dupla.estudosBiblicos.length,
        evangelismos: dupla.evangelismos.length,
      })),
      estudos,
      evangelismos,
      geradoEm: new Date().toISOString(),
    };
  },

  async estudosBiblicos(query = {}) {
    const where = {};
    if (query.duplaId) where.duplaId = Number(query.duplaId);
    if (query.serie) where.serie = query.serie;
    if (query.licaoAtual) where.licaoAtual = Number(query.licaoAtual);
    if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };
    if (query.dataInicio || query.dataFim) {
      where.criadoEm = {};
      if (query.dataInicio) where.criadoEm.gte = new Date(query.dataInicio);
      if (query.dataFim) where.criadoEm.lte = new Date(`${query.dataFim}T23:59:59.999Z`);
    }

    const estudos = await prisma.estudoBiblico.findMany({
      where,
      include: {
        dupla: {
          select: {
            id: true,
            liderNome: true,
            membro2Nome: true,
            bairro: true,
            classificacaoDupla: true,
            igreja: { select: { id: true, nome: true } },
            distrito: { select: { nome: true, regiao: { select: { nome: true } } } },
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const porSerie = await prisma.estudoBiblico.groupBy({
      by: ['serie'],
      where,
      _count: { serie: true },
    });

    return { total: estudos.length, porSerie, estudos };
  },

  async dashboardAssociacao() {
    const [
      atasDuplas,
      quantidadeEstudos,
      quantidadeClasses,
      quantidadePontosEstudos,
      pessoasEstudandoUnico,
      pessoasEstudandoGrupos,
      classesDuplas,
      escolaSabatinaResumo,
      escolaSabatinaCadastros,
      pequenosGruposPorDuplas,
    ] = await Promise.all([
      prisma.ataDupla.count(),
      prisma.estudoBiblico.count(),
      prisma.estudoBiblico.count({ where: { tipoEstudo: 'CLASSE' } }),
      prisma.estudoBiblico.count({ where: { tipoEstudo: 'PONTO' } }),
      prisma.estudoBiblico.count({ where: { tipoEstudo: 'UNICO' } }),
      prisma.participante.count({
        where: {
          estudo: {
            tipoEstudo: { in: ['PONTO', 'CLASSE'] },
          },
        },
      }),
      prisma.dupla.groupBy({
        by: ['classificacaoDupla'],
        where: { classificacaoDupla: { not: null } },
        _count: { classificacaoDupla: true },
      }),
      prisma.escolaSabatinaResumo.findUnique({ where: { id: 1 } }),
      prisma.escolaSabatinaCadastro.findMany({
        select: {
          unidadesAcao: true,
          classeProfessores: true,
          classeInteressados: true,
          visitasDiretores: true,
          visitasProfessores: true,
          visitasAlunos: true,
          quantidadePequenosGrupos: true,
        },
      }),
      prisma.dupla.count({ where: { tipoProjeto: 'PEQUENOS_GRUPOS' } }),
    ]);

    const classes = { A: 0, B: 0, C: 0 };
    classesDuplas.forEach((item) => {
      if (item.classificacaoDupla) {
        classes[item.classificacaoDupla] = item._count.classificacaoDupla;
      }
    });

    const escolaSabatina = escolaSabatinaCadastros.length > 0
      ? escolaSabatinaCadastros.reduce((acc, item) => ({
        unidadesAcao: acc.unidadesAcao + item.unidadesAcao,
        classeProfessores: acc.classeProfessores + item.classeProfessores,
        classeInteressados: acc.classeInteressados + item.classeInteressados,
        visitasDiretores: acc.visitasDiretores + item.visitasDiretores,
        visitasProfessores: acc.visitasProfessores + item.visitasProfessores,
        visitasAlunos: acc.visitasAlunos + item.visitasAlunos,
        quantidadePequenosGrupos: acc.quantidadePequenosGrupos + item.quantidadePequenosGrupos,
      }), {
        unidadesAcao: 0,
        classeProfessores: 0,
        classeInteressados: 0,
        visitasDiretores: 0,
        visitasProfessores: 0,
        visitasAlunos: 0,
        quantidadePequenosGrupos: 0,
      })
      : escolaSabatinaResumo || {
      unidadesAcao: 0,
      classeProfessores: 0,
      classeInteressados: 0,
      visitasDiretores: 0,
      visitasProfessores: 0,
      visitasAlunos: 0,
      quantidadePequenosGrupos: pequenosGruposPorDuplas,
    };

    return {
      ministerioPessoal: {
        atasDuplas,
        quantidadeEstudos,
        quantidadeClasses,
        quantidadePontosEstudos,
        quantidadePessoasEstudando: pessoasEstudandoUnico + pessoasEstudandoGrupos,
        classes,
      },
      escolaSabatina: {
        unidadesAcao: escolaSabatina.unidadesAcao,
        classeProfessores: escolaSabatina.classeProfessores,
        classeInteressados: escolaSabatina.classeInteressados,
        visitasRealizadas: {
          diretores: escolaSabatina.visitasDiretores,
          professores: escolaSabatina.visitasProfessores,
          alunos: escolaSabatina.visitasAlunos,
          total: escolaSabatina.visitasDiretores + escolaSabatina.visitasProfessores + escolaSabatina.visitasAlunos,
        },
        quantidadePequenosGrupos: escolaSabatina.quantidadePequenosGrupos ?? pequenosGruposPorDuplas,
      },
    };
  },

  async atualizarEscolaSabatinaResumo(data = {}) {
    const inteiro = (valor) => Math.max(Number(valor || 0), 0);

    return prisma.escolaSabatinaResumo.upsert({
      where: { id: 1 },
      update: {
        unidadesAcao: inteiro(data.unidadesAcao),
        classeProfessores: inteiro(data.classeProfessores),
        classeInteressados: inteiro(data.classeInteressados),
        visitasDiretores: inteiro(data.visitasDiretores),
        visitasProfessores: inteiro(data.visitasProfessores),
        visitasAlunos: inteiro(data.visitasAlunos),
        quantidadePequenosGrupos: inteiro(data.quantidadePequenosGrupos),
      },
      create: {
        id: 1,
        unidadesAcao: inteiro(data.unidadesAcao),
        classeProfessores: inteiro(data.classeProfessores),
        classeInteressados: inteiro(data.classeInteressados),
        visitasDiretores: inteiro(data.visitasDiretores),
        visitasProfessores: inteiro(data.visitasProfessores),
        visitasAlunos: inteiro(data.visitasAlunos),
        quantidadePequenosGrupos: inteiro(data.quantidadePequenosGrupos),
      },
    });
  },
};

module.exports = RelatorioModel;
