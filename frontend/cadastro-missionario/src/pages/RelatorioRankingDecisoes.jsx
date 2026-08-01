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
const motivoBatismo = (valor) => String(valor || '').toUpperCase() === 'BATISMO';

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
  const [estudosEncerrados, setEstudosEncerrados] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [duplaModal, setDuplaModal] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get('/relatorios/estudos-biblicos'),
      api.get('/relatorios/estudos-biblicos', { params: { encerrado: 'true' } }),
      api.get('/duplas'),
    ])
      .then(([relatorioRes, encerradosRes, duplasRes]) => {
        if (!ativo) return;
        setDados(relatorioRes.data || { estudos: [] });
        setEstudosEncerrados(Array.isArray(encerradosRes.data?.estudos) ? encerradosRes.data.estudos : []);
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

  const batismosReaisPorDupla = useMemo(() => {
    const duplasPorId = new Map(duplas.map((dupla) => [String(dupla.id), dupla]));
    const mapa = new Map();

    estudosEncerrados
      .filter((estudo) => motivoBatismo(estudo.motivoEncerramento))
      .forEach((estudo) => {
        const duplaCompleta = duplasPorId.get(String(estudo.dupla?.id || estudo.duplaId)) || estudo.dupla;
        const duplaId = duplaCompleta?.id || estudo.dupla?.id || estudo.duplaId;
        if (!duplaId) return;

        const alunos = ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) && Array.isArray(estudo.participantes) && estudo.participantes.length > 0
          ? estudo.participantes.map((participante) => ({
            id: `${estudo.id}-${participante.id}`,
            nome: participante.nome || 'Sem nome',
            classificacao: participante.classificacaoInteressado || 'SEM',
            tipoEstudo: estudo.tipoEstudo || 'UNICO',
            serie: estudo.serie,
            encerradoEm: estudo.encerradoEm,
            estudoId: estudo.id,
          }))
          : [{
            id: String(estudo.id),
            nome: estudo.nomeEstudante || 'Sem nome',
            classificacao: estudo.classificacaoInteressado || 'SEM',
            tipoEstudo: estudo.tipoEstudo || 'UNICO',
            serie: estudo.serie,
            encerradoEm: estudo.encerradoEm,
            estudoId: estudo.id,
          }];

        if (!mapa.has(String(duplaId))) {
          mapa.set(String(duplaId), {
            id: duplaId,
            nome: nomeDupla(duplaCompleta),
            batismos: 0,
            igreja: duplaCompleta?.igreja?.nome || estudo.dupla?.igreja?.nome || 'Sem igreja',
            distrito: duplaCompleta?.distrito?.nome || estudo.dupla?.distrito?.nome || 'Sem distrito',
            regiao: duplaCompleta?.distrito?.regiao?.nome || estudo.dupla?.distrito?.regiao?.nome || duplaCompleta?.regiaoNome || 'Sem regiao',
            alunos: [],
          });
        }

        const item = mapa.get(String(duplaId));
        item.batismos += alunos.length;
        item.alunos.push(...alunos);
      });

    return [...mapa.values()].sort((a, b) => b.batismos - a.batismos || a.nome.localeCompare(b.nome));
  }, [duplas, estudosEncerrados]);

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
    const batismosReais = batismosReaisPorDupla.reduce((acc, dupla) => acc + dupla.batismos, 0);
    const batismosPassados = batismosPorDupla.reduce((acc, dupla) => acc + dupla.batismos, 0);
    const media = classificados.length
      ? Math.round(classificados.reduce((acc, item) => acc + item.progresso, 0) / classificados.length)
      : 0;

    return {
      batismosReais,
      batismosPassados,
      decisoesClasseA,
      aguardandoConfirmacao: Math.max(decisoesClasseA - batismosReais, 0),
      media,
    };
  }, [ranking, batismosPorDupla, batismosReaisPorDupla]);

  const baseRelatorio = isDireto ? '/direto/relatorios/estudos-geral' : '/relatorios/estudos-geral';
  const prefix = isDireto ? '/direto' : '';
  const estudantesClasseADaDupla = useMemo(() => {
    if (!duplaModal) return [];
    return ranking.filter((item) => (
      String(item.duplaId) === String(duplaModal.id) && item.classificacao === 'A'
    ));
  }, [duplaModal, ranking]);
  const alunosBatizadosDaDupla = duplaModal?.tipo === 'real' && Array.isArray(duplaModal.alunos) ? duplaModal.alunos : [];
  const batismosReaisPorDuplaId = useMemo(() => new Map(
    batismosReaisPorDupla.map((dupla) => [String(dupla.id), dupla])
  ), [batismosReaisPorDupla]);

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
              Batismos confirmados pelo encerramento dos estudos e experiencia passada informada pelas duplas.
            </p>
          </div>
          <button type="button" className="btn-outline self-end whitespace-nowrap px-4 py-2 text-sm xl:self-auto" onClick={() => navigate(baseRelatorio)}>
            Estudos no Geral
          </button>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        {erro && (
          <div className="card border border-red-100 text-red-600 text-sm">{erro}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Batismo da dupla', resumo.batismosReais, '#0d9488'],
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
              <h2 className="text-lg font-bold text-[#1A3A6B]">Batismos das duplas</h2>
              <p className="text-sm text-gray-400">Contagem baseada nos estudos encerrados com motivo Batismo.</p>
            </div>
            <span className="text-sm font-bold text-[#0d9488] bg-[#0d9488]/10 rounded-lg px-3 py-2">
              {resumo.batismosReais} batismos
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:hidden">
            {batismosReaisPorDupla.map((dupla) => (
              <button
                key={dupla.id}
                type="button"
                onClick={() => setDuplaModal({ ...dupla, tipo: 'real' })}
                className="rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#C9963A]/40 hover:shadow-sm"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Dupla</p>
                    <p className="break-words text-sm font-bold text-[#1A3A6B]">{dupla.nome}</p>
                    <p className="mt-2 text-xs text-gray-500">{dupla.igreja}</p>
                    <p className="text-xs text-gray-400">{dupla.distrito} - {dupla.regiao}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-3 py-1 text-sm font-bold text-[#0d9488]">
                      {dupla.batismos} batismo{dupla.batismos === 1 ? '' : 's'}
                    </span>
                    <span className="btn-outline px-3 py-2 text-xs">Detalhes</span>
                  </div>
                </div>
              </button>
            ))}
            {batismosReaisPorDupla.length === 0 && (
              <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                Nenhuma dupla com batismo confirmado pelo encerramento de estudo.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[760px] text-sm">
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
                {batismosReaisPorDupla.map((dupla) => (
                  <tr
                    key={dupla.id}
                    className="cursor-pointer border-b border-gray-50 hover:bg-[#F4F5F7]"
                    onClick={() => setDuplaModal({ ...dupla, tipo: 'real' })}
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
                          setDuplaModal({ ...dupla, tipo: 'real' });
                        }}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
                {batismosReaisPorDupla.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-400" colSpan="6">
                      Nenhuma dupla com batismo confirmado pelo encerramento de estudo.
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
              <h2 className="text-lg font-bold text-[#1A3A6B]">Experiência de Batismos pelas duplas no passado</h2>
              <p className="text-sm text-gray-400">Lista baseada no campo Batismos Alcançados no passado, preenchido no cadastro da dupla.</p>
            </div>
            <span className="text-sm font-bold text-[#0d9488] bg-[#0d9488]/10 rounded-lg px-3 py-2">
              {resumo.batismosPassados} batismos
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:hidden">
            {batismosPorDupla.map((dupla) => (
              <button
                key={dupla.id}
                type="button"
                onClick={() => setDuplaModal({ ...dupla, tipo: 'historico' })}
                className="rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#C9963A]/40 hover:shadow-sm"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Dupla</p>
                    <p className="break-words text-sm font-bold text-[#1A3A6B]">{dupla.nome}</p>
                    <p className="mt-2 text-xs text-gray-500">{dupla.igreja}</p>
                    <p className="text-xs text-gray-400">{dupla.distrito} - {dupla.regiao}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-3 py-1 text-sm font-bold text-[#0d9488]">
                      {dupla.batismos} batismo{dupla.batismos === 1 ? '' : 's'}
                    </span>
                    <span className="btn-outline px-3 py-2 text-xs">Detalhes</span>
                  </div>
                </div>
              </button>
            ))}
            {batismosPorDupla.length === 0 && (
              <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                Nenhuma dupla com experiência de batismo no passado.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[760px] text-sm">
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
                    onClick={() => setDuplaModal({ ...dupla, tipo: 'historico' })}
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
                          setDuplaModal({ ...dupla, tipo: 'historico' });
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
                      Nenhuma dupla com experiência de batismo no passado.
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
              <p className="text-sm text-gray-400">Classe A primeiro. Quando a dupla possui batismo confirmado pelo encerramento do estudo, isso aparece como contexto da dupla.</p>
            </div>
            <span className="text-sm font-bold text-[#1A3A6B] bg-[#1A3A6B]/10 rounded-lg px-3 py-2">
              {ranking.length} estudantes
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ranking.map((item, index) => {
              const batismoRealDaDupla = batismosReaisPorDuplaId.get(String(item.duplaId));
              const totalBatismosReaisDaDupla = batismoRealDaDupla?.batismos || 0;
              return (
              <article key={item.id} className="rounded-xl border border-gray-100 bg-white p-3 transition hover:border-[#C9963A]/40 hover:shadow-sm sm:p-3.5">
                <div className="grid grid-cols-1 gap-3 md:flex md:items-center md:gap-3">
                  <div className="min-w-0 md:w-10 md:flex-none">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Pos.</p>
                    <p className="text-base font-bold leading-tight text-[#C9963A] md:text-sm">#{index + 1}</p>
                  </div>

                  <div className="min-w-0 md:flex-[1.2]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Estudante</p>
                    <p className="break-words text-sm font-bold leading-snug text-[#1A3A6B] md:text-[11px] xl:text-sm">{item.nome}</p>
                    <p className="mt-0.5 text-xs leading-tight text-gray-400 md:text-[10px] xl:text-xs">{tipoLabel[item.tipoEstudo] || item.tipoEstudo}</p>
                  </div>

                  <div className="min-w-0 md:w-20 md:flex-none">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">Classe</p>
                    <BadgeClasse classe={item.classificacao} />
                  </div>

                  <div className="min-w-0 md:flex-[1.05]">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Progresso</p>
                      <span className="text-[10px] font-bold text-gray-600">{item.progresso}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-[#C9963A]" style={{ width: `${item.progresso}%` }} />
                    </div>
                    <p className="mt-1 text-xs font-medium leading-tight text-gray-500 md:text-[10px] xl:text-xs">{getSerieNome(item.serie)} - {getLicaoLabel(item.serie, item.licaoAtual)}</p>
                  </div>

                  <div className="min-w-0 md:flex-[0.95]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Local</p>
                    <p className="break-words text-sm font-semibold leading-snug text-gray-700 md:text-[11px] xl:text-sm">{item.igreja}</p>
                    <p className="text-xs leading-tight text-gray-400 md:text-[10px] xl:text-xs">{item.distrito}</p>
                  </div>

                  <div className="min-w-0 md:flex-[1.15]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Dupla</p>
                    <p className="break-words text-sm font-semibold leading-snug text-gray-700 md:text-[10px] xl:text-sm">{item.dupla}</p>
                    {totalBatismosReaisDaDupla > 0 ? (
                      <button
                        type="button"
                        className="mt-1.5 inline-flex rounded-full bg-[#0d9488]/10 px-2 py-0.5 text-[10px] font-bold text-[#0d9488] xl:text-xs"
                        onClick={() => setDuplaModal({ ...batismoRealDaDupla, tipo: 'real' })}
                      >
                        {totalBatismosReaisDaDupla} batismo(s)
                      </button>
                    ) : (
                      <p className="mt-1.5 text-[10px] font-medium leading-tight text-gray-400 xl:text-xs">Sem batismo confirmado</p>
                    )}
                  </div>
                </div>
              </article>
            );
            })}

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
          className="app-modal-overlay"
          onClick={() => setDuplaModal(null)}
        >
          <div
            className="app-modal-panel max-w-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal-header">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">
                  {duplaModal.tipo === 'real' ? 'Batismos confirmados' : 'Experiencia passada'}
                </p>
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

            <div className="app-modal-body">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#0d9488]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">
                    {duplaModal.tipo === 'real' ? 'Batismos da dupla' : 'Batismos no passado'}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#0d9488]">{duplaModal.batismos}</p>
                </div>
                <div className="rounded-lg bg-[#1A3A6B]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#1A3A6B]">
                    {duplaModal.tipo === 'real' ? 'Alunos listados' : 'Decisoes Classe A'}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#1A3A6B]">
                    {duplaModal.tipo === 'real' ? alunosBatizadosDaDupla.length : estudantesClasseADaDupla.length}
                  </p>
                </div>
                <div className="rounded-lg bg-[#C9963A]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Regiao</p>
                  <p className="mt-2 text-sm font-bold text-[#1A3A6B]">{duplaModal.regiao}</p>
                </div>
              </div>

              {duplaModal.tipo === 'real' ? (
                <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
                  Origem do numero: estudos encerrados com o motivo Batismo. Os nomes abaixo sao os alunos vinculados aos estudos encerrados dessa forma.
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
                  Origem do numero: campo Batismos Alcançados no passado no cadastro da dupla. Este registro e historico e nao identifica nominalmente quais alunos foram batizados.
                </div>
              )}

              <div className="mt-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                  {duplaModal.tipo === 'real' ? 'Alunos batizados' : 'Estudantes Classe A vinculados'}
                </h4>
                {duplaModal.tipo === 'real' ? (
                  alunosBatizadosDaDupla.length > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {alunosBatizadosDaDupla.map((aluno) => (
                        <div key={aluno.id} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold text-[#1A3A6B]">{aluno.nome}</p>
                              <p className="mt-1 text-xs text-gray-400">{tipoLabel[aluno.tipoEstudo] || aluno.tipoEstudo} - {getSerieNome(aluno.serie)}</p>
                              {aluno.encerradoEm && (
                                <p className="mt-1 text-xs font-semibold text-emerald-700">
                                  Encerrado em {new Date(aluno.encerradoEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </p>
                              )}
                            </div>
                            <BadgeClasse classe={aluno.classificacao} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg bg-[#F4F5F7] px-4 py-8 text-center text-sm text-gray-400">
                      Nenhum aluno batizado encontrado para esta dupla.
                    </div>
                  )
                ) : estudantesClasseADaDupla.length > 0 ? (
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
                    Nao ha estudante Classe A vinculado a esta dupla nesta lista. O numero historico foi informado sem nomes individuais.
                  </div>
                )}
              </div>
            </div>

            <div className="app-modal-footer flex-col sm:flex-row">
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
