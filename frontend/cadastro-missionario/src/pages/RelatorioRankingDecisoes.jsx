import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';
import LoadingState from '../components/LoadingState';
import BackButton from '../components/BackButton';

const tipoLabel = {
  UNICO: 'Estudante Biblico',
  PONTO: 'Ponto de Estudo',
  CLASSE: 'Classe Biblica',
};

const classeOrdem = {
  A: 0,
  B: 1,
  C: 2,
  SEM: 3,
};

const classeConfig = {
  A: { label: 'Classe A', cor: '#047857', bg: '#ecfdf5' },
  B: { label: 'Classe B', cor: '#C9963A', bg: '#fffbeb' },
  C: { label: 'Classe C', cor: '#b91c1c', bg: '#fef2f2' },
  SEM: { label: 'Sem classe', cor: '#64748b', bg: '#f8fafc' },
};

const nomeDupla = (dupla) => {
  if (!dupla) return 'Sem dupla';
  return `${dupla.liderNome || 'Lider'} + ${dupla.membro2Nome || 'Membro'}`;
};

const batismosDaDupla = (dupla) => Number(dupla?.batismos || 0);

const totalLicoes = (serieId) => SERIES_ESTUDO.find((serie) => serie.id === serieId)?.licoes.length || 0;

const calcularProgresso = (estudo) => {
  const total = totalLicoes(estudo.serie);
  if (!total) return 0;
  return Math.min(100, Math.round((Number(estudo.licaoAtual || 0) / total) * 100));
};

const BadgeClasse = ({ classe }) => {
  const cfg = classeConfig[classe] || classeConfig.SEM;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ color: cfg.cor, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
};

