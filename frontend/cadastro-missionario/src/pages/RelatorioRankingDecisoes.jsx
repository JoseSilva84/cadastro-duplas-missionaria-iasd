import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';

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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api.get('/relatorios/estudos-biblicos')
      .then((res) => {
        if (ativo) setDados(res.data || { estudos: [] });
      })
      .catch((err) => {
        if (ativo) setErro(err.response?.data?.erro || 'Erro ao carregar ranking.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, []);

  const ranking = useMemo(() => {
    const estudos = dados.estudos || [];
    const estudantes = estudos.flatMap((estudo) => {
      const base = {
        estudoId: estudo.id,
        tipoEstudo: estudo.tipoEstudo || 'UNICO',
        serie: estudo.serie,
        licaoAtual: Number(estudo.licaoAtual || 0),
        progresso: calcularProgresso(estudo),
        igreja: estudo.dupla?.igreja?.nome || 'Sem igreja',
        distrito: estudo.dupla?.distrito?.nome || 'Sem distrito',
        dupla: nomeDupla(estudo.dupla),
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
  }, [dados]);

  const resumo = useMemo(() => {
    const classificados = ranking.filter((item) => ['A', 'B', 'C'].includes(item.classificacao));
    const media = classificados.length
      ? Math.round(classificados.reduce((acc, item) => acc + item.progresso, 0) / classificados.length)
      : 0;
    return {
      A: ranking.filter((item) => item.classificacao === 'A').length,
      B: ranking.filter((item) => item.classificacao === 'B').length,
      C: ranking.filter((item) => item.classificacao === 'C').length,
      media,
    };
  }, [ranking]);

  const voltar = () => navigate(isDireto ? '/direto/relatorios/estudos-geral' : '/relatorios/estudos-geral');

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Relatorio</p>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Ranking Decisões
            </h1>
            <p className="text-gray-400 text-sm mt-1">Estudantes por classe e progressao nos estudos biblicos.</p>
          </div>
          <button type="button" className="btn-outline px-4 py-2" onClick={voltar}>Voltar</button>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        {erro && (
          <div className="card border border-red-100 text-red-600 text-sm">{erro}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Classe A', resumo.A, '#047857'],
            ['Classe B', resumo.B, '#C9963A'],
            ['Classe C', resumo.C, '#b91c1c'],
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
              <h2 className="text-lg font-bold text-[#1A3A6B]">Ordem de decisões</h2>
              <p className="text-sm text-gray-400">Classe A primeiro; dentro de cada classe, maior progresso aparece acima.</p>
            </div>
            <span className="text-sm font-bold text-[#1A3A6B] bg-[#1A3A6B]/10 rounded-lg px-3 py-2">
              {ranking.length} estudantes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="bg-[#F4F5F7] text-gray-500">
                  <th className="px-4 py-3 text-left">Pos.</th>
                  <th className="px-4 py-3 text-left">Estudante</th>
                  <th className="px-4 py-3 text-left">Classe</th>
                  <th className="px-4 py-3 text-left">Progresso</th>
                  <th className="px-4 py-3 text-left">Serie / licao</th>
                  <th className="px-4 py-3 text-left">Origem</th>
                  <th className="px-4 py-3 text-left">Igreja</th>
                  <th className="px-4 py-3 text-left">Distrito</th>
                  <th className="px-4 py-3 text-left">Dupla</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-[#C9963A]">#{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{item.nome}</td>
                    <td className="px-4 py-3"><BadgeClasse classe={item.classificacao} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-36">
                        <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-[#C9963A]" style={{ width: `${item.progresso}%` }} />
                        </div>
                        <span className="w-10 text-xs font-bold text-gray-600 text-right">{item.progresso}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="font-medium text-gray-700">{getSerieNome(item.serie)}</p>
                      <p className="text-xs text-gray-400">{getLicaoLabel(item.serie, item.licaoAtual)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tipoLabel[item.tipoEstudo] || item.tipoEstudo}</td>
                    <td className="px-4 py-3 text-gray-600">{item.igreja}</td>
                    <td className="px-4 py-3 text-gray-600">{item.distrito}</td>
                    <td className="px-4 py-3 text-gray-600">{item.dupla}</td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-400" colSpan="9">
                      Nenhum estudante encontrado para montar o ranking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
