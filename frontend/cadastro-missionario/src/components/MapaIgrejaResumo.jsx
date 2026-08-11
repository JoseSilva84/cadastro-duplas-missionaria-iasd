const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const formatarData = (valor) => {
  if (!valor) return 'Nao informado';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Nao informado';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export const somarMapasIgreja = (mapas = []) => {
  const lista = Array.isArray(mapas) ? mapas : mapas ? [mapas] : [];
  return lista.reduce((acc, mapa) => {
    const acoes = Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : [];
    return {
      quantidadePequenosGrupos: acc.quantidadePequenosGrupos + Number(mapa.quantidadePequenosGrupos || 0),
      semanaSanta: acc.semanaSanta + Number(mapa.semanaSanta || 0),
      classeBiblica: acc.classeBiblica + Number(mapa.classeBiblica || 0),
      aventureiros: acc.aventureiros + Number(mapa.aventureiros || 0),
      desbravadores: acc.desbravadores + Number(mapa.desbravadores || 0),
      quantidadeDuplasMissionarias: acc.quantidadeDuplasMissionarias + Number(mapa.igreja?._count?.duplas || 0),
      acoesMissionarias: [...acc.acoesMissionarias, ...acoes],
    };
  }, {
    quantidadePequenosGrupos: 0,
    semanaSanta: 0,
    classeBiblica: 0,
    aventureiros: 0,
    desbravadores: 0,
    quantidadeDuplasMissionarias: 0,
    acoesMissionarias: [],
  });
};

const cardsBase = [
  ['Pequeno Grupo', 'quantidadePequenosGrupos', '#C9963A'],
  ['Semana Santa', 'semanaSanta', '#0d9488'],
  ['Classe Biblica', 'classeBiblica', '#7c3aed'],
  ['Aventureiros', 'aventureiros', '#0284c7'],
  ['Duplas Missionarias', 'quantidadeDuplasMissionarias', '#1A3A6B'],
  ['Desbravadores', 'desbravadores', '#dc2626'],
];

export default function MapaIgrejaResumo({ mapas, titulo = 'Mapa da Igreja', subtitulo, compacto = false }) {
  const lista = Array.isArray(mapas) ? mapas : mapas ? [mapas] : [];
  const resumo = somarMapasIgreja(lista);
  const acoes = resumo.acoesMissionarias;

  return (
    <section className="group rounded-xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/60 hover:shadow-2xl hover:shadow-[#1A3A6B]/10 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">Relatorio analitico</p>
          <h3 className="text-lg font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h3>
          {subtitulo && <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>}
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
          {lista.length} mapa{lista.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${compacto ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-6'}`}>
        {cardsBase.map(([label, campo, cor]) => (
          <div key={campo} className="group/card rounded-lg border bg-slate-50 p-3 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:shadow-lg" style={{ borderColor: `${cor}30` }}>
            <div className="mb-3 h-1.5 w-10 rounded-full transition-all duration-300 group-hover/card:w-14" style={{ backgroundColor: cor }} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors duration-300 group-hover/card:text-[#1A3A6B]">{label}</p>
            <p className="mt-1 text-2xl font-bold transition-transform duration-300 group-hover/card:translate-x-0.5" style={{ color: cor }}>{numero(resumo[campo])}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all duration-300 hover:border-[#C9963A]/40 hover:bg-white hover:shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#1A3A6B]">Acoes missionarias</p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{acoes.length}</span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {acoes.map((acao, index) => (
            <div key={`${acao.nome}-${index}`} className="rounded-lg bg-white p-3 text-sm shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <p className="font-bold text-[#1A3A6B]">{acao.nome}</p>
              <p className="mt-1 text-xs text-slate-400">{acao.responsavel || 'Sem responsavel'}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">{formatarData(acao.data)}</p>
            </div>
          ))}
          {acoes.length === 0 && (
            <p className="rounded-lg bg-white p-3 text-sm text-slate-400 md:col-span-2 xl:col-span-3">
              Nenhuma acao missionaria cadastrada.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
