// Model de Usuário — Operações no banco de dados
const prisma = require('../lib/prisma');

const UsuarioModel = {
  // Busca usuário por e-mail (inclui dados de região, distrito e dupla)
  async findByEmail(email) {
    return prisma.usuario.findUnique({
      where: { email },
      include: {
        regiao: true,
        distrito: true,
        dupla: { select: { id: true, liderNome: true, membro2Nome: true, distritoId: true } },
      },
    });
  },

  // Busca usuário por ID
  async findById(id) {
    return prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        regiaoId: true,
        distritoId: true,
        duplaId: true,
        regiao: { select: { id: true, nome: true } },
        distrito: { select: { id: true, nome: true } },
        dupla: { select: { id: true, liderNome: true, membro2Nome: true } },
      },
    });
  },

  // Lista todos os usuários (admin)
  async findAll(filtro = {}) {
    return prisma.usuario.findMany({
      where: filtro,
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
        regiaoId: true,
        distritoId: true,
        duplaId: true,
        regiao: { select: { id: true, nome: true } },
        distrito: { select: { id: true, nome: true } },
        dupla: { select: { id: true, liderNome: true } },
      },
      orderBy: { nome: 'asc' },
    });
  },

  // Cria novo usuário
  async create(data) {
    return prisma.usuario.create({ data });
  },

  // Atualiza usuário por ID
  async update(id, data) {
    return prisma.usuario.update({
      where: { id: Number(id) },
      data,
    });
  },

  // Desativa usuário (soft delete)
  async deactivate(id) {
    return prisma.usuario.update({
      where: { id: Number(id) },
      data: { ativo: false },
    });
  },

  // Exclui usuário definitivamente
  async remove(id) {
    const usuarioId = Number(id);
    return prisma.$transaction(async (tx) => {
      await tx.escolaSabatinaCadastro.updateMany({
        where: { criadoPorId: usuarioId },
        data: { criadoPorId: null },
      });
      await tx.acompanhamentoDupla.deleteMany({
        where: { coordenadorId: usuarioId },
      });
      return tx.usuario.delete({
        where: { id: usuarioId },
      });
    });
  },
};

module.exports = UsuarioModel;
