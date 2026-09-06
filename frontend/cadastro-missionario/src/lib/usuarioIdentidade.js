export const doisPrimeirosNomes = (nome = '') => {
  const original = String(nome).trim();
  const nomeSemTitulo = original.includes(' - ')
    ? original
    : original.replace(/^(pr\.?|pastor|pastora|anc\.?)\s+/i, '');
  const partes = nomeSemTitulo.split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).join(' ') || 'Nome não informado';
};

export const funcaoUsuario = (usuario) => usuario?.identidade?.funcao || usuario?.perfil || 'Usuário';

export const nomePessoaUsuario = (usuario) => doisPrimeirosNomes(usuario?.identidade?.nome || usuario?.nome);

export const escopoUsuario = (usuario) => {
  const identidade = usuario?.identidade || {};
  if (['SUPER_ADMIN', 'ADMINISTRADOR'].includes(usuario?.perfil)) return [];
  return [identidade.regiao, identidade.distrito, identidade.igreja].filter(Boolean);
};