export default function RelatorioRankingDecisoes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const [dados, setDados] = useState({ estudos: [] });
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [duplaModal, setDuplaModal] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get('/relatorios/estudos-biblicos'),
      api.get('/duplas'),
    ])
      .then(([relatorioRes, duplasRes]) => {
        if (!ativo) return;
        setDados(relatorioRes.data || { estudos: [] });
        setDuplas(Array.isArray(duplasRes.data) ? duplasRes.data : []);
      })
      .catch((err) => {
        if (ativo) setErro(err.response?.data?.erro || 'Erro ao carregar relatorio.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, []);

  const batismosPorDupla = useMemo(() => (
    duplas
      .filter((dupla) => batismosDaDupla(dupla) > 0)
      .map((dupla) => ({
        id: dupla.id,
        nome: nomeDupla(dupla),
        batismos: batismosDaDupla(dupla),
        igreja: dupla.igreja?.nome || 'Sem igreja',
        distrito: dupla.distrito?.nome || 'Sem distrito',
        regiao: dupla.distrito?.regiao?.nome || dupla.regiaoNome || 'Sem regiao',
      }))
      .sort((a, b) => b.batismos - a.batismos || a.nome.localeCompare(b.nome))
  ), [duplas]);

  const ranking = useMemo(() => {
    const duplasPorId = new Map(duplas.map((dupla) => [String(dupla.id), dupla]));
    const estudos = dados.estudos || [];
    const estudantes = estudos.flatMap((estudo) => {
      const duplaCompleta = duplasPorId.get(String(estudo.dupla?.id)) || estudo.dupla;
      const base = {
        estudoId: estudo.id,
        tipoEstudo: estudo.tipoEstudo || 'UNICO',
        serie: estudo.serie,
        licaoAtual: Number(estudo.licaoAtual || 0),
        progresso: calcularProgresso(estudo),
        igreja: duplaCompleta?.igreja?.nome || estudo.dupla?.igreja?.nome || 'Sem igreja',
        distrito: duplaCompleta?.distrito?.nome || estudo.dupla?.distrito?.nome || 'Sem distrito',
        duplaId: duplaCompleta?.id || estudo.dupla?.id || null,
        dupla: nomeDupla(duplaCompleta),
        batismosDupla: batismosDaDupla(duplaCompleta),
      };

      if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)) {
        return (estudo.participantes || []).map((participante) => ({
          ...base,
          id: `${estudo.id}-${participante.id}`,
          nome: participante.nome || 'Sem nome',
          classificacao: participante.classificacaoInteressado || 'SEM',
        }));
      }

      return [{
        ...base,
        id: String(estudo.id),
        nome: estudo.nomeEstudante || 'Sem nome',
        classificacao: estudo.classificacaoInteressado || 'SEM',
      }];
    });

    return estudantes.sort((a, b) => {
      const classeA = classeOrdem[a.classificacao] ?? classeOrdem.SEM;
      const classeB = classeOrdem[b.classificacao] ?? classeOrdem.SEM;
      return classeA - classeB
        || b.progresso - a.progresso
        || b.licaoAtual - a.licaoAtual
        || a.nome.localeCompare(b.nome);
    });
  }, [dados, duplas]);

  const resumo = useMemo(() => {
    const classificados = ranking.filter((item) => ['A', 'B', 'C'].includes(item.classificacao));
    const decisoesClasseA = ranking.filter((item) => item.classificacao === 'A').length;
    const batismosRegistrados = batismosPorDupla.reduce((acc, dupla) => acc + dupla.batismos, 0);
    const media = classificados.length
      ? Math.round(classificados.reduce((acc, item) => acc + item.progresso, 0) / classificados.length)
      : 0;

    return {
      batismosRegistrados,
      decisoesClasseA,
      aguardandoConfirmacao: Math.max(decisoesClasseA - batismosRegistrados, 0),
      media,
    };
  }, [ranking, batismosPorDupla]);

  const baseRelatorio = isDireto ? '/direto/relatorios/estudos-geral' : '/relatorios/estudos-geral';
  const prefix = isDireto ? '/direto' : '';
  const estudantesClasseADaDupla = useMemo(() => {
    if (!duplaModal) return [];
    return ranking.filter((item) => (
      String(item.duplaId) === String(duplaModal.id) && item.classificacao === 'A'
    ));
  }, [duplaModal, ranking]);

  if (carregando) return <LoadingState mensagem="Carregando relatorio..." />;

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <BackButton fallbackTo={baseRelatorio} className="mb-3" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Relatorio</p>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Batismos e Decisoes
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Batismos registrados pelas duplas e estudantes classificados por decisao nos estudos biblicos.
            </p>
          </div>
          <button type="button" className="btn-outline px-4 py-2" onClick={() => navigate(baseRelatorio)}>Voltar</button>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        {erro && (
          <div className="card border border-red-100 text-red-600 text-sm">{erro}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Batismos registrados', resumo.batismosRegistrados, '#0d9488'],
            ['Decisoes Classe A', resumo.decisoesClasseA, '#047857'],
            ['Aguardando confirmacao', resumo.aguardandoConfirmacao, '#C9963A'],
            ['Progresso medio', `${resumo.media}%`, '#1A3A6B'],
          ].map(([label, valor, cor]) => (
            <div key={label} className="card">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: cor }}>{valor}</p>
            </div>
          ))}
        </div>

        <section className="card overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Batismos registrados pelas duplas</h2>
              <p className="text-sm text-gray-400">Lista baseada no campo de batismos informado no cadastro/acompanhamento da dupla.</p>
            </div>
            <span className="text-sm font-bold text-[#0d9488] bg-[#0d9488]/10 rounded-lg px-3 py-2">
              {resumo.batismosRegistrados} batismos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="bg-[#F4F5F7] text-gray-500">
                  <th className="px-4 py-3 text-left">Dupla</th>
                  <th className="px-4 py-3 text-left">Batismos</th>
                  <th className="px-4 py-3 text-left">Igreja</th>
                  <th className="px-4 py-3 text-left">Distrito</th>
                  <th className="px-4 py-3 text-left">Regiao</th>
                  <th className="px-4 py-3 text-left">Acao</th>
                </tr>
              </thead>
              <tbody>
                {batismosPorDupla.map((dupla) => (
                  <tr
                    key={dupla.id}
                    className="cursor-pointer border-b border-gray-50 hover:bg-[#F4F5F7]"
                    onClick={() => setDuplaModal(dupla)}
                  >
                    <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{dupla.nome}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-3 py-1 text-sm font-bold text-[#0d9488]">
                        {dupla.batismos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{dupla.igreja}</td>
                    <td className="px-4 py-3 text-gray-600">{dupla.distrito}</td>
                    <td className="px-4 py-3 text-gray-600">{dupla.regiao}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="btn-outline px-3 py-2 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDuplaModal(dupla);
                        }}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
                {batismosPorDupla.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-400" colSpan="6">
                      Nenhuma dupla com batismo registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Ordem de decisoes</h2>
              <p className="text-sm text-gray-400">Classe A primeiro. Quando a dupla possui batismo registrado, isso aparece como contexto da dupla.</p>
            </div>
            <span className="text-sm font-bold text-[#1A3A6B] bg-[#1A3A6B]/10 rounded-lg px-3 py-2">
              {ranking.length} estudantes
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ranking.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-[#C9963A]/40 hover:shadow-sm">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[4rem_minmax(12rem,1.2fr)_9rem_minmax(12rem,1fr)_minmax(12rem,1.2fr)_minmax(10rem,1fr)] lg:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pos.</p>
                    <p className="text-lg font-bold text-[#C9963A]">#{index + 1}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Estudante</p>
                    <p className="break-words text-sm font-bold text-[#1A3A6B]">{item.nome}</p>
                    <p className="mt-1 text-xs text-gray-400">{tipoLabel[item.tipoEstudo] || item.tipoEstudo}</p>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-gray-400">Classe</p>
                    <BadgeClasse classe={item.classificacao} />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Progresso</p>
                      <span className="text-xs font-bold text-gray-600">{item.progresso}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-[#C9963A]" style={{ width: `${item.progresso}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-500">{getSerieNome(item.serie)} - {getLicaoLabel(item.serie, item.licaoAtual)}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Local</p>
                    <p className="break-words text-sm font-semibold text-gray-700">{item.igreja}</p>
                    <p className="text-xs text-gray-400">{item.distrito}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Dupla</p>
                    <p className="break-words text-sm font-semibold text-gray-700">{item.dupla}</p>
                    {item.batismosDupla > 0 ? (
                      <button
                        type="button"
                        className="mt-2 inline-flex rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-bold text-[#0d9488]"
                        onClick={() => setDuplaModal(batismosPorDupla.find((dupla) => String(dupla.id) === String(item.duplaId)) || {
                          id: item.duplaId,
                          nome: item.dupla,
                          batismos: item.batismosDupla,
                          igreja: item.igreja,
                          distrito: item.distrito,
                          regiao: 'Sem regiao',
                        })}
                      >
                        {item.batismosDupla} batismo(s)
                      </button>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-gray-400">Sem batismo registrado</p>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {ranking.length === 0 && (
              <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                Nenhum estudante encontrado para montar o ranking.
              </div>
            )}
          </div>
        </section>
      </div>

      {duplaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setDuplaModal(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-[#F8FAFC] p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">Batismos registrados</p>
                <h3 className="mt-1 break-words text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {duplaModal.nome}
                </h3>
                <p className="mt-1 text-sm text-gray-400">{duplaModal.igreja} - {duplaModal.distrito}</p>
              </div>
              <button
                type="button"
                onClick={() => setDuplaModal(null)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-[#1A3A6B] hover:text-[#1A3A6B]"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#0d9488]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">Batismos</p>
                  <p className="mt-2 text-3xl font-bold text-[#0d9488]">{duplaModal.batismos}</p>
                </div>
                <div className="rounded-lg bg-[#1A3A6B]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#1A3A6B]">Decisoes Classe A</p>
                  <p className="mt-2 text-3xl font-bold text-[#1A3A6B]">{estudantesClasseADaDupla.length}</p>
                </div>
                <div className="rounded-lg bg-[#C9963A]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Regiao</p>
                  <p className="mt-2 text-sm font-bold text-[#1A3A6B]">{duplaModal.regiao}</p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                O sistema registra a quantidade de batismos na dupla. Quando existe nome abaixo, ele vem dos estudantes Classe A vinculados a esta dupla e deve ser usado como referencia pastoral.
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Possiveis nomes vinculados</h4>
                {estudantesClasseADaDupla.length > 0 ? (
                  <div className="mt-3 grid gap-3">
                    {estudantesClasseADaDupla.map((estudante) => (
                      <div key={estudante.id} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-[#1A3A6B]">{estudante.nome}</p>
                            <p className="mt-1 text-xs text-gray-400">{tipoLabel[estudante.tipoEstudo] || estudante.tipoEstudo} - {getSerieNome(estudante.serie)}</p>
                          </div>
                          <BadgeClasse classe={estudante.classificacao} />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-[#C9963A]" style={{ width: `${estudante.progresso}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-600">{estudante.progresso}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-[#F4F5F7] px-4 py-8 text-center text-sm text-gray-400">
                    Nao ha estudante Classe A vinculado a esta dupla nesta lista.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-100 bg-[#F8FAFC] p-4 sm:flex-row sm:justify-end">
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setDuplaModal(null)}>
                Fechar
              </button>
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/duplas/${duplaModal.id}`)}>
                Abrir cadastro da dupla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
