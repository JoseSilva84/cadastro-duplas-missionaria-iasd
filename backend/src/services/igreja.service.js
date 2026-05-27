const IgrejaModel = require('../models/igreja.model');
const { montarEscopo, combinar, validarIgreja, validarDistrito } = require('./escopo.service');

const IgrejaService = {
  async listar(usuario, query = {}) {
    const escopo = await montarEscopo(usuario);
    const condicoes = [escopo.igreja];

    if (query.distritoId) condicoes.push({ distritoId: Number(query.distritoId) });
    if (query.regiaoId) condicoes.push({ distrito: { is: { regiaoId: Number(query.regiaoId) } } });

    return IgrejaModel.findAll(combinar(...condicoes));
  },

  async buscarPorId(id, usuario) {
    await validarIgreja(usuario, id);
    const igreja = await IgrejaModel.findById(id);
    if (!igreja) {
      throw { status: 404, mensagem: 'Igreja não encontrada.' };
    }
    return igreja;
  },

  async criar(data, usuario) {
    await validarDistrito(usuario, data.distritoId);
    return IgrejaModel.create(data);
  },

  async atualizar(id, data, usuario) {
    await this.buscarPorId(id, usuario);
    if (data.distritoId !== undefined) await validarDistrito(usuario, data.distritoId);

    const campos = {};
    if (data.nome !== undefined) campos.nome = data.nome;
    if (data.membros !== undefined) campos.membros = Number(data.membros);
    if (data.distritoId !== undefined) campos.distritoId = Number(data.distritoId);
    if (data.endereco !== undefined) campos.endereco = data.endereco;
    if (data.fotoIgreja !== undefined) campos.fotoIgreja = data.fotoIgreja;
    if (data.fotoDiretorMinisterioPessoal !== undefined) campos.fotoDiretorMinisterioPessoal = data.fotoDiretorMinisterioPessoal;
    if (data.nomeDiretorMinisterioPessoal !== undefined) campos.nomeDiretorMinisterioPessoal = data.nomeDiretorMinisterioPessoal;
    if (data.enderecoDiretorMinisterioPessoal !== undefined) campos.enderecoDiretorMinisterioPessoal = data.enderecoDiretorMinisterioPessoal;
    if (data.whatsappDiretorMinisterioPessoal !== undefined) campos.whatsappDiretorMinisterioPessoal = data.whatsappDiretorMinisterioPessoal;
    if (data.dataNascimentoDiretorMinisterioPessoal !== undefined) {
      campos.dataNascimentoDiretorMinisterioPessoal = data.dataNascimentoDiretorMinisterioPessoal
        ? new Date(data.dataNascimentoDiretorMinisterioPessoal)
        : null;
    }
    if (data.fotoCoordInteressados !== undefined) campos.fotoCoordInteressados = data.fotoCoordInteressados;
    if (data.nomeCoordInteressados !== undefined) campos.nomeCoordInteressados = data.nomeCoordInteressados;
    if (data.cargoCoordInteressados !== undefined) campos.cargoCoordInteressados = data.cargoCoordInteressados;
    if (data.telefoneCoordInteressados !== undefined) campos.telefoneCoordInteressados = data.telefoneCoordInteressados;
    if (data.enderecoCoordInteressados !== undefined) campos.enderecoCoordInteressados = data.enderecoCoordInteressados;
    if (data.dataNascimentoCoordInteressados !== undefined) {
      campos.dataNascimentoCoordInteressados = data.dataNascimentoCoordInteressados
        ? new Date(data.dataNascimentoCoordInteressados)
        : null;
    }
    return IgrejaModel.update(id, campos);
  },

  async remover(id, usuario) {
    await this.buscarPorId(id, usuario);
    return IgrejaModel.remove(id);
  },
};

module.exports = IgrejaService;
