const ROTULOS_PERFIL = {
  SUPER_ADMIN: 'Super Administrador',
  ADMINISTRADOR: 'Administrador',
  PASTOR_REGIONAL: 'Pastor Departamental Regional',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  PASTOR_DISTRITAL: 'Pastor Distrital',
  DIRETOR_MISSIONARIO_IGREJA: 'Diretor Missionário',
  DUPLA_MISSIONARIA: 'Dupla Missionária',
};

const montarIdentidadeUsuario = (usuario) => {
  const identidade = {
    funcao: ROTULOS_PERFIL[usuario?.perfil] || usuario?.perfil || 'Usuário',
    nome: usuario?.nome || '',
    foto: null,
    regiao: null,
    distrito: null,
    igreja: null,
  };

  if (usuario?.perfil === 'PASTOR_REGIONAL') {
    identidade.nome = usuario.regiao?.nomeConselheiro || usuario.nome;
    identidade.foto = usuario.regiao?.fotoConselheiro || null;
    identidade.regiao = usuario.regiao?.nome || null;
  } else if (usuario?.perfil === 'COORDENADOR_REGIONAL') {
    identidade.regiao = usuario.regiao?.nome || null;
  } else if (usuario?.perfil === 'PASTOR_DISTRITAL') {
    identidade.nome = usuario.distrito?.nomePastor || usuario.nome;
    identidade.foto = usuario.distrito?.fotoPastor || null;
    identidade.distrito = usuario.distrito?.nome || null;
    identidade.regiao = usuario.distrito?.regiao?.nome || null;
  } else if (usuario?.perfil === 'DIRETOR_MISSIONARIO_IGREJA') {
    identidade.nome = usuario.igreja?.nomeDiretorMinisterioPessoal || usuario.nome;
    identidade.foto = usuario.igreja?.fotoDiretorMinisterioPessoal || null;
    identidade.igreja = usuario.igreja?.nome || null;
    identidade.distrito = usuario.igreja?.distrito?.nome || null;
    identidade.regiao = usuario.igreja?.distrito?.regiao?.nome || null;
  } else if (usuario?.perfil === 'DUPLA_MISSIONARIA') {
    identidade.nome = usuario.dupla?.liderNome || usuario.nome;
    identidade.foto = usuario.dupla?.fotoLider || null;
    identidade.igreja = usuario.dupla?.igreja?.nome || null;
    identidade.distrito = usuario.dupla?.distrito?.nome || null;
    identidade.regiao = usuario.dupla?.distrito?.regiao?.nome
      || usuario.dupla?.igreja?.distrito?.regiao?.nome
      || null;
  }

  return identidade;
};

module.exports = { montarIdentidadeUsuario, ROTULOS_PERFIL };
