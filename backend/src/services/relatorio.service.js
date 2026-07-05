const RelatorioModel = require('../models/relatorio.model');
const EstudoBiblicoService = require('./estudoBiblico.service');
const prisma = require('../lib/prisma');
const { ehAdmin } = require('../middlewares/auth');
const { montarEscopo, validarDistrito, validarIgreja } = require('./escopo.service');

const RelatorioService = {
  async resumo(usuario) {
    if (!usuario || ehAdmin(usuario.perfil)) {
      return RelatorioModel.resumo();
    }

    const escopo = await montarEscopo(usuario);
    const whereDupla = escopo.dupla;
    const whereEstudo = escopo.estudo;

    const [totalDuplas, totalAtivas, totalPendentes, totalInativas, totalPessoas, estudosAtivos, evangelismosAtivos, porProjeto, classes] = await Promise.all([
      prisma.dupla.count({ where: whereDupla }),
      prisma.dupla.count({ where: { AND: [whereDupla, { status: 'ATIVA' }] } }),
      prisma.dupla.count({ where: { AND: [whereDupla, { status: 'PENDENTE' }] } }),
      prisma.dupla.count({ where: { AND: [whereDupla, { status: 'INATIVA' }] } }),
      prisma.dupla.aggregate({ where: whereDupla, _sum: { pessoasAlcancadas: true, batismos: true } }),
      prisma.dupla.count({ where: { AND: [whereDupla, { statusEstudoBiblico: 'ATIVO' }] } }),
      prisma.dupla.count({ where: { AND: [whereDupla, { statusEvangelismo: 'ATIVO' }] } }),
      prisma.dupla.groupBy({ by: ['tipoProjeto'], where: whereDupla, _count: { tipoProjeto: true } }),
      prisma.estudoBiblico.count({ where: { AND: [whereEstudo, { tipoEstudo: 'CLASSE' }] } }),
    ]);

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
      classesBiblicas: { A: { total: 0, igrejas: [] }, B: { total: 0, igrejas: [] }, C: { total: classes, igrejas: [] } },
    };
  },

  async resumoGlobal() {
    return RelatorioModel.resumo();
  },

  async porRegiao(usuario) {
    const regioes = await RelatorioModel.porRegiao();
    if (!usuario || ehAdmin(usuario.perfil)) return regioes;
    if (usuario.regiaoId) return regioes.filter((regiao) => regiao.id === Number(usuario.regiaoId));
    return [];
  },

  async porDistrito(distritoId, usuario) {
    await validarDistrito(usuario, distritoId);
    const resultado = await RelatorioModel.porDistrito(distritoId);
    if (!resultado) {
      throw { status: 404, mensagem: 'Distrito não encontrado.' };
    }
    return resultado;
  },

  async porIgreja(igrejaId, usuario) {
    await validarIgreja(usuario, igrejaId);
    const resultado = await RelatorioModel.porIgreja(igrejaId);
    if (!resultado) {
      throw { status: 404, mensagem: 'Igreja não encontrada.' };
    }
    return resultado;
  },

  async estudosBiblicos(query, usuario) {
    const escopo = await montarEscopo(usuario);
    const estudos = await EstudoBiblicoService.listar(query, usuario);
    let duplasComEstudoNaoRegistrado = [];
    try {
      const duplasComEstudoEmAndamento = await prisma.dupla.findMany({
        where: combinar(escopo.dupla, { estudoAtualEmAndamento: true }),
        select: {
          id: true,
          liderNome: true,
          membro2Nome: true,
          status: true,
          estudoAtualEmAndamento: true,
          igreja: { select: { id: true, nome: true } },
          distrito: { select: { id: true, nome: true, regiao: { select: { id: true, nome: true } } } },
          _count: { select: { estudosBiblicos: true } },
        },
        orderBy: [{ liderNome: 'asc' }, { membro2Nome: 'asc' }],
      });
      duplasComEstudoNaoRegistrado = duplasComEstudoEmAndamento.filter((dupla) => (dupla._count?.estudosBiblicos || 0) === 0);
    } catch (err) {
      console.error('Erro ao calcular duplas com estudo nao registrado.', err);
    }
    const totalEstudantes = estudos.reduce((acc, estudo) => {
      if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)) return acc + (estudo.participantes?.length || 0);
      return acc + 1;
    }, 0);
    const porSerieMap = estudos.reduce((acc, estudo) => {
      const serie = estudo.serie || 'Sem série';
      acc[serie] = (acc[serie] || 0) + 1;
      return acc;
    }, {});
    const porSerie = Object.entries(porSerieMap).map(([serie, total]) => ({
      serie,
      _count: { serie: total },
    }));
    return {
      total: estudos.length,
      totalEstudantes,
      porSerie,
      estudos,
      totalDuplasComEstudoNaoRegistrado: duplasComEstudoNaoRegistrado.length,
      duplasComEstudoNaoRegistrado,
    };
  },

  async dashboardAssociacao() {
    return RelatorioModel.dashboardAssociacao();
  },

  async atualizarEscolaSabatinaResumo(data) {
    return RelatorioModel.atualizarEscolaSabatinaResumo(data);
  },

  async coordenadoresRegionais() {
    return RelatorioModel.coordenadoresRegionais();
  },

  async personalizado(query, usuario) {
    if (!ehAdmin(usuario?.perfil)) {
      throw { status: 403, mensagem: 'Acesso restrito a administradores.' };
    }
    const { nivel, regiaoId, distritoId, igrejaId } = query || {};
    const id = nivel === 'regiao' ? regiaoId : nivel === 'distrito' ? distritoId : igrejaId;
    if (!['regiao', 'distrito', 'igreja'].includes(nivel) || !id) {
      throw { status: 400, mensagem: 'Informe nivel e o identificador do escopo.' };
    }
    return RelatorioModel.personalizado({ nivel, id });
  },
};

module.exports = RelatorioService;
