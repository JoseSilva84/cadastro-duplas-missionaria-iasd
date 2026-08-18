const whereEstudoBatismoConfirmado = {
  motivoEncerramento: { equals: 'BATISMO', mode: 'insensitive' },
  OR: [
    { encerrado: true },
    { statusEstudo: 'ENCERRADO' },
  ],
};

const contarPessoasBatizadasNoEstudo = (estudo = {}) => {
  const participantes = estudo.participantes?.length ?? estudo._count?.participantes ?? 0;
  return participantes > 0 ? participantes : 1;
};

const totalBatismosConfirmados = (estudos = []) => estudos
  .filter((estudo) => String(estudo?.motivoEncerramento || '').toUpperCase() === 'BATISMO')
  .reduce((acc, estudo) => acc + contarPessoasBatizadasNoEstudo(estudo), 0);

const anexarBatismosConfirmadosNaDupla = (dupla = {}) => {
  const batismosConfirmados = totalBatismosConfirmados(dupla.estudosBiblicos || []);
  return {
    ...dupla,
    batismosExperiencia: dupla.batismos || 0,
    batismosConfirmados,
    batismos: batismosConfirmados,
  };
};

module.exports = {
  whereEstudoBatismoConfirmado,
  contarPessoasBatizadasNoEstudo,
  totalBatismosConfirmados,
  anexarBatismosConfirmadosNaDupla,
};
