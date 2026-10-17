const DistritoModel = require('../models/distrito.model');
const { montarEscopo, combinar, validarDistrito, validarRegiao } = require('./escopo.service');
const { PERFIS } = require('../middlewares/auth');
const { registrarAtividade } = require('./notificacoesAtividade.service');

const limitarDetalhesAoDiretor = (distrito, usuario, igrejaId) => {
  if (!distrito || usuario?.perfil !== PERFIS.DIRETOR_MISSIONARIO_IGREJA) return distrito;
  const id = Number(igrejaId || usuario.igrejaId);
  const duplas = (distrito.duplas || []).filter((dupla) => Number(dupla.igrejaId || dupla.igreja?.id) === id);
  return {
    ...distrito,
    igrejas: (distrito.igrejas || []).filter((igreja) => Number(igreja.id) === id),
    duplas,
    _count: { ...(distrito._count || {}), duplas: duplas.length },
  };
};

const DistritoService = {
  async listar(usuario, query = {}) {
    const { regiaoId, nome } = query;
    const escopo = await montarEscopo(usuario);
    const condicoes = [escopo.distrito];

    if (regiaoId) condicoes.push({ regiaoId: Number(regiaoId) });
    if (nome) condicoes.push({ nome: { contains: nome, mode: 'insensitive' } });

    const distritos = await DistritoModel.findAll(combinar(...condicoes));
    return distritos.map((distrito) => limitarDetalhesAoDiretor(distrito, usuario, escopo.igrejaId));
  },

  async buscarPorId(id, usuario) {
    await validarDistrito(usuario, id);
    const distrito = await DistritoModel.findById(id);
    if (!distrito) {
      throw { status: 404, mensagem: 'Distrito não encontrado.' };
    }
    const escopo = await montarEscopo(usuario);
    return limitarDetalhesAoDiretor(distrito, usuario, escopo.igrejaId);
  },

  async criar(data, usuario) {
    validarRegiao(usuario, data.regiaoId);
    const distrito = await DistritoModel.create({
      nome: data.nome,
      regiaoId: Number(data.regiaoId),
    });
    await registrarAtividade({
      ator: usuario, distritoId: distrito.id, titulo: 'Novo distrito cadastrado',
      mensagem: `O distrito ${distrito.nome} foi cadastrado.`, url: '/distritos',
    });
    return distrito;
  },

  async atualizar(id, data, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    const campos = {};
    if (data.nome !== undefined) campos.nome = data.nome;
    if (data.membros !== undefined) campos.membros = Number(data.membros);
    if (data.fotoPastor !== undefined) campos.fotoPastor = data.fotoPastor;
    if (data.nomePastor !== undefined) campos.nomePastor = data.nomePastor;
    if (data.cargoPastor !== undefined) campos.cargoPastor = data.cargoPastor;
    if (data.telefonePastor !== undefined) campos.telefonePastor = data.telefonePastor;
    if (data.enderecoPastor !== undefined) campos.enderecoPastor = data.enderecoPastor;
    if (data.dataNascimentoPastor !== undefined) {
      campos.dataNascimentoPastor = data.dataNascimentoPastor
        ? new Date(data.dataNascimentoPastor)
        : null;
    }
    const atualizado = await DistritoModel.update(id, campos);
    const relevantes = ['nome', 'membros', 'nomePastor', 'cargoPastor', 'telefonePastor', 'enderecoPastor'];
    if (relevantes.some((campo) => anterior[campo] !== atualizado[campo])) {
      await registrarAtividade({
        ator: usuario, distritoId: atualizado.id, titulo: 'Dados do distrito atualizados',
        mensagem: `Os dados do distrito ${atualizado.nome} foram atualizados.`, url: '/distritos',
      });
    }
    return atualizado;
  },

  async remover(id, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    const removido = await DistritoModel.remove(id);
    await registrarAtividade({
      ator: usuario, regiaoId: anterior.regiaoId, titulo: 'Distrito removido',
      mensagem: `O distrito ${anterior.nome} foi removido.`, url: '/distritos',
    });
    return removido;
  },
};

module.exports = DistritoService;
