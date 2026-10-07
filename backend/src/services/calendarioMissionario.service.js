const CalendarioMissionarioModel = require('../models/calendarioMissionario.model');
const { validarIgreja } = require('./escopo.service');

const STATUS = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA'];

const texto = (valor) => {
  const normalizado = String(valor || '').trim();
  return normalizado || null;
};

const numeroNaoNegativo = (valor, padrao = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : padrao;
};

const dataOuNull = (valor, ano) => {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw { status: 400, mensagem: 'Informe datas validas no calendario missionario.' };
  }
  if (data.getUTCFullYear() !== ano) {
    throw { status: 400, mensagem: `As datas do calendario devem estar em ${ano}.` };
  }
  return data;
};

const anoValido = (valor) => {
  const ano = Number(valor);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    throw { status: 400, mensagem: 'Informe um ano valido.' };
  }
  return ano;
};

const normalizarEventos = (eventos, ano) => {
  if (!Array.isArray(eventos)) throw { status: 400, mensagem: 'Eventos deve ser uma lista.' };
  return eventos
    .filter((evento) => texto(evento?.nome))
    .map((evento) => ({
      nome: texto(evento.nome),
      tipo: texto(evento.tipo),
      dataInicio: dataOuNull(evento.dataInicio, ano),
      dataFim: dataOuNull(evento.dataFim, ano),
      acoes: (Array.isArray(evento.acoes) ? evento.acoes : [])
        .filter((acao) => texto(acao?.nome))
        .map((acao) => ({
          nome: texto(acao.nome),
          departamento: texto(acao.departamento),
          responsavel: texto(acao.responsavel),
          data: dataOuNull(acao.data, ano),
          planejamento: texto(acao.planejamento),
          status: STATUS.includes(acao.status) ? acao.status : 'PLANEJADA',
          orcamento: (Array.isArray(acao.orcamento) ? acao.orcamento : [])
            .filter((item) => texto(item?.descricao))
            .map((item) => ({
              descricao: texto(item.descricao),
              quantidade: numeroNaoNegativo(item.quantidade, 1),
              valorUnit: numeroNaoNegativo(item.valorUnit, 0),
            })),
        })),
    }));
};

const formatar = (calendario, igrejaId, ano) => ({
  igrejaId,
  ano,
  eventos: (calendario?.eventos || []).map((evento) => ({
    id: evento.id,
    nome: evento.nome,
    tipo: evento.tipo,
    dataInicio: evento.dataInicio,
    dataFim: evento.dataFim,
    acoes: evento.acoes.map((acao) => ({
      id: acao.id,
      nome: acao.nome,
      departamento: acao.departamento,
      responsavel: acao.responsavel,
      data: acao.data,
      planejamento: acao.planejamento,
      status: acao.status,
      orcamento: acao.orcamento.map((item) => ({
        id: item.id,
        descricao: item.descricao,
        quantidade: Number(item.quantidade),
        valorUnit: Number(item.valorUnit),
      })),
    })),
  })),
});

const CalendarioMissionarioService = {
  async obter(usuario, query = {}) {
    const igrejaId = Number(query.igrejaId);
    if (!igrejaId) throw { status: 400, mensagem: 'Igreja obrigatoria.' };
    const ano = anoValido(query.ano || 2027);
    await validarIgreja(usuario, igrejaId);
    const calendario = await CalendarioMissionarioModel.buscar(igrejaId, ano);
    return formatar(calendario, igrejaId, ano);
  },

  async salvar(usuario, data = {}) {
    const igrejaId = Number(data.igrejaId);
    if (!igrejaId) throw { status: 400, mensagem: 'Igreja obrigatoria.' };
    const ano = anoValido(data.ano || 2027);
    await validarIgreja(usuario, igrejaId);
    const eventos = normalizarEventos(data.eventos, ano);
    const calendario = await CalendarioMissionarioModel.substituir(igrejaId, ano, eventos);
    return formatar(calendario, igrejaId, ano);
  },
};

module.exports = CalendarioMissionarioService;
