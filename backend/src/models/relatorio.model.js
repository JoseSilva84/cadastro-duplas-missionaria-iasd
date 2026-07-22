// Model de Relatório — Operações no banco de dados
const prisma = require('../lib/prisma');

const REGIOES_OFICIAIS = Array.from({ length: 7 }, (_, index) => `REGIÃO ${index + 1}`);

const ordemRegiaoOficial = (nome = '') => {
  const resultado = String(nome).match(/^REGIÃO\s+(\d+)$/i);
  return resultado ? Number(resultado[1]) : 999;
};

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

const ordenarPorTotal = (lista = []) => [...lista].sort((a, b) => b.total - a.total || String(a.nome).localeCompare(String(b.nome)));

const agruparSoma = (lista = [], chaveFn) => {
  const mapa = {};
  lista.forEach((item) => {
    const chave = chaveFn(item);
    if (!chave?.id) return;
    if (!mapa[chave.id]) mapa[chave.id] = { id: chave.id, nome: chave.nome, total: 0 };
    mapa[chave.id].total += chave.valor ?? 1;
  });
  return ordenarPorTotal(Object.values(mapa));
};

const nomeDupla = (dupla) => `${dupla.liderNome || 'Lider'} + ${dupla.membro2Nome || 'Membro'}`;

const criarDashboardDuplasMissionarias = (duplas = []) => {
  const duplasComIndicadores = duplas.map((dupla) => ({
    id: dupla.id,
    nome: nomeDupla(dupla),
    bairro: dupla.bairro,
    distrito: dupla.distrito?.nome || 'Sem distrito',
    regiao: dupla.distrito?.regiao?.nome || 'Sem regiao',
    estudos: dupla._count?.estudosBiblicos || 0,
    visitas: dupla._count?.acompanhamentos || 0,
    batismos: dupla.batismos || 0,
    pessoasAlcancadas: dupla.pessoasAlcancadas || 0,
    tiposEstudo: new Set((dupla.estudosBiblicos || []).map((estudo) => estudo.tipoEstudo)),
  }));

  const ordenarPorValor = (lista = []) => [...lista].sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));

  const consolidar = (chaveFn) => {
    const mapa = {};
    duplasComIndicadores.forEach((dupla) => {
      const chave = chaveFn(dupla);
      if (!chave?.id) return;
      if (!mapa[chave.id]) {
        mapa[chave.id] = {
          id: chave.id,
          nome: chave.nome,
          duplas: 0,
          estudos: 0,
          batismos: 0,
          visitas: 0,
          pessoasAlcancadas: 0,
        };
      }
      mapa[chave.id].duplas += 1;
      mapa[chave.id].estudos += dupla.estudos;
      mapa[chave.id].batismos += dupla.batismos;
      mapa[chave.id].visitas += dupla.visitas;
      mapa[chave.id].pessoasAlcancadas += dupla.pessoasAlcancadas;
    });
    return Object.values(mapa).sort((a, b) => b.duplas - a.duplas || a.nome.localeCompare(b.nome));
  };

  const regioes = agruparSoma(duplas, (dupla) => ({
    id: dupla.distrito?.regiao?.id,
    nome: dupla.distrito?.regiao?.nome,
  }));

  const distritos = agruparSoma(duplas, (dupla) => ({
    id: dupla.distrito?.id,
    nome: dupla.distrito?.nome,
  }));

  const top = (campo) => [...duplasComIndicadores]
    .sort((a, b) => b[campo] - a[campo] || a.nome.localeCompare(b.nome))
    .slice(0, 5);

  return {
    totalDuplas: duplas.length,
    regiaoMaisDuplas: regioes[0] || null,
    distritoMaisDuplas: distritos[0] || null,
    topEstudos: top('estudos'),
    topBatismos: top('batismos'),
    topVisitas: top('visitas'),
    topPessoasAlcancadas: top('pessoasAlcancadas'),
    porRegiao: consolidar((dupla) => ({ id: dupla.regiao, nome: dupla.regiao })),
    porDistrito: consolidar((dupla) => ({ id: dupla.distrito, nome: dupla.distrito })).slice(0, 8),
    indicadoresGerais: [
      { nome: 'Estudos', valor: duplasComIndicadores.reduce((acc, dupla) => acc + dupla.estudos, 0) },
      { nome: 'Visitas', valor: duplasComIndicadores.reduce((acc, dupla) => acc + dupla.visitas, 0) },
      { nome: 'Batismos', valor: duplasComIndicadores.reduce((acc, dupla) => acc + dupla.batismos, 0) },
      { nome: 'Pessoas', valor: duplasComIndicadores.reduce((acc, dupla) => acc + dupla.pessoasAlcancadas, 0) },
    ],
    cobertura: {
      estudoBiblico: {
        com: duplasComIndicadores.filter((dupla) => dupla.tiposEstudo.has('UNICO')).length,
        sem: duplasComIndicadores.filter((dupla) => !dupla.tiposEstudo.has('UNICO')).length,
      },
      classeBiblica: {
        com: duplasComIndicadores.filter((dupla) => dupla.tiposEstudo.has('CLASSE')).length,
        sem: duplasComIndicadores.filter((dupla) => !dupla.tiposEstudo.has('CLASSE')).length,
      },
      pontoEstudo: {
        com: duplasComIndicadores.filter((dupla) => dupla.tiposEstudo.has('PONTO')).length,
        sem: duplasComIndicadores.filter((dupla) => !dupla.tiposEstudo.has('PONTO')).length,
      },
    },
    topPerformance: ordenarPorValor(duplasComIndicadores.map((dupla) => ({
      id: dupla.id,
      nome: dupla.nome,
      valor: dupla.estudos + dupla.visitas + dupla.batismos + dupla.pessoasAlcancadas,
      motivo: `Pontuacao combinada: ${dupla.estudos} estudo(s) cadastrado(s), ${dupla.visitas} visita(s), ${dupla.batismos} batismo(s) e ${dupla.pessoasAlcancadas} pessoa(s) alcancada(s).`,
    }))).slice(0, 6),
  };
};

