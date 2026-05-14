// Model de Usuário — Operações no banco de dados
const prisma = require('../lib/prisma');

const UsuarioModel = {
  // Busca usuário por e-mail
  async findByEmail(email) {
    return prisma.usuario.findUnique({
      where: { email },
      include: { regiao: true, distrito: true },
    });
  },

  // Busca usuário por ID
  async findById(id) {
    return prisma.usuario.findUnique({
      where: { id },
      include: { regiao: true, distrito: true },
      select: {
        id: true, nome: true, email: true, perfil: true,
        regiao: true, distrito: true, ativo: true,
      },
    });
  },

  // Lista todos os usuários (admin)
  async findAll() {
    return prisma.usuario.findMany({
      select: {
        id: true, nome: true, email: true, perfil: true,
        ativo: true, criadoEm: true,
        regiao: { select: { id: true, nome: true } },
        distrito: { select: { id: true, nome: true } },
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
};

module.exports = UsuarioModel;
