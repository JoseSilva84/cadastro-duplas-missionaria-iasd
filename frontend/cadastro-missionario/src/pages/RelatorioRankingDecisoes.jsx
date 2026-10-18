import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';
import LoadingState from '../components/LoadingState';
import BackButton from '../components/BackButton';

const LIMITE_POR_PAGINA = 100;

const tipoLabel = {
  UNICO: 'Estudante Bíblico',
  PONTO: 'Ponto de Estudo',
  CLASSE: 'Classe Bíblica',
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

const motivoEncerramentoConfig = {
  BATISMO: { label: 'Batismo', cor: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  TERMINOU_LICOES: { label: 'Terminou as lições', cor: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  DESISTIU: { label: 'Desistiu do estudo', cor: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  OUTRO: { label: 'Outro motivo', cor: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

const getMotivoEncerramentoInfo = (valor) => {
  const chave = String(valor || '').trim().toUpperCase();
  if (motivoEncerramentoConfig[chave]) return motivoEncerramentoConfig[chave];
  if (valor && String(valor).trim()) {
    return {
      label: String(valor).trim(),
      cor: '#475569',
      bg: '#f8fafc',
      border: '#e2e8f0',
    };
  }
  return { label: 'Não informado', cor: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
};

const normalizarTexto = (valor = '') => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const nomeDupla = (dupla) => {
  if (!dupla) return 'Sem dupla';
  return `${dupla.liderNome || 'Líder'} + ${dupla.membro2Nome || 'Membro'}`;
};

const getIgrejaDaDupla = (dupla, fallbackDupla = null) => (
  dupla?.igreja?.nome
  || fallbackDupla?.igreja?.nome
  || dupla?.liderIgreja
  || dupla?.membro2Igreja
  || 'Sem igreja'
);

const getDistritoDaDupla = (dupla, fallbackDupla = null) => (
  dupla?.distrito?.nome
  || fallbackDupla?.distrito?.nome
  || dupla?.liderDistrito
  || dupla?.membro2Distrito
  || 'Sem distrito'
);

const getRegiaoDaDupla = (dupla, fallbackDupla = null) => (
  dupla?.distrito?.regiao?.nome
  || fallbackDupla?.distrito?.regiao?.nome
  || dupla?.regiaoNome
  || fallbackDupla?.regiaoNome
  || 'Sem região'
);

const batismosDaDupla = (dupla) => Number(dupla?.batismos || 0);
const motivoBatismo = (valor) => String(valor || '').trim().toUpperCase() === 'BATISMO';
const estudoEstaEncerrado = (estudo) => (
  estudo?.encerrado === true || String(estudo?.statusEstudo || '').toUpperCase() === 'ENCERRADO'
);

const totalLicoes = (serieId) => SERIES_ESTUDO.find((serie) => serie.id === serieId)?.licoes.length || 0;

const calcularProgresso = (estudo) => {
  const total = totalLicoes(estudo.serie);
  if (!total) return 0;
  return Math.min(100, Math.round((Number(estudo.licaoAtual || 0) / total) * 100));
};

const extrairAlunosDoEstudo = (estudo, igrejaPadrao = 'Sem igreja') => {
  if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) && Array.isArray(estudo.participantes) && estudo.participantes.length > 0) {
    return estudo.participantes.map((participante) => ({
      id: `${estudo.id}-${participante.id}`,
      nome: participante.nome || 'Sem nome',
      classificacao: participante.classificacaoInteressado || 'SEM',
      tipoEstudo: estudo.tipoEstudo || 'UNICO',
      serie: estudo.serie,
      licaoAtual: Number(estudo.licaoAtual || 0),
      progresso: calcularProgresso(estudo),
      encerradoEm: estudo.encerradoEm,
      motivoEncerramento: estudo.motivoEncerramento,
      estudoId: estudo.id,
      igreja: igrejaPadrao,
    }));
  }
  return [{
    id: String(estudo.id),
    nome: estudo.nomeEstudante || 'Sem nome',
    classificacao: estudo.classificacaoInteressado || 'SEM',
    tipoEstudo: estudo.tipoEstudo || 'UNICO',
    serie: estudo.serie,
    licaoAtual: Number(estudo.licaoAtual || 0),
    progresso: calcularProgresso(estudo),
    encerradoEm: estudo.encerradoEm,
    motivoEncerramento: estudo.motivoEncerramento,
    estudoId: estudo.id,
    igreja: igrejaPadrao,
  }];
};

const BadgeClasse = ({ classe }) => {
  const cfg = classeConfig[classe] || classeConfig.SEM;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap"
      style={{ color: cfg.cor, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
};

const BadgeMotivoEncerramento = ({ motivo }) => {
  const cfg = getMotivoEncerramentoInfo(motivo);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
      style={{ color: cfg.cor, backgroundColor: cfg.bg, borderColor: cfg.border }}
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

  // Modais (todos renderizados no document.body via Portal acima de toda a página)
  const [duplaModal, setDuplaModal] = useState(null);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [buscaModalHistorico, setBuscaModalHistorico] = useState('');
  const [limiteModalHistorico, setLimiteModalHistorico] = useState(LIMITE_POR_PAGINA);
  const [modalIgrejasAberto, setModalIgrejasAberto] = useState(false);
  const [igrejaDetalheModal, setIgrejaDetalheModal] = useState(null);

  // Busca de Dupla com Autocomplete (entre os cards e Batismos das duplas)
  const [buscaDupla, setBuscaDupla] = useState('');
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [duplaSelecionadaId, setDuplaSelecionadaId] = useState(null);
  const [abaDuplaSelecionada, setAbaDuplaSelecionada] = useState('todos');
  const buscaContainerRef = useRef(null);

  // Batismos por Igreja (card expansível / visão leve)
  const [cardIgrejasExpandido, setCardIgrejasExpandido] = useState(false);
  const [filtroVisaoIgrejas, setFiltroVisaoIgrejas] = useState('comBatismo'); // 'comBatismo' | 'todas'
  const [buscaIgreja, setBuscaIgreja] = useState('');
  const [limiteIgrejas, setLimiteIgrejas] = useState(LIMITE_POR_PAGINA);
  const [visaoSecaoBatismos, setVisaoSecaoBatismos] = useState('duplas'); // 'duplas' | 'igrejas'

  // Paginação progressiva (100 em 100)
  const [limiteBatismosReais, setLimiteBatismosReais] = useState(LIMITE_POR_PAGINA);
  const [limiteDecisoes, setLimiteDecisoes] = useState(LIMITE_POR_PAGINA);
  const sentinelaDecisoesRef = useRef(null);

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
        if (ativo) setErro(err.response?.data?.erro || 'Erro ao carregar relatório.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, []);

  // Fecha o dropdown de sugestões ao clicar fora
  useEffect(() => {
    const aoClicarFora = (event) => {
      if (buscaContainerRef.current && !buscaContainerRef.current.contains(event.target)) {
        setSugestoesAbertas(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  // Trava o scroll do body e permite fechar modais com ESC
  const algumModalAberto = Boolean(duplaModal || modalHistoricoAberto || modalIgrejasAberto || igrejaDetalheModal);
  useEffect(() => {
    if (!algumModalAberto) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const aoTeclar = (event) => {
      if (event.key !== 'Escape') return;
      if (duplaModal) setDuplaModal(null);
      else if (igrejaDetalheModal) setIgrejaDetalheModal(null);
      else if (modalHistoricoAberto) setModalHistoricoAberto(false);
      else if (modalIgrejasAberto) setModalIgrejasAberto(false);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [algumModalAberto, duplaModal, igrejaDetalheModal, modalHistoricoAberto, modalIgrejasAberto]);

  // Mapa completo de todas as duplas com seus batismos, estudos ativos e estudos encerrados
  const perfisDuplasMap = useMemo(() => {
    const mapa = new Map();

    const garantirDupla = (duplaRaw, fallbackDupla = null) => {
      const id = duplaRaw?.id || fallbackDupla?.id;
      if (!id) return null;
      const chave = String(id);
      if (!mapa.has(chave)) {
        const ref = duplaRaw?.liderNome ? duplaRaw : (fallbackDupla || duplaRaw);
        mapa.set(chave, {
          id,
          nome: nomeDupla(ref),
          liderNome: ref?.liderNome || '',
          membro2Nome: ref?.membro2Nome || '',
          igreja: getIgrejaDaDupla(duplaRaw, fallbackDupla),
          distrito: getDistritoDaDupla(duplaRaw, fallbackDupla),
          regiao: getRegiaoDaDupla(duplaRaw, fallbackDupla),
          batismosPassados: batismosDaDupla(duplaRaw),
          batismosConfirmados: 0,
          alunosBatizados: [],
          estudosAtivos: [],
          estudosEncerrados: [],
        });
      }
      return mapa.get(chave);
    };

    duplas.forEach((dupla) => {
      garantirDupla(dupla);
    });

    const duplasPorId = new Map(duplas.map((dupla) => [String(dupla.id), dupla]));
    const idsAtivosVistos = new Set();
    const idsEncerradosVistos = new Set();

    // Estudos em andamento vindos do relatório
    (dados.estudos || []).forEach((estudo) => {
      if (estudoEstaEncerrado(estudo)) return;
      const duplaId = estudo.dupla?.id || estudo.duplaId;
      const duplaCompleta = duplasPorId.get(String(duplaId)) || estudo.dupla;
      const perfil = garantirDupla(duplaCompleta, estudo.dupla);
      if (!perfil) return;
      idsAtivosVistos.add(String(estudo.id));
      const alunos = extrairAlunosDoEstudo(estudo, perfil.igreja);
      perfil.estudosAtivos.push({
        id: estudo.id,
        nomeEstudante: estudo.nomeEstudante || 'Sem nome',
        tipoEstudo: estudo.tipoEstudo || 'UNICO',
        serie: estudo.serie,
        licaoAtual: Number(estudo.licaoAtual || 0),
        progresso: calcularProgresso(estudo),
        classificacao: estudo.classificacaoInteressado || 'SEM',
        alunos,
      });
    });

    // Estudos encerrados vindos do relatório
    estudosEncerrados.forEach((estudo) => {
      const duplaId = estudo.dupla?.id || estudo.duplaId;
      const duplaCompleta = duplasPorId.get(String(duplaId)) || estudo.dupla;
      const perfil = garantirDupla(duplaCompleta, estudo.dupla);
      if (!perfil) return;
      idsEncerradosVistos.add(String(estudo.id));
      const alunos = extrairAlunosDoEstudo(estudo, perfil.igreja);
      const ehBatismo = motivoBatismo(estudo.motivoEncerramento);
      perfil.estudosEncerrados.push({
        id: estudo.id,
        nomeEstudante: estudo.nomeEstudante || 'Sem nome',
        tipoEstudo: estudo.tipoEstudo || 'UNICO',
        serie: estudo.serie,
        licaoAtual: Number(estudo.licaoAtual || 0),
        progresso: calcularProgresso(estudo),
        classificacao: estudo.classificacaoInteressado || 'SEM',
        motivoEncerramento: estudo.motivoEncerramento || 'Não informado',
        encerradoEm: estudo.encerradoEm,
        ehBatismo,
        alunos,
      });
      if (ehBatismo) {
        perfil.batismosConfirmados += alunos.length;
        perfil.alunosBatizados.push(...alunos);
      }
    });

    // Complementa com estudosBiblicos embutidos no cadastro da dupla caso algum não tenha vindo acima
    duplas.forEach((dupla) => {
      const perfil = garantirDupla(dupla);
      if (!perfil || !Array.isArray(dupla.estudosBiblicos)) return;
      dupla.estudosBiblicos.forEach((estudo) => {
        const chaveEstudo = String(estudo.id);
        const alunos = extrairAlunosDoEstudo(estudo, perfil.igreja);
        if (estudoEstaEncerrado(estudo)) {
          if (idsEncerradosVistos.has(chaveEstudo)) return;
          idsEncerradosVistos.add(chaveEstudo);
          const ehBatismo = motivoBatismo(estudo.motivoEncerramento);
          perfil.estudosEncerrados.push({
            id: estudo.id,
            nomeEstudante: estudo.nomeEstudante || 'Sem nome',
            tipoEstudo: estudo.tipoEstudo || 'UNICO',
            serie: estudo.serie,
            licaoAtual: Number(estudo.licaoAtual || 0),
            progresso: calcularProgresso(estudo),
            classificacao: estudo.classificacaoInteressado || 'SEM',
            motivoEncerramento: estudo.motivoEncerramento || 'Não informado',
            encerradoEm: estudo.encerradoEm,
            ehBatismo,
            alunos,
          });
          if (ehBatismo) {
            perfil.batismosConfirmados += alunos.length;
            perfil.alunosBatizados.push(...alunos);
          }
        } else {
          if (idsAtivosVistos.has(chaveEstudo)) return;
          idsAtivosVistos.add(chaveEstudo);
          perfil.estudosAtivos.push({
            id: estudo.id,
            nomeEstudante: estudo.nomeEstudante || 'Sem nome',
            tipoEstudo: estudo.tipoEstudo || 'UNICO',
            serie: estudo.serie,
            licaoAtual: Number(estudo.licaoAtual || 0),
            progresso: calcularProgresso(estudo),
            classificacao: estudo.classificacaoInteressado || 'SEM',
            alunos,
          });
        }
      });
    });

    return mapa;
  }, [duplas, dados.estudos, estudosEncerrados]);

  const listaPerfisDuplas = useMemo(() => (
    [...perfisDuplasMap.values()].sort((a, b) => (
      b.batismosConfirmados - a.batismosConfirmados
      || b.estudosAtivos.length - a.estudosAtivos.length
      || b.estudosEncerrados.length - a.estudosEncerrados.length
      || b.batismosPassados - a.batismosPassados
      || a.nome.localeCompare(b.nome, 'pt-BR')
    ))
  ), [perfisDuplasMap]);

  // Sugestões de busca de dupla (autocomplete)
  const sugestoesDuplas = useMemo(() => {
    const termo = normalizarTexto(buscaDupla);
    if (!termo) return listaPerfisDuplas.slice(0, 10);

    return listaPerfisDuplas
      .filter((dupla) => {
        const alvo = normalizarTexto(`${dupla.nome} ${dupla.igreja} ${dupla.distrito} ${dupla.regiao}`);
        return alvo.includes(termo);
      })
      .sort((a, b) => {
        const aComeca = normalizarTexto(a.nome).startsWith(termo) ? 0 : 1;
        const bComeca = normalizarTexto(b.nome).startsWith(termo) ? 0 : 1;
        if (aComeca !== bComeca) return aComeca - bComeca;
        return (
          b.batismosConfirmados - a.batismosConfirmados
          || b.estudosAtivos.length - a.estudosAtivos.length
          || b.estudosEncerrados.length - a.estudosEncerrados.length
          || a.nome.localeCompare(b.nome, 'pt-BR')
        );
      })
      .slice(0, 12);
  }, [buscaDupla, listaPerfisDuplas]);

  const duplaSelecionada = useMemo(() => {
    if (!duplaSelecionadaId) return null;
    return perfisDuplasMap.get(String(duplaSelecionadaId)) || null;
  }, [duplaSelecionadaId, perfisDuplasMap]);

  // Batismos no passado (Experiência passada)
  const batismosPorDupla = useMemo(() => (
    listaPerfisDuplas
      .filter((dupla) => dupla.batismosPassados > 0)
      .map((dupla) => ({
        id: dupla.id,
        nome: dupla.nome,
        batismos: dupla.batismosPassados,
        batismosConfirmados: dupla.batismosConfirmados,
        igreja: dupla.igreja,
        distrito: dupla.distrito,
        regiao: dupla.regiao,
      }))
      .sort((a, b) => b.batismos - a.batismos || a.nome.localeCompare(b.nome, 'pt-BR'))
  ), [listaPerfisDuplas]);

  // Batismos confirmados pelo encerramento de estudo
  const batismosReaisPorDupla = useMemo(() => (
    listaPerfisDuplas
      .filter((dupla) => dupla.batismosConfirmados > 0)
      .map((dupla) => ({
        id: dupla.id,
        nome: dupla.nome,
        batismos: dupla.batismosConfirmados,
        batismosPassados: dupla.batismosPassados,
        igreja: dupla.igreja,
        distrito: dupla.distrito,
        regiao: dupla.regiao,
        alunos: dupla.alunosBatizados,
      }))
      .sort((a, b) => b.batismos - a.batismos || a.nome.localeCompare(b.nome, 'pt-BR'))
  ), [listaPerfisDuplas]);

  // Agrupamento de Batismos e Duplas por Igreja
  const todasIgrejasAgrupadas = useMemo(() => {
    const mapaIgrejas = new Map();

    listaPerfisDuplas.forEach((dupla) => {
      const chave = `${normalizarTexto(dupla.igreja)}__${normalizarTexto(dupla.distrito)}`;
      if (!mapaIgrejas.has(chave)) {
        mapaIgrejas.set(chave, {
          id: chave,
          igreja: dupla.igreja,
          distrito: dupla.distrito,
          regiao: dupla.regiao,
          batismosConfirmados: 0,
          batismosPassados: 0,
          duplasComBatismo: [],
          todasDuplas: [],
          alunosBatizados: [],
        });
      }
      const item = mapaIgrejas.get(chave);
      item.todasDuplas.push(dupla);
      item.batismosPassados += dupla.batismosPassados;
      if (dupla.batismosConfirmados > 0) {
        item.batismosConfirmados += dupla.batismosConfirmados;
        item.duplasComBatismo.push({
          id: dupla.id,
          nome: dupla.nome,
          batismos: dupla.batismosConfirmados,
          batismosPassados: dupla.batismosPassados,
          estudosAtivosCount: dupla.estudosAtivos.length,
          estudosEncerradosCount: dupla.estudosEncerrados.length,
          alunos: dupla.alunosBatizados,
        });
        item.alunosBatizados.push(
          ...dupla.alunosBatizados.map((aluno) => ({
            ...aluno,
            duplaId: dupla.id,
            duplaNome: dupla.nome,
          }))
        );
      }
    });

    return [...mapaIgrejas.values()].map((item) => ({
      ...item,
      duplasComBatismo: item.duplasComBatismo.sort((a, b) => b.batismos - a.batismos || a.nome.localeCompare(b.nome, 'pt-BR')),
      todasDuplas: item.todasDuplas.sort((a, b) => (
        b.batismosConfirmados - a.batismosConfirmados
        || b.estudosAtivos.length - a.estudosAtivos.length
        || b.batismosPassados - a.batismosPassados
        || a.nome.localeCompare(b.nome, 'pt-BR')
      )),
    })).sort((a, b) => (
      b.batismosConfirmados - a.batismosConfirmados
      || b.duplasComBatismo.length - a.duplasComBatismo.length
      || b.todasDuplas.length - a.todasDuplas.length
      || a.igreja.localeCompare(b.igreja, 'pt-BR')
    ));
  }, [listaPerfisDuplas]);

  const batismosPorIgreja = useMemo(() => (
    todasIgrejasAgrupadas.filter((item) => item.batismosConfirmados > 0)
  ), [todasIgrejasAgrupadas]);

  const igrejasFiltradas = useMemo(() => {
    const base = filtroVisaoIgrejas === 'comBatismo' ? batismosPorIgreja : todasIgrejasAgrupadas;
    const termo = normalizarTexto(buscaIgreja);
    if (!termo) return base;
    return base.filter((item) => {
      const nomesDuplas = item.todasDuplas.map((d) => d.nome).join(' ');
      const texto = normalizarTexto(`${item.igreja} ${item.distrito} ${item.regiao} ${nomesDuplas}`);
      return texto.includes(termo);
    });
  }, [filtroVisaoIgrejas, batismosPorIgreja, todasIgrejasAgrupadas, buscaIgreja]);

  // Ordem de decisões (estudantes em andamento ordenados por Classe A -> Progresso -> Lição)
  const ranking = useMemo(() => {
    const duplasPorId = new Map(duplas.map((dupla) => [String(dupla.id), dupla]));
    const estudos = dados.estudos || [];
    const estudantes = estudos.flatMap((estudo) => {
      const duplaCompleta = duplasPorId.get(String(estudo.dupla?.id || estudo.duplaId)) || estudo.dupla;
      const base = {
        estudoId: estudo.id,
        tipoEstudo: estudo.tipoEstudo || 'UNICO',
        serie: estudo.serie,
        licaoAtual: Number(estudo.licaoAtual || 0),
        progresso: calcularProgresso(estudo),
        igreja: getIgrejaDaDupla(duplaCompleta, estudo.dupla),
        distrito: getDistritoDaDupla(duplaCompleta, estudo.dupla),
        duplaId: duplaCompleta?.id || estudo.dupla?.id || estudo.duplaId || null,
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
        || a.nome.localeCompare(b.nome, 'pt-BR');
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

  // Paginação progressiva via scroll na Ordem de Decisões (100 por vez)
  const temMaisDecisoes = limiteDecisoes < ranking.length;
  const carregarMaisDecisoes = useCallback(() => {
    setLimiteDecisoes((atual) => Math.min(ranking.length, atual + LIMITE_POR_PAGINA));
  }, [ranking.length]);

  useEffect(() => {
    const alvo = sentinelaDecisoesRef.current;
    if (!alvo || !temMaisDecisoes || typeof IntersectionObserver === 'undefined') return undefined;

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          carregarMaisDecisoes();
        }
      },
      { rootMargin: '320px 0px' }
    );

    observador.observe(alvo);
    return () => observador.disconnect();
  }, [carregarMaisDecisoes, temMaisDecisoes, limiteDecisoes]);

  // Filtro da lista dentro do modal de Experiência de Batismos no Passado
  const historicoFiltradoNoModal = useMemo(() => {
    const termo = normalizarTexto(buscaModalHistorico);
    if (!termo) return batismosPorDupla;
    return batismosPorDupla.filter((dupla) => (
      normalizarTexto(`${dupla.nome} ${dupla.igreja} ${dupla.distrito} ${dupla.regiao}`).includes(termo)
    ));
  }, [batismosPorDupla, buscaModalHistorico]);

  const baseRelatorio = isDireto ? '/direto/relatorios/estudos-geral' : '/relatorios/estudos-geral';
  const prefix = isDireto ? '/direto' : '';

  const perfilDuplaModal = useMemo(() => {
    if (!duplaModal) return null;
    return perfisDuplasMap.get(String(duplaModal.id)) || null;
  }, [duplaModal, perfisDuplasMap]);

  const estudantesClasseADaDupla = useMemo(() => {
    if (!duplaModal) return [];
    return ranking.filter((item) => (
      String(item.duplaId) === String(duplaModal.id) && item.classificacao === 'A'
    ));
  }, [duplaModal, ranking]);

  const alunosBatizadosDaDupla = useMemo(() => {
    if (!duplaModal) return [];
    if (Array.isArray(duplaModal.alunos) && duplaModal.alunos.length > 0) return duplaModal.alunos;
    return perfilDuplaModal?.alunosBatizados || [];
  }, [duplaModal, perfilDuplaModal]);

  const batismosReaisPorDuplaId = useMemo(() => new Map(
    batismosReaisPorDupla.map((dupla) => [String(dupla.id), dupla])
  ), [batismosReaisPorDupla]);

  const selecionarDuplaNaBusca = (dupla) => {
    setDuplaSelecionadaId(dupla.id);
    setBuscaDupla(dupla.nome);
    setSugestoesAbertas(false);
    setAbaDuplaSelecionada('todos');
  };

  const limparBuscaDupla = () => {
    setBuscaDupla('');
    setDuplaSelecionadaId(null);
    setSugestoesAbertas(false);
    setAbaDuplaSelecionada('todos');
  };

  const abrirModalDupla = (dupla, tipo = 'real') => {
    const perfil = perfisDuplasMap.get(String(dupla.id));
    setDuplaModal({
      ...dupla,
      id: dupla.id,
      nome: dupla.nome || perfil?.nome || 'Dupla',
      igreja: dupla.igreja || perfil?.igreja || 'Sem igreja',
      distrito: dupla.distrito || perfil?.distrito || 'Sem distrito',
      regiao: dupla.regiao || perfil?.regiao || 'Sem região',
      batismos: tipo === 'real'
        ? (dupla.batismos ?? perfil?.batismosConfirmados ?? 0)
        : (dupla.batismos ?? perfil?.batismosPassados ?? 0),
      alunos: perfil?.alunosBatizados || dupla.alunos || [],
      tipo,
    });
  };

  if (carregando) return <LoadingState mensagem="Carregando relatório..." />;

  const batismosReaisVisiveis = batismosReaisPorDupla.slice(0, limiteBatismosReais);
  const batismosPassadosVisiveis = batismosPorDupla.slice(0, LIMITE_POR_PAGINA);
  const rankingVisivel = ranking.slice(0, limiteDecisoes);
  const igrejasVisiveis = igrejasFiltradas.slice(0, limiteIgrejas);
  const historicoModalVisivel = historicoFiltradoNoModal.slice(0, limiteModalHistorico);

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4' : 'mb-6 sm:mb-8'}>
        <BackButton fallbackTo={baseRelatorio} className="mb-3" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Relatório</p>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Batismos e Decisões
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Batismos confirmados pelo encerramento dos estudos e experiência passada informada pelas duplas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            <button
              type="button"
              className="btn-outline whitespace-nowrap px-4 py-2 text-xs sm:text-sm"
              onClick={() => setModalIgrejasAberto(true)}
            >
              Batismos por Igreja ({batismosPorIgreja.length})
            </button>
            <button
              type="button"
              className="btn-outline whitespace-nowrap px-4 py-2 text-xs sm:text-sm"
              onClick={() => navigate(baseRelatorio)}
            >
              Estudos no Geral
            </button>
          </div>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-3 sm:p-6 space-y-5' : 'space-y-5'}>
        {erro && (
          <div className="card border border-red-100 text-red-600 text-sm">{erro}</div>
        )}

        {/* 4 Cards Principais de Resumo */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setCardIgrejasExpandido(true);
              setModalIgrejasAberto(true);
            }}
            className="group card relative overflow-hidden p-3.5 sm:p-5 flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5 hover:ring-1 hover:ring-[#0d9488]/40 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/50"
            title="Clique para ver em quais igrejas ocorreram os batismos e as duplas de cada igreja"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-[#0d9488] opacity-85 transition-all group-hover:h-1.5" />
            <div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider truncate">
                Batismo da dupla
              </p>
              <p className="text-2xl sm:text-3xl font-black mt-1 leading-none tracking-tight text-[#0d9488]">
                {resumo.batismosReais}
              </p>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1 pt-2 border-t border-gray-100">
              <span className="text-[11px] font-semibold text-[#0d9488] truncate">
                Em {batismosPorIgreja.length} igreja{batismosPorIgreja.length === 1 ? '' : 's'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A3A6B] group-hover:text-[#0d9488] whitespace-nowrap">
                Ver igrejas →
              </span>
            </div>
          </button>

          {[
            ['Decisões Classe A', resumo.decisoesClasseA, '#047857', 'Prontos para o batismo'],
            ['Aguardando confirmação', resumo.aguardandoConfirmacao, '#C9963A', 'Classe A em acompanhamento'],
            ['Progresso médio', `${resumo.media}%`, '#1A3A6B', 'Média dos estudantes classificados'],
          ].map(([label, valor, cor, subtitulo]) => (
            <div key={label} className="card relative overflow-hidden p-3.5 sm:p-5 flex flex-col justify-between">
              <span className="absolute inset-x-0 top-0 h-1 opacity-85" style={{ backgroundColor: cor }} />
              <div>
                <p className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider truncate">{label}</p>
                <p className="text-2xl sm:text-3xl font-black mt-1 leading-none tracking-tight" style={{ color: cor }}>{valor}</p>
              </div>
              <p className="mt-2.5 pt-2 border-t border-gray-100 text-[11px] text-gray-400 truncate">{subtitulo}</p>
            </div>
          ))}
        </div>

        {/* Busca de Dupla com Sugestão (Autocomplete) + Visão Completa da Dupla (entre os cards e Batismos das duplas) */}
        <section ref={buscaContainerRef} className="card overflow-visible p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Consultar Dupla Missionária</h2>
                <span className="rounded-full bg-[#C9963A]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#C9963A]">
                  Busca inteligente
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Digite o nome da dupla, membro ou igreja para selecionar e visualizar batismos, igreja, estudos ativos e estudos encerrados.
              </p>
            </div>
            {duplaSelecionada && (
              <button
                type="button"
                onClick={limparBuscaDupla}
                className="btn-outline self-start lg:self-auto px-3.5 py-2 text-xs whitespace-nowrap"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div className="relative">
            <div className="relative flex items-center">
              <svg
                className="pointer-events-none absolute left-3.5 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="input-field pl-10 pr-24"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Escreva o nome da dupla, membro ou igreja..."
                value={buscaDupla}
                onFocus={() => setSugestoesAbertas(true)}
                onChange={(event) => {
                  setBuscaDupla(event.target.value);
                  setSugestoesAbertas(true);
                  if (!event.target.value.trim()) {
                    setDuplaSelecionadaId(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && sugestoesDuplas.length > 0) {
                    event.preventDefault();
                    selecionarDuplaNaBusca(sugestoesDuplas[0]);
                  } else if (event.key === 'Escape') {
                    setSugestoesAbertas(false);
                  }
                }}
              />
              {buscaDupla && (
                <button
                  type="button"
                  onClick={limparBuscaDupla}
                  className="absolute right-2.5 rounded-md px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-[#1A3A6B]"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Lista de sugestões (Autocomplete) */}
            {sugestoesAbertas && (
              <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <span>
                    {buscaDupla.trim()
                      ? `${sugestoesDuplas.length} dupla(s) sugerida(s)`
                      : 'Sugestões de duplas (digite para filtrar)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSugestoesAbertas(false)}
                    className="text-gray-400 hover:text-[#1A3A6B] min-h-0 py-0.5 px-1.5"
                  >
                    Fechar
                  </button>
                </div>

                {sugestoesDuplas.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {sugestoesDuplas.map((dupla) => {
                      const selecionada = String(duplaSelecionadaId) === String(dupla.id);
                      return (
                        <button
                          key={dupla.id}
                          type="button"
                          onClick={() => selecionarDuplaNaBusca(dupla)}
                          className={`w-full rounded-lg px-3 py-2.5 text-left transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            selecionada ? 'bg-[#1A3A6B]/8 ring-1 ring-[#1A3A6B]/20' : 'hover:bg-[#F4F5F7]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#1A3A6B] break-words">{dupla.nome}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <span className="font-semibold text-gray-700">{dupla.igreja}</span> • {dupla.distrito} • {dupla.regiao}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                            {dupla.batismosConfirmados > 0 && (
                              <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0d9488]">
                                {dupla.batismosConfirmados} batismo{dupla.batismosConfirmados === 1 ? '' : 's'}
                              </span>
                            )}
                            {dupla.batismosPassados > 0 && (
                              <span className="inline-flex items-center rounded-full bg-[#C9963A]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#b45309]">
                                {dupla.batismosPassados} no passado
                              </span>
                            )}
                            <span className="inline-flex items-center rounded-full bg-[#1A3A6B]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#1A3A6B]">
                              {dupla.estudosAtivos.length} ativo{dupla.estudosAtivos.length === 1 ? '' : 's'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
                              {dupla.estudosEncerrados.length} encerrado{dupla.estudosEncerrados.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    Nenhuma dupla encontrada com &ldquo;{buscaDupla}&rdquo;.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Painel Completo da Dupla Selecionada */}
          {duplaSelecionada && (
            <div className="mt-5 rounded-2xl border border-[#1A3A6B]/15 bg-[#F8FAFC] p-4 sm:p-5 space-y-4 animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 border-b border-gray-200/80 pb-4">
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full bg-[#1A3A6B]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#1A3A6B]">
                    Dupla selecionada
                  </span>
                  <h3 className="mt-1.5 text-lg sm:text-xl font-bold text-[#1A3A6B] break-words" style={{ fontFamily: 'Georgia, serif' }}>
                    {duplaSelecionada.nome}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1 font-semibold text-[#1A3A6B]">
                      Igreja: {duplaSelecionada.igreja}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1">
                      Distrito: {duplaSelecionada.distrito}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1">
                      Região: {duplaSelecionada.regiao}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start">
                  <button
                    type="button"
                    className="btn-outline px-3.5 py-2 text-xs"
                    onClick={() => abrirModalDupla(duplaSelecionada, duplaSelecionada.batismosConfirmados > 0 ? 'real' : 'historico')}
                  >
                    Ver modal da dupla
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-3.5 py-2 text-xs"
                    onClick={() => navigate(`${prefix}/duplas/${duplaSelecionada.id}`)}
                  >
                    Abrir cadastro da dupla
                  </button>
                </div>
              </div>

              {/* 4 Indicadores da Dupla Selecionada */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-teal-100 bg-white p-3.5 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488]">Batismos da dupla</p>
                  <p className="mt-1 text-2xl font-black text-[#0d9488]">{duplaSelecionada.batismosConfirmados}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Confirmados por estudo</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-white p-3.5 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9963A]">Experiência passada</p>
                  <p className="mt-1 text-2xl font-black text-[#C9963A]">{duplaSelecionada.batismosPassados}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Informados no cadastro</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-white p-3.5 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A3A6B]">Estudos em andamento</p>
                  <p className="mt-1 text-2xl font-black text-[#1A3A6B]">{duplaSelecionada.estudosAtivos.length}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Ativos atualmente</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Estudos encerrados</p>
                  <p className="mt-1 text-2xl font-black text-gray-700">{duplaSelecionada.estudosEncerrados.length}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Finalizados pela dupla</p>
                </div>
              </div>

              {/* Abas de filtro da dupla */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  ['todos', 'Tudo da dupla'],
                  ['batismos', `Batismos (${duplaSelecionada.alunosBatizados.length})`],
                  ['ativos', `Estudos em andamento (${duplaSelecionada.estudosAtivos.length})`],
                  ['encerrados', `Estudos encerrados (${duplaSelecionada.estudosEncerrados.length})`],
                ].map(([idAba, labelAba]) => {
                  const ativa = abaDuplaSelecionada === idAba;
                  return (
                    <button
                      key={idAba}
                      type="button"
                      onClick={() => setAbaDuplaSelecionada(idAba)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        ativa
                          ? 'bg-[#1A3A6B] text-white shadow-xs'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1A3A6B]/40 hover:text-[#1A3A6B]'
                      }`}
                    >
                      {labelAba}
                    </button>
                  );
                })}
              </div>

              {/* Conteúdo detalhado da Dupla: Batismos, Estudos em andamento e Estudos encerrados */}
              <div className={`grid grid-cols-1 gap-4 ${abaDuplaSelecionada === 'todos' ? 'xl:grid-cols-3' : ''}`}>
                {(abaDuplaSelecionada === 'todos' || abaDuplaSelecionada === 'batismos') && (
                  <div className="rounded-xl border border-gray-200/80 bg-white p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d9488]">
                        Batismos da dupla ({duplaSelecionada.alunosBatizados.length})
                      </h4>
                      {duplaSelecionada.batismosPassados > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          +{duplaSelecionada.batismosPassados} no passado
                        </span>
                      )}
                    </div>
                    {duplaSelecionada.alunosBatizados.length > 0 ? (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {duplaSelecionada.alunosBatizados.map((aluno) => (
                          <div key={aluno.id} className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#1A3A6B] break-words">{aluno.nome}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {tipoLabel[aluno.tipoEstudo] || aluno.tipoEstudo} • {getSerieNome(aluno.serie)}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Igreja: {duplaSelecionada.igreja}</p>
                                {aluno.encerradoEm && (
                                  <p className="text-[11px] font-semibold text-[#0d9488] mt-1">
                                    Batizado / encerrado em {new Date(aluno.encerradoEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                  </p>
                                )}
                              </div>
                              <BadgeClasse classe={aluno.classificacao} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[#F4F5F7] px-3 py-6 text-center text-xs text-gray-400">
                        Nenhum batismo confirmado por encerramento de estudo nesta dupla.
                        {duplaSelecionada.batismosPassados > 0 && (
                          <p className="mt-1 font-semibold text-amber-700">
                            Possui {duplaSelecionada.batismosPassados} batismo(s) informado(s) como experiência passada.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(abaDuplaSelecionada === 'todos' || abaDuplaSelecionada === 'ativos') && (
                  <div className="rounded-xl border border-gray-200/80 bg-white p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A3A6B]">
                        Estudos em andamento ({duplaSelecionada.estudosAtivos.length})
                      </h4>
                    </div>
                    {duplaSelecionada.estudosAtivos.length > 0 ? (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {duplaSelecionada.estudosAtivos.map((estudo) => (
                          <div key={estudo.id} className="rounded-lg border border-gray-100 bg-[#F8FAFC] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#1A3A6B] break-words">{estudo.nomeEstudante}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {tipoLabel[estudo.tipoEstudo] || estudo.tipoEstudo} • {getSerieNome(estudo.serie)}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {getLicaoLabel(estudo.serie, estudo.licaoAtual)}
                                </p>
                              </div>
                              <BadgeClasse classe={estudo.classificacao} />
                            </div>
                            <div className="mt-2.5 flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                                <div className="h-full rounded-full bg-[#C9963A]" style={{ width: `${estudo.progresso}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-600">{estudo.progresso}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[#F4F5F7] px-3 py-6 text-center text-xs text-gray-400">
                        Nenhum estudo em andamento para esta dupla.
                      </div>
                    )}
                  </div>
                )}

                {(abaDuplaSelecionada === 'todos' || abaDuplaSelecionada === 'encerrados') && (
                  <div className="rounded-xl border border-gray-200/80 bg-white p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Estudos encerrados ({duplaSelecionada.estudosEncerrados.length})
                      </h4>
                    </div>
                    {duplaSelecionada.estudosEncerrados.length > 0 ? (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {duplaSelecionada.estudosEncerrados.map((estudo) => (
                          <div key={estudo.id} className="rounded-lg border border-gray-100 bg-[#F8FAFC] p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#1A3A6B] break-words">{estudo.nomeEstudante}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {tipoLabel[estudo.tipoEstudo] || estudo.tipoEstudo} • {getSerieNome(estudo.serie)}
                                </p>
                                {estudo.encerradoEm && (
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    Encerrado em {new Date(estudo.encerradoEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                  </p>
                                )}
                              </div>
                              <BadgeMotivoEncerramento motivo={estudo.motivoEncerramento} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[#F4F5F7] px-3 py-6 text-center text-xs text-gray-400">
                        Nenhum estudo encerrado registrado para esta dupla.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Card Expansível Leve: Batismos por Igreja e Duplas por Igreja */}
        <section className="card overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Batismos por Igreja e Vínculo das Duplas</h2>
                <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-0.5 text-xs font-bold text-[#0d9488]">
                  {batismosPorIgreja.length} igreja{batismosPorIgreja.length === 1 ? '' : 's'} com batismo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Consulte em quais igrejas ocorreram os {resumo.batismosReais} batismos confirmados e quais duplas pertencem a cada igreja.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setCardIgrejasExpandido((atual) => !atual)}
                className="btn-outline px-3.5 py-2 text-xs whitespace-nowrap"
              >
                {cardIgrejasExpandido ? 'Recolher card de igrejas' : `Abrir card por igreja (${batismosPorIgreja.length})`}
              </button>
              <button
                type="button"
                onClick={() => setModalIgrejasAberto(true)}
                className="btn-primary px-3.5 py-2 text-xs whitespace-nowrap"
              >
                Ver em tela cheia (Modal)
              </button>
            </div>
          </div>

          {cardIgrejasExpandido && (
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setFiltroVisaoIgrejas('comBatismo'); setLimiteIgrejas(LIMITE_POR_PAGINA); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      filtroVisaoIgrejas === 'comBatismo'
                        ? 'bg-[#0d9488] text-white'
                        : 'bg-[#F4F5F7] text-gray-600 hover:text-[#1A3A6B]'
                    }`}
                  >
                    Igrejas com batismo ({batismosPorIgreja.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFiltroVisaoIgrejas('todas'); setLimiteIgrejas(LIMITE_POR_PAGINA); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      filtroVisaoIgrejas === 'todas'
                        ? 'bg-[#1A3A6B] text-white'
                        : 'bg-[#F4F5F7] text-gray-600 hover:text-[#1A3A6B]'
                    }`}
                  >
                    Todas as igrejas das duplas ({todasIgrejasAgrupadas.length})
                  </button>
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    className="input-field py-2 text-xs"
                    placeholder="Filtrar igreja, distrito ou dupla..."
                    value={buscaIgreja}
                    onChange={(event) => {
                      setBuscaIgreja(event.target.value);
                      setLimiteIgrejas(LIMITE_POR_PAGINA);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {igrejasVisiveis.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIgrejaDetalheModal(item)}
                    className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-2xs transition hover:border-[#C9963A]/50 hover:shadow-md flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Igreja</p>
                          <h3 className="text-base font-bold text-[#1A3A6B] break-words">{item.igreja}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{item.distrito} • {item.regiao}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
                          item.batismosConfirmados > 0
                            ? 'bg-[#0d9488]/10 text-[#0d9488]'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.batismosConfirmados} batismo{item.batismosConfirmados === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#1A3A6B]/8 px-2 py-0.5 text-[11px] font-semibold text-[#1A3A6B]">
                          {item.todasDuplas.length} dupla{item.todasDuplas.length === 1 ? '' : 's'} na igreja
                        </span>
                        {item.duplasComBatismo.length > 0 && (
                          <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                            {item.duplasComBatismo.length} dupla{item.duplasComBatismo.length === 1 ? '' : 's'} com batismo
                          </span>
                        )}
                        {item.batismosPassados > 0 && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            {item.batismosPassados} no passado
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {item.duplasComBatismo.length > 0 ? 'Duplas com batismo nesta igreja' : 'Duplas vinculadas'}
                        </p>
                        {(item.duplasComBatismo.length > 0 ? item.duplasComBatismo : item.todasDuplas).slice(0, 3).map((dupla) => (
                          <div key={dupla.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate font-medium text-gray-700">{dupla.nome}</span>
                            {dupla.batismos > 0 || dupla.batismosConfirmados > 0 ? (
                              <span className="flex-shrink-0 font-bold text-[#0d9488]">
                                {dupla.batismos || dupla.batismosConfirmados} bat.
                              </span>
                            ) : (
                              <span className="flex-shrink-0 text-[11px] text-gray-400">
                                {dupla.estudosAtivos?.length || 0} ativo(s)
                              </span>
                            )}
                          </div>
                        ))}
                        {(item.duplasComBatismo.length > 3 || (item.duplasComBatismo.length === 0 && item.todasDuplas.length > 3)) && (
                          <p className="text-[11px] font-semibold text-[#C9963A]">
                            + Ver todas as duplas e alunos desta igreja
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-[#1A3A6B]">
                      <span>Abrir detalhes da igreja</span>
                      <span>→</span>
                    </div>
                  </button>
                ))}
              </div>

              {igrejasFiltradas.length === 0 && (
                <div className="rounded-xl bg-[#F4F5F7] px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma igreja encontrada para este filtro.
                </div>
              )}

              {igrejasFiltradas.length > limiteIgrejas && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setLimiteIgrejas((atual) => atual + LIMITE_POR_PAGINA)}
                    className="btn-outline px-4 py-2 text-xs"
                  >
                    Carregar mais igrejas ({igrejasVisiveis.length} de {igrejasFiltradas.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Seção: Batismos das duplas (com alternância rápida Por Dupla / Por Igreja e paginação de 100) */}
        <section className="card overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Batismos das duplas</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Contagem baseada nos estudos encerrados com motivo Batismo ({batismosReaisPorDupla.length} dupla{batismosReaisPorDupla.length === 1 ? '' : 's'} em {batismosPorIgreja.length} igreja{batismosPorIgreja.length === 1 ? '' : 's'}).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 bg-[#F4F5F7] p-0.5">
                <button
                  type="button"
                  onClick={() => setVisaoSecaoBatismos('duplas')}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition min-h-0 ${
                    visaoSecaoBatismos === 'duplas' ? 'bg-white text-[#1A3A6B] shadow-2xs' : 'text-gray-500 hover:text-[#1A3A6B]'
                  }`}
                >
                  Por Dupla ({batismosReaisPorDupla.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisaoSecaoBatismos('igrejas')}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition min-h-0 ${
                    visaoSecaoBatismos === 'igrejas' ? 'bg-white text-[#1A3A6B] shadow-2xs' : 'text-gray-500 hover:text-[#1A3A6B]'
                  }`}
                >
                  Por Igreja ({batismosPorIgreja.length})
                </button>
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#0d9488] bg-[#0d9488]/10 rounded-lg px-3 py-2">
                {resumo.batismosReais} batismos
              </span>
            </div>
          </div>

          {visaoSecaoBatismos === 'duplas' ? (
            <>
              <div className="grid grid-cols-1 gap-3 xl:hidden">
                {batismosReaisVisiveis.map((dupla) => (
                  <button
                    key={dupla.id}
                    type="button"
                    onClick={() => abrirModalDupla(dupla, 'real')}
                    className="rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#C9963A]/40 hover:shadow-sm"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Dupla</p>
                        <p className="break-words text-sm font-bold text-[#1A3A6B]">{dupla.nome}</p>
                        <p className="mt-2 text-xs font-semibold text-gray-600">Igreja: {dupla.igreja}</p>
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
                      <th className="px-4 py-3 text-left">Região</th>
                      <th className="px-4 py-3 text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batismosReaisVisiveis.map((dupla) => (
                      <tr
                        key={dupla.id}
                        className="cursor-pointer border-b border-gray-50 hover:bg-[#F4F5F7]"
                        onClick={() => abrirModalDupla(dupla, 'real')}
                      >
                        <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{dupla.nome}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-3 py-1 text-sm font-bold text-[#0d9488]">
                            {dupla.batismos}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700">{dupla.igreja}</td>
                        <td className="px-4 py-3 text-gray-600">{dupla.distrito}</td>
                        <td className="px-4 py-3 text-gray-600">{dupla.regiao}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="btn-outline px-3 py-2 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirModalDupla(dupla, 'real');
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

              {batismosReaisPorDupla.length > limiteBatismosReais && (
                <div className="mt-4 flex flex-col items-center justify-center gap-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Exibindo {batismosReaisVisiveis.length} de {batismosReaisPorDupla.length} duplas
                  </p>
                  <button
                    type="button"
                    className="btn-outline px-4 py-2 text-xs"
                    onClick={() => setLimiteBatismosReais((atual) => atual + LIMITE_POR_PAGINA)}
                  >
                    Carregar mais (+{LIMITE_POR_PAGINA})
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {batismosPorIgreja.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIgrejaDetalheModal(item)}
                    className="rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#0d9488]/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">Igreja</p>
                        <p className="text-base font-bold text-[#1A3A6B] break-words">{item.igreja}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.distrito} • {item.regiao}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-3 py-1 text-sm font-bold text-[#0d9488] whitespace-nowrap">
                        {item.batismosConfirmados} batismo{item.batismosConfirmados === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 border-t border-gray-100 pt-2.5">
                      {item.duplasComBatismo.map((dupla) => (
                        <div key={dupla.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-gray-700 truncate">{dupla.nome}</span>
                          <span className="font-bold text-[#0d9488] whitespace-nowrap">
                            {dupla.batismos} batismo{dupla.batismos === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              {batismosPorIgreja.length === 0 && (
                <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                  Nenhuma igreja com batismo confirmado pelo encerramento de estudo.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Seção: Experiência de Batismos pelas duplas no passado (Máximo 100 na página + Modal para ver todas) */}
        <section className="card overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Experiência de Batismos pelas duplas no passado</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Lista baseada no campo Batismos Alcançados no passado, preenchido no cadastro da dupla.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 bg-[#F4F5F7] rounded-lg px-3 py-2">
                Exibindo {batismosPassadosVisiveis.length} de {batismosPorDupla.length} duplas
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0d9488] bg-[#0d9488]/10 rounded-lg px-3 py-2">
                {resumo.batismosPassados} batismos
              </span>
              {batismosPorDupla.length > LIMITE_POR_PAGINA && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaModalHistorico('');
                    setLimiteModalHistorico(LIMITE_POR_PAGINA);
                    setModalHistoricoAberto(true);
                  }}
                  className="btn-primary px-3.5 py-2 text-xs whitespace-nowrap"
                >
                  Ver todas ({batismosPorDupla.length})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:hidden">
            {batismosPassadosVisiveis.map((dupla) => (
              <button
                key={dupla.id}
                type="button"
                onClick={() => abrirModalDupla(dupla, 'historico')}
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
                  <th className="px-4 py-3 text-left">Região</th>
                  <th className="px-4 py-3 text-left">Ação</th>
                </tr>
              </thead>
              <tbody>
                {batismosPassadosVisiveis.map((dupla) => (
                  <tr
                    key={dupla.id}
                    className="cursor-pointer border-b border-gray-50 hover:bg-[#F4F5F7]"
                    onClick={() => abrirModalDupla(dupla, 'historico')}
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
                          abrirModalDupla(dupla, 'historico');
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

          {batismosPorDupla.length > LIMITE_POR_PAGINA && (
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-[#F4F5F7] px-4 py-3.5">
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Mostrando as primeiras <strong>{LIMITE_POR_PAGINA}</strong> de <strong>{batismosPorDupla.length}</strong> duplas para manter a página leve.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBuscaModalHistorico('');
                  setLimiteModalHistorico(LIMITE_POR_PAGINA);
                  setModalHistoricoAberto(true);
                }}
                className="btn-primary w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm whitespace-nowrap"
              >
                Ver todas as {batismosPorDupla.length} duplas no modal
              </button>
            </div>
          )}
        </section>

        {/* Seção: Ordem de decisões (Paginação progressiva de 100 em 100 conforme o scroll) */}
        <section className="card overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Ordem de decisões</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Classe A primeiro. Exibindo de {LIMITE_POR_PAGINA} em {LIMITE_POR_PAGINA} conforme você desce a página.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 bg-[#F4F5F7] rounded-lg px-3 py-2">
                Exibindo {rankingVisivel.length} de {ranking.length}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#1A3A6B] bg-[#1A3A6B]/10 rounded-lg px-3 py-2">
                {ranking.length} estudantes
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {rankingVisivel.map((item, index) => {
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
                      <p className="mt-1 text-xs font-medium leading-tight text-gray-500 md:text-[10px] xl:text-xs">
                        {getSerieNome(item.serie)} - {getLicaoLabel(item.serie, item.licaoAtual)}
                      </p>
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
                          className="mt-1.5 inline-flex rounded-full bg-[#0d9488]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0d9488] xl:text-xs min-h-0"
                          onClick={() => abrirModalDupla(batismoRealDaDupla, 'real')}
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

            {/* Sentinela de paginação progressiva por scroll (100 em 100) */}
            {ranking.length > 0 && (
              <div
                ref={sentinelaDecisoesRef}
                className="flex min-h-16 flex-col items-center justify-center gap-2 py-4"
                aria-live="polite"
              >
                {temMaisDecisoes ? (
                  <>
                    <p className="text-xs text-gray-400">
                      Exibindo <strong>{rankingVisivel.length}</strong> de <strong>{ranking.length}</strong> estudantes — role para baixo ou clique para carregar mais
                    </p>
                    <button
                      type="button"
                      onClick={carregarMaisDecisoes}
                      className="btn-outline px-5 py-2 text-xs"
                    >
                      Carregar mais estudantes (+{Math.min(LIMITE_POR_PAGINA, ranking.length - rankingVisivel.length)})
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">
                    Todos os {ranking.length} estudantes foram carregados.
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODAL 1: Experiência de Batismos pelas duplas no passado (Todas as 251 duplas - Acima de toda a página) */}
      {modalHistoricoAberto && createPortal(
        <div
          className="app-modal-overlay"
          onClick={() => setModalHistoricoAberto(false)}
        >
          <div
            className="app-modal-panel max-w-5xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="app-modal-header">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">
                  Lista completa ({batismosPorDupla.length} duplas • {resumo.batismosPassados} batismos)
                </p>
                <h3 className="mt-1 break-words text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  Experiência de Batismos pelas duplas no passado
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-400">
                  Clique em qualquer dupla para abrir os detalhes completos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-[#1A3A6B] hover:text-[#1A3A6B]"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <input
                  type="text"
                  className="input-field py-2 text-sm"
                  placeholder="Filtrar por nome da dupla, igreja, distrito ou região..."
                  value={buscaModalHistorico}
                  onChange={(event) => {
                    setBuscaModalHistorico(event.target.value);
                    setLimiteModalHistorico(LIMITE_POR_PAGINA);
                  }}
                />
                <span className="text-xs font-bold text-[#1A3A6B] whitespace-nowrap">
                  {historicoFiltradoNoModal.length} resultado(s)
                </span>
              </div>
            </div>

            <div className="app-modal-body">
              <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {historicoModalVisivel.map((dupla) => (
                  <button
                    key={dupla.id}
                    type="button"
                    onClick={() => abrirModalDupla(dupla, 'historico')}
                    className="rounded-xl border border-gray-100 bg-white p-3.5 text-left transition hover:border-[#C9963A]/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A3A6B] break-words">{dupla.nome}</p>
                        <p className="mt-1 text-xs font-medium text-gray-600">{dupla.igreja}</p>
                        <p className="text-xs text-gray-400">{dupla.distrito} • {dupla.regiao}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-bold text-[#0d9488] whitespace-nowrap">
                        {dupla.batismos} bat.
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="bg-[#F4F5F7] text-gray-500">
                      <th className="px-4 py-3 text-left">Dupla</th>
                      <th className="px-4 py-3 text-left">Batismos</th>
                      <th className="px-4 py-3 text-left">Igreja</th>
                      <th className="px-4 py-3 text-left">Distrito</th>
                      <th className="px-4 py-3 text-left">Região</th>
                      <th className="px-4 py-3 text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoModalVisivel.map((dupla) => (
                      <tr
                        key={dupla.id}
                        className="cursor-pointer border-b border-gray-50 hover:bg-[#F4F5F7]"
                        onClick={() => abrirModalDupla(dupla, 'historico')}
                      >
                        <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{dupla.nome}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-[#0d9488]/10 px-3 py-1 text-xs font-bold text-[#0d9488]">
                            {dupla.batismos}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{dupla.igreja}</td>
                        <td className="px-4 py-3 text-gray-600">{dupla.distrito}</td>
                        <td className="px-4 py-3 text-gray-600">{dupla.regiao}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="btn-outline px-3 py-1.5 text-xs min-h-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirModalDupla(dupla, 'historico');
                            }}
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {historicoFiltradoNoModal.length === 0 && (
                <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                  Nenhuma dupla encontrada para a busca informada.
                </div>
              )}

              {historicoFiltradoNoModal.length > limiteModalHistorico && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    className="btn-outline px-4 py-2 text-xs"
                    onClick={() => setLimiteModalHistorico((atual) => atual + LIMITE_POR_PAGINA)}
                  >
                    Carregar mais (+{LIMITE_POR_PAGINA})
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-4 py-2 text-xs"
                    onClick={() => setLimiteModalHistorico(historicoFiltradoNoModal.length)}
                  >
                    Mostrar todas as {historicoFiltradoNoModal.length}
                  </button>
                </div>
              )}
            </div>

            <div className="app-modal-footer">
              <button
                type="button"
                className="btn-outline px-4 py-2 text-sm"
                onClick={() => setModalHistoricoAberto(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Visão Geral de Batismos por Igreja e Duplas por Igreja (Acima de toda a página) */}
      {modalIgrejasAberto && createPortal(
        <div
          className="app-modal-overlay"
          onClick={() => setModalIgrejasAberto(false)}
        >
          <div
            className="app-modal-panel max-w-5xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="app-modal-header">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">
                  Visão por Igreja ({batismosPorIgreja.length} igrejas com batismo • {resumo.batismosReais} batismos)
                </p>
                <h3 className="mt-1 break-words text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  Batismos por Igreja e Vínculo das Duplas
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-400">
                  Selecione uma igreja para ver todas as duplas e os estudantes batizados vinculados a ela.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalIgrejasAberto(false)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-[#1A3A6B] hover:text-[#1A3A6B]"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-gray-100 bg-white px-4 py-3 sm:px-5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiltroVisaoIgrejas('comBatismo')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition min-h-0 ${
                      filtroVisaoIgrejas === 'comBatismo'
                        ? 'bg-[#0d9488] text-white'
                        : 'bg-[#F4F5F7] text-gray-600 hover:text-[#1A3A6B]'
                    }`}
                  >
                    Com batismo confirmado ({batismosPorIgreja.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroVisaoIgrejas('todas')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition min-h-0 ${
                      filtroVisaoIgrejas === 'todas'
                        ? 'bg-[#1A3A6B] text-white'
                        : 'bg-[#F4F5F7] text-gray-600 hover:text-[#1A3A6B]'
                    }`}
                  >
                    Todas as igrejas e suas duplas ({todasIgrejasAgrupadas.length})
                  </button>
                </div>
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    className="input-field py-2 text-xs"
                    placeholder="Buscar igreja, distrito ou dupla..."
                    value={buscaIgreja}
                    onChange={(event) => setBuscaIgreja(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="app-modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {igrejasFiltradas.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIgrejaDetalheModal(item)}
                    className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-2xs transition hover:border-[#0d9488]/50 hover:shadow-md flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Igreja</p>
                          <h4 className="text-base font-bold text-[#1A3A6B] break-words">{item.igreja}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{item.distrito} • {item.regiao}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
                          item.batismosConfirmados > 0
                            ? 'bg-[#0d9488]/10 text-[#0d9488]'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.batismosConfirmados} batismo{item.batismosConfirmados === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-[#1A3A6B]/8 px-2 py-0.5 text-[11px] font-semibold text-[#1A3A6B]">
                          {item.todasDuplas.length} dupla{item.todasDuplas.length === 1 ? '' : 's'} na igreja
                        </span>
                        {item.duplasComBatismo.length > 0 && (
                          <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                            {item.duplasComBatismo.length} com batismo confirmado
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5">
                        {(item.duplasComBatismo.length > 0 ? item.duplasComBatismo : item.todasDuplas).slice(0, 4).map((dupla) => (
                          <div key={dupla.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate font-medium text-gray-700">{dupla.nome}</span>
                            <span className="flex-shrink-0 font-bold text-[#0d9488]">
                              {(dupla.batismos || dupla.batismosConfirmados || 0) > 0
                                ? `${dupla.batismos || dupla.batismosConfirmados} bat.`
                                : `${dupla.estudosAtivos?.length || 0} est.`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-[#1A3A6B]">
                      <span>Ver todas as duplas e batismos da igreja</span>
                      <span>→</span>
                    </div>
                  </button>
                ))}
              </div>

              {igrejasFiltradas.length === 0 && (
                <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                  Nenhuma igreja encontrada para os critérios informados.
                </div>
              )}
            </div>

            <div className="app-modal-footer">
              <button
                type="button"
                className="btn-outline px-4 py-2 text-sm"
                onClick={() => setModalIgrejasAberto(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Detalhes de uma Igreja Específica (Duplas da Igreja + Batismos na Igreja) */}
      {igrejaDetalheModal && createPortal(
        <div
          className="app-modal-overlay"
          onClick={() => setIgrejaDetalheModal(null)}
        >
          <div
            className="app-modal-panel max-w-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="app-modal-header">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">
                  Detalhamento por Igreja
                </p>
                <h3 className="mt-1 break-words text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {igrejaDetalheModal.igreja}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  {igrejaDetalheModal.distrito} • {igrejaDetalheModal.regiao}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIgrejaDetalheModal(null)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-[#1A3A6B] hover:text-[#1A3A6B]"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="app-modal-body space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#0d9488]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">Batismos na igreja</p>
                  <p className="mt-1.5 text-3xl font-black text-[#0d9488]">{igrejaDetalheModal.batismosConfirmados}</p>
                </div>
                <div className="rounded-xl bg-[#1A3A6B]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#1A3A6B]">Duplas da igreja</p>
                  <p className="mt-1.5 text-3xl font-black text-[#1A3A6B]">{igrejaDetalheModal.todasDuplas.length}</p>
                </div>
                <div className="rounded-xl bg-[#C9963A]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Experiência passada</p>
                  <p className="mt-1.5 text-3xl font-black text-[#C9963A]">{igrejaDetalheModal.batismosPassados}</p>
                </div>
              </div>

              {/* Alunos batizados nesta igreja */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5">
                  Estudantes batizados nesta igreja ({igrejaDetalheModal.alunosBatizados.length})
                </h4>
                {igrejaDetalheModal.alunosBatizados.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {igrejaDetalheModal.alunosBatizados.map((aluno) => (
                      <div key={aluno.id} className="rounded-xl border border-teal-100 bg-teal-50/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1A3A6B] break-words">{aluno.nome}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Dupla: <span className="font-semibold text-gray-700">{aluno.duplaNome}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {tipoLabel[aluno.tipoEstudo] || aluno.tipoEstudo} • {getSerieNome(aluno.serie)}
                            {aluno.encerradoEm ? ` • Encerrado em ${new Date(aluno.encerradoEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}
                          </p>
                        </div>
                        <BadgeClasse classe={aluno.classificacao} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F4F5F7] px-4 py-6 text-center text-sm text-gray-400">
                    Nenhum batismo confirmado por encerramento de estudo nesta igreja.
                  </div>
                )}
              </div>

              {/* Todas as duplas pertencentes a esta igreja */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5">
                  Duplas vinculadas à igreja {igrejaDetalheModal.igreja} ({igrejaDetalheModal.todasDuplas.length})
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {igrejaDetalheModal.todasDuplas.map((dupla) => (
                    <button
                      key={dupla.id}
                      type="button"
                      onClick={() => abrirModalDupla(dupla, dupla.batismosConfirmados > 0 ? 'real' : 'historico')}
                      className="rounded-xl border border-gray-100 bg-white p-3.5 text-left shadow-2xs transition hover:border-[#1A3A6B]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A3A6B] break-words">{dupla.nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {dupla.estudosAtivos.length} estudo(s) ativo(s) • {dupla.estudosEncerrados.length} encerrado(s)
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                        {dupla.batismosConfirmados > 0 && (
                          <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-bold text-[#0d9488]">
                            {dupla.batismosConfirmados} batismo(s)
                          </span>
                        )}
                        {dupla.batismosPassados > 0 && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            {dupla.batismosPassados} no passado
                          </span>
                        )}
                        <span className="btn-outline px-2.5 py-1 text-xs min-h-0">Ver dupla</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="app-modal-footer">
              <button
                type="button"
                className="btn-outline px-4 py-2 text-sm"
                onClick={() => setIgrejaDetalheModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: Detalhes da Dupla (Acima de toda a página via Portal) */}
      {duplaModal && createPortal(
        <div
          className="app-modal-overlay"
          onClick={() => setDuplaModal(null)}
        >
          <div
            className="app-modal-panel max-w-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="app-modal-header">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">
                  {duplaModal.tipo === 'real' ? 'Batismos confirmados e Estudos da Dupla' : 'Experiência passada e Estudos da Dupla'}
                </p>
                <h3 className="mt-1 break-words text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {duplaModal.nome}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  <strong className="text-[#1A3A6B]">Igreja:</strong> {duplaModal.igreja} • {duplaModal.distrito} • {duplaModal.regiao}
                </p>
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

            <div className="app-modal-body space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-[#0d9488]/10 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0d9488]">
                    Batismos da dupla
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-[#0d9488]">
                    {perfilDuplaModal ? perfilDuplaModal.batismosConfirmados : (duplaModal.tipo === 'real' ? duplaModal.batismos : 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#C9963A]/10 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#C9963A]">
                    No passado
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-[#C9963A]">
                    {perfilDuplaModal ? perfilDuplaModal.batismosPassados : (duplaModal.tipo === 'historico' ? duplaModal.batismos : 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1A3A6B]/10 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#1A3A6B]">
                    Estudos ativos
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-[#1A3A6B]">
                    {perfilDuplaModal ? perfilDuplaModal.estudosAtivos.length : estudantesClasseADaDupla.length}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-100 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Encerrados
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-gray-700">
                    {perfilDuplaModal ? perfilDuplaModal.estudosEncerrados.length : alunosBatizadosDaDupla.length}
                  </p>
                </div>
              </div>

              {duplaModal.tipo === 'real' ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
                  Origem do número: estudos encerrados com o motivo Batismo na igreja <strong>{duplaModal.igreja}</strong>. Os nomes abaixo são os alunos vinculados aos estudos encerrados dessa forma.
                </div>
              ) : (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
                  Origem do número: campo Batismos Alcançados no passado no cadastro da dupla ({duplaModal.igreja}). Este registro é histórico e abaixo também estão listados os estudos atuais e encerrados da dupla.
                </div>
              )}

              {/* Alunos batizados */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#0d9488]">
                  Alunos batizados pela dupla ({alunosBatizadosDaDupla.length})
                </h4>
                {alunosBatizadosDaDupla.length > 0 ? (
                  <div className="mt-2.5 grid gap-2.5">
                    {alunosBatizadosDaDupla.map((aluno) => (
                      <div key={aluno.id} className="rounded-lg border border-teal-100 bg-teal-50/30 p-3.5 shadow-2xs">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-[#1A3A6B]">{aluno.nome}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {tipoLabel[aluno.tipoEstudo] || aluno.tipoEstudo} - {getSerieNome(aluno.serie)}
                            </p>
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
                  <div className="mt-2.5 rounded-lg bg-[#F4F5F7] px-4 py-6 text-center text-xs text-gray-400">
                    Nenhum aluno batizado por encerramento de estudo registrado para esta dupla.
                  </div>
                )}
              </div>

              {/* Estudos em andamento da dupla */}
              {perfilDuplaModal && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#1A3A6B]">
                    Estudos em andamento da dupla ({perfilDuplaModal.estudosAtivos.length})
                  </h4>
                  {perfilDuplaModal.estudosAtivos.length > 0 ? (
                    <div className="mt-2.5 grid gap-2.5">
                      {perfilDuplaModal.estudosAtivos.map((estudo) => (
                        <div key={estudo.id} className="rounded-lg border border-gray-100 bg-white p-3.5 shadow-2xs">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold text-[#1A3A6B]">{estudo.nomeEstudante}</p>
                              <p className="mt-0.5 text-xs text-gray-400">
                                {tipoLabel[estudo.tipoEstudo] || estudo.tipoEstudo} - {getSerieNome(estudo.serie)} ({getLicaoLabel(estudo.serie, estudo.licaoAtual)})
                              </p>
                            </div>
                            <BadgeClasse classe={estudo.classificacao} />
                          </div>
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-[#C9963A]" style={{ width: `${estudo.progresso}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-600">{estudo.progresso}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2.5 rounded-lg bg-[#F4F5F7] px-4 py-6 text-center text-xs text-gray-400">
                      Nenhum estudo em andamento para esta dupla.
                    </div>
                  )}
                </div>
              )}

              {/* Estudos encerrados da dupla */}
              {perfilDuplaModal && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Estudos encerrados da dupla ({perfilDuplaModal.estudosEncerrados.length})
                  </h4>
                  {perfilDuplaModal.estudosEncerrados.length > 0 ? (
                    <div className="mt-2.5 grid gap-2.5">
                      {perfilDuplaModal.estudosEncerrados.map((estudo) => (
                        <div key={estudo.id} className="rounded-lg border border-gray-100 bg-white p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-[#1A3A6B]">{estudo.nomeEstudante}</p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {tipoLabel[estudo.tipoEstudo] || estudo.tipoEstudo} - {getSerieNome(estudo.serie)}
                              {estudo.encerradoEm ? ` • Encerrado em ${new Date(estudo.encerradoEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}
                            </p>
                          </div>
                          <BadgeMotivoEncerramento motivo={estudo.motivoEncerramento} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2.5 rounded-lg bg-[#F4F5F7] px-4 py-6 text-center text-xs text-gray-400">
                      Nenhum estudo encerrado registrado para esta dupla.
                    </div>
                  )}
                </div>
              )}
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
        </div>,
        document.body
      )}
    </div>
  );
}