const criarDashboardClassesBiblicas = (classes = []) => {
  const classesComIndicadores = classes.map((classe) => {
    const estudantes = totalEstudantesDaClasse(classe);
    const dupla = classe.dupla || {};
    return {
      id: classe.id,
      nome: classe.nomeEstudante || 'Classe Biblica',
      duplaId: dupla.id,
      dupla: dupla.id ? nomeDupla(dupla) : 'Sem dupla',
      distrito: dupla.distrito?.nome || 'Sem distrito',
      regiao: dupla.distrito?.regiao?.nome || 'Sem regiao',
      estudantes,
      batismos: dupla.batismos || 0,
      licaoAtual: classe.licaoAtual || 0,
      serie: classe.serie || '',
    };
  });

  const regioes = agruparSoma(classes, (classe) => ({
    id: classe.dupla?.distrito?.regiao?.id,
    nome: classe.dupla?.distrito?.regiao?.nome,
  }));

  const distritos = agruparSoma(classes, (classe) => ({
    id: classe.dupla?.distrito?.id,
    nome: classe.dupla?.distrito?.nome,
  }));

  const duplasComClasse = new Set(classes.map((classe) => classe.duplaId).filter(Boolean));
  const top = (campo) => [...classesComIndicadores]
    .sort((a, b) => b[campo] - a[campo] || a.nome.localeCompare(b.nome))
    .slice(0, 5);

  return {
    totalClasses: classes.length,
    totalEstudantes: classesComIndicadores.reduce((acc, classe) => acc + classe.estudantes, 0),
    totalDuplasComClasse: duplasComClasse.size,
    regiaoMaisClasses: regioes[0] || null,
    distritoMaisClasses: distritos[0] || null,
    topEstudantes: top('estudantes'),
    topBatismos: top('batismos'),
    topLicaoAtual: top('licaoAtual'),
  };
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
      where: { nome: { in: REGIOES_OFICIAIS } },
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
    }).sort((a, b) => ordemRegiaoOficial(a.nome) - ordemRegiaoOficial(b.nome));
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
    if (query.tipoEstudo) where.tipoEstudo = query.tipoEstudo;
    if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };
    if (query.nome) {
      where.OR = [
        { nomeEstudante: { contains: query.nome, mode: 'insensitive' } },
        { participantes: { some: { nome: { contains: query.nome, mode: 'insensitive' } } } },
      ];
    }
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
        participantes: true,
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
      estudantesPontos,
      estudantesClasses,
      classesDuplas,
      escolaSabatinaResumo,
      escolaSabatinaCadastros,
      pequenosGruposPorDuplas,
      duplasDashboard,
      classesBiblicasDashboard,
    ] = await Promise.all([
      prisma.ataDupla.count(),
      prisma.estudoBiblico.count(),
      prisma.estudoBiblico.count({ where: { tipoEstudo: 'CLASSE' } }),
      prisma.estudoBiblico.count({ where: { tipoEstudo: 'PONTO' } }),
      prisma.estudoBiblico.count({ where: { tipoEstudo: 'UNICO' } }),
      prisma.participante.count({
        where: {
          estudo: {
            tipoEstudo: 'PONTO',
          },
        },
      }),
      prisma.participante.count({
        where: {
          estudo: {
            tipoEstudo: 'CLASSE',
          },
        },
      }),
      prisma.dupla.findMany({
        where: { classificacaoDupla: { not: null } },
        select: {
          classificacaoDupla: true,
          _count: { select: { estudosBiblicos: true } },
        },
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
      prisma.dupla.findMany({
        where: {
          distrito: {
            is: {
              regiao: { is: { nome: { in: REGIOES_OFICIAIS } } },
            },
          },
        },
        select: {
          id: true,
          liderNome: true,
          membro2Nome: true,
          bairro: true,
          batismos: true,
          pessoasAlcancadas: true,
          distrito: {
            select: {
              id: true,
              nome: true,
              regiao: { select: { id: true, nome: true } },
            },
          },
          _count: {
            select: {
              estudosBiblicos: true,
              acompanhamentos: true,
            },
          },
          estudosBiblicos: {
            select: {
              tipoEstudo: true,
            },
          },
        },
      }),
      prisma.estudoBiblico.findMany({
        where: {
          tipoEstudo: 'CLASSE',
          dupla: {
            is: {
              distrito: {
                is: {
                  regiao: { is: { nome: { in: REGIOES_OFICIAIS } } },
                },
              },
            },
          },
        },
        include: {
          participantes: { select: { id: true } },
          dupla: {
            select: {
              id: true,
              liderNome: true,
              membro2Nome: true,
              batismos: true,
              distrito: {
                select: {
                  id: true,
                  nome: true,
                  regiao: { select: { id: true, nome: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const classes = { A: 0, B: 0, C: 0 };
    classesDuplas.forEach((item) => {
      if (item.classificacaoDupla) {
        if (item.classificacaoDupla === 'A' && (item._count?.estudosBiblicos || 0) === 0) return;
        classes[item.classificacaoDupla] += 1;
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
        quantidadeEstudosIndividuais: pessoasEstudandoUnico,
        quantidadeEstudantesPontos: estudantesPontos,
        quantidadeEstudantesClasses: estudantesClasses,
        quantidadePessoasEstudando: pessoasEstudandoUnico + estudantesPontos + estudantesClasses,
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
      duplasMissionarias: criarDashboardDuplasMissionarias(duplasDashboard),
      classesBiblicasDetalhes: criarDashboardClassesBiblicas(classesBiblicasDashboard),
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

  async coordenadoresRegionais() {
    const coordenadores = await prisma.usuario.findMany({
      where: {
        perfil: 'COORDENADOR_REGIONAL',
        ativo: true,
        regiao: { is: { nome: { in: REGIOES_OFICIAIS } } },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        regiao: { select: { id: true, nome: true } },
        acompanhamentos: {
          orderBy: { dataSaida: 'desc' },
          include: {
            duplas: {
              include: {
                dupla: {
                  select: {
                    id: true,
                    liderNome: true,
                    membro2Nome: true,
                    bairro: true,
                    distrito: { select: { id: true, nome: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    const detalhes = coordenadores.map((coordenador) => {
      const assistencias = coordenador.acompanhamentos || [];
      const duplaIds = new Set();
      const distritos = {};
      let totalDuplasAcompanhadas = 0;

      assistencias.forEach((assistencia) => {
        totalDuplasAcompanhadas += assistencia.duplas.length;
        assistencia.duplas.forEach((item) => {
          const dupla = item.dupla;
          if (!dupla) return;
          duplaIds.add(dupla.id);
          const distritoId = dupla.distrito?.id || `sem-${dupla.distrito?.nome || 'distrito'}`;
          if (!distritos[distritoId]) {
            distritos[distritoId] = {
              id: dupla.distrito?.id || null,
              nome: dupla.distrito?.nome || 'Sem distrito',
              total: 0,
            };
          }
          distritos[distritoId].total += 1;
        });
      });

      const ultimoAcompanhamento = assistencias[0] || null;

      return {
        id: coordenador.id,
        nome: coordenador.nome,
        email: coordenador.email,
        regiao: coordenador.regiao?.nome || 'Sem região',
        regiaoId: coordenador.regiao?.id || null,
        totalAssistencias: assistencias.length,
        totalDuplasAcompanhadas,
        duplasUnicas: duplaIds.size,
        relatoriosPreenchidos: assistencias.filter((item) => String(item.observacoes || '').trim()).length,
        ultimoAcompanhamento: ultimoAcompanhamento?.dataSaida || null,
        distritoMaisVisitado: ordenarPorTotal(Object.values(distritos))[0] || null,
      };
    });

    const recentes = coordenadores
      .flatMap((coordenador) => coordenador.acompanhamentos.map((assistencia) => ({
        id: assistencia.id,
        dataSaida: assistencia.dataSaida,
        coordenador: coordenador.nome,
        regiao: coordenador.regiao?.nome || 'Sem região',
        totalDuplas: assistencia.duplas.length,
        relatorio: assistencia.observacoes || null,
        duplas: assistencia.duplas.map((item) => ({
          id: item.dupla?.id,
          nome: item.dupla ? nomeDupla(item.dupla) : 'Dupla não encontrada',
          bairro: item.dupla?.bairro || '',
        })),
      })))
      .sort((a, b) => new Date(b.dataSaida) - new Date(a.dataSaida))
      .slice(0, 8);

    const top = (campo) => [...detalhes]
      .sort((a, b) => b[campo] - a[campo] || a.nome.localeCompare(b.nome))
      .slice(0, 5);

    return {
      resumo: {
        totalCoordenadores: detalhes.length,
        totalAssistencias: detalhes.reduce((acc, item) => acc + item.totalAssistencias, 0),
        totalDuplasAcompanhadas: detalhes.reduce((acc, item) => acc + item.totalDuplasAcompanhadas, 0),
        totalRelatorios: detalhes.reduce((acc, item) => acc + item.relatoriosPreenchidos, 0),
      },
      coordenadores: detalhes,
      rankings: {
        porAssistencias: top('totalAssistencias'),
        porDuplasAcompanhadas: top('totalDuplasAcompanhadas'),
        porDuplasUnicas: top('duplasUnicas'),
        porRelatorios: top('relatoriosPreenchidos'),
      },
      recentes,
    };
  },

  async personalizado({ nivel, id }) {
    const whereDupla = {};
    const whereEstudo = {};
    const whereEscola = {};
    const whereIgreja = {};
    const escopo = Number(id);

    if (nivel === 'regiao') {
      whereDupla.distrito = { is: { regiaoId: escopo } };
      whereEstudo.dupla = { is: { distrito: { is: { regiaoId: escopo } } } };
      whereEscola.distrito = { is: { regiaoId: escopo } };
      whereIgreja.distrito = { is: { regiaoId: escopo } };
    } else if (nivel === 'distrito') {
      whereDupla.distritoId = escopo;
      whereEstudo.dupla = { is: { distritoId: escopo } };
      whereEscola.distritoId = escopo;
      whereIgreja.distritoId = escopo;
    } else if (nivel === 'igreja') {
      whereDupla.igrejaId = escopo;
      whereEstudo.dupla = { is: { igrejaId: escopo } };
      whereEscola.igrejaId = escopo;
      whereIgreja.id = escopo;
    } else {
      throw { status: 400, mensagem: 'Nivel de relatorio invalido.' };
    }

    const [
      totalIgrejas,
      duplas,
      estudos,
      escolaSabatinaCadastros,
      diretoresMissionarios,
    ] = await Promise.all([
      prisma.igreja.count({ where: whereIgreja }),
      prisma.dupla.findMany({
        where: whereDupla,
        select: {
          id: true,
          status: true,
          batismos: true,
          pessoasAlcancadas: true,
          tipoProjeto: true,
          igrejaId: true,
        },
      }),
      prisma.estudoBiblico.findMany({
        where: whereEstudo,
        include: { participantes: { select: { id: true } } },
      }),
      prisma.escolaSabatinaCadastro.findMany({
        where: whereEscola,
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
      prisma.usuario.count({
        where: {
          perfil: 'DIRETOR_MISSIONARIO_IGREJA',
          ativo: true,
          ...(nivel === 'igreja'
            ? { igrejaId: escopo }
            : { igreja: { is: whereIgreja } }),
        },
      }),
    ]);

    const somaEscola = escolaSabatinaCadastros.reduce((acc, item) => ({
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
    });

    return {
      escopo: { nivel, id: escopo },
      totalIgrejas,
      novaDupla: duplas.length,
      estudosBiblicos: estudos.filter((estudo) => estudo.tipoEstudo === 'UNICO').length,
      pontosEstudo: estudos.filter((estudo) => estudo.tipoEstudo === 'PONTO').length,
      classesBiblicas: estudos.filter((estudo) => estudo.tipoEstudo === 'CLASSE').length,
      pessoasEmPontosEClasses: estudos.reduce((acc, estudo) => acc + (estudo.participantes?.length || 0), 0),
      batismos: duplas.reduce((acc, dupla) => acc + (dupla.batismos || 0), 0),
      pessoasAlcancadas: duplas.reduce((acc, dupla) => acc + (dupla.pessoasAlcancadas || 0), 0),
      diretorMinisterioPessoal: totalIgrejas,
      diretoresMissionarios,
      escolaSabatina: somaEscola,
      duplasPorStatus: {
        ativas: duplas.filter((dupla) => dupla.status === 'ATIVA').length,
        pendentes: duplas.filter((dupla) => dupla.status === 'PENDENTE').length,
        inativas: duplas.filter((dupla) => dupla.status === 'INATIVA').length,
      },
    };
  },
};

module.exports = RelatorioModel;
