import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../lib/toast';

const Icone = ({ children, cor = '#1A3A6B' }) => (
  <div
    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
    style={{ backgroundColor: `${cor}12`, color: cor }}
  >
    {children}
  </div>
);

const GaugeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13a8 8 0 1116 0M12 13l4-4M7 17h10" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.25A6.75 6.75 0 005.25 3H4.5A1.5 1.5 0 003 4.5v13.25A2.25 2.25 0 005.25 20H6a6 6 0 016 3m0-16.75A6.75 6.75 0 0118.75 3h.75A1.5 1.5 0 0121 4.5v13.25A2.25 2.25 0 0118.75 20H18a6 6 0 00-6 3" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20a4 4 0 00-8 0M12 12a4 4 0 100-8 4 4 0 000 8zm7 8a3 3 0 00-4.5-2.6M5 20a3 3 0 014.5-2.6M18 11a3 3 0 100-6M6 11a3 3 0 110-6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-7 4h8m-8 4h8m-8 4h5M9 3h6a2 2 0 012 2h1a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h1a2 2 0 012-2z" />
  </svg>
);

const VisitIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7-7.5 10.5-7.5 10.5S4.5 17.5 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

function Indicador({ label, valor, detalhe, cor, icon }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start gap-3">
        <Icone cor={cor}>{icon}</Icone>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight" style={{ color: cor }}>{numero(valor)}</p>
          <p className="text-sm font-semibold text-[#1A3A6B] mt-1">{label}</p>
          {detalhe && <p className="text-xs text-gray-400 mt-1">{detalhe}</p>}
        </div>
      </div>
    </div>
  );
}

function ClasseResumo({ classe, valor, cor, bg }) {
  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: bg, borderColor: `${cor}30` }}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold" style={{ color: cor }}>Classe {classe}</span>
        <span className="text-xl font-bold" style={{ color: cor }}>{numero(valor)}</span>
      </div>
    </div>
  );
}

function Painel({ titulo, subtitulo, cor, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100" style={{ borderTop: `4px solid ${cor}` }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: cor }}>{subtitulo}</p>
        <h2 className="text-xl font-bold text-[#1A3A6B] mt-1" style={{ fontFamily: 'Georgia, serif' }}>
          {titulo}
        </h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function DashboardAssociacao() {
  const location = useLocation();
  const { usuario } = useAuth();
  const isDireto = location.pathname.startsWith('/direto');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formEscola, setFormEscola] = useState({
    unidadesAcao: 0,
    classeProfessores: 0,
    classeInteressados: 0,
    visitasDiretores: 0,
    visitasProfessores: 0,
    visitasAlunos: 0,
    quantidadePequenosGrupos: 0,
  });

  useEffect(() => {
    api.get('/relatorios/dashboard-associacao')
      .then((res) => {
        setDados(res.data);
        const escolaAtual = res.data?.escolaSabatina || {};
        const visitasAtuais = escolaAtual.visitasRealizadas || {};
        setFormEscola({
          unidadesAcao: escolaAtual.unidadesAcao || 0,
          classeProfessores: escolaAtual.classeProfessores || 0,
          classeInteressados: escolaAtual.classeInteressados || 0,
          visitasDiretores: visitasAtuais.diretores || 0,
          visitasProfessores: visitasAtuais.professores || 0,
          visitasAlunos: visitasAtuais.alunos || 0,
          quantidadePequenosGrupos: escolaAtual.quantidadePequenosGrupos || 0,
        });
      })
      .finally(() => setCarregando(false));
  }, []);

  const ministerio = dados?.ministerioPessoal || {};
  const escola = dados?.escolaSabatina || {};
  const visitas = escola.visitasRealizadas || {};

  const visitasDetalhe = useMemo(() => ([
    { label: 'Diretores', valor: visitas.diretores || 0, cor: '#1A3A6B' },
    { label: 'Professores', valor: visitas.professores || 0, cor: '#C9963A' },
    { label: 'Alunos', valor: visitas.alunos || 0, cor: '#0d9488' },
  ]), [visitas.alunos, visitas.diretores, visitas.professores]);

  const podeEditarEscola = ['ADMINISTRADOR', 'LIDER_REGIOES'].includes(usuario?.perfil);

  const setCampoEscola = (campo, valor) => {
    setFormEscola((prev) => ({ ...prev, [campo]: valor }));
  };

  const salvarEscolaSabatina = async () => {
    setSalvando(true);
    try {
      await api.patch('/relatorios/escola-sabatina-resumo', formEscola);
      const { data } = await api.get('/relatorios/dashboard-associacao');
      setDados(data);
      setEditando(false);
      toast.success('Resumo da Escola Sabatina atualizado.');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar Escola Sabatina.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20 border-t-[#1A3A6B] animate-spin" />
      </div>
    );
  }

  return (
    <div className={isDireto ? 'h-full overflow-y-auto bg-[#F4F5F7] p-4 sm:p-6 animate-fade-in' : 'animate-fade-in'}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Associação Paulistana</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Ministério Pessoal e Escola Sabatina
        </h1>
        <p className="text-gray-400 text-sm mt-1">Visão de resumo solicitada no planejamento das mudanças.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Painel titulo="Ministério Pessoal" subtitulo="Painel esquerdo" cor="#1A3A6B">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Indicador label="Atas duplas" valor={ministerio.atasDuplas} cor="#1A3A6B" icon={<ClipboardIcon />} />
            <Indicador label="Qtidade estudos" valor={ministerio.quantidadeEstudos} cor="#0284c7" icon={<BookIcon />} />
            <Indicador label="Qtidade classes" valor={ministerio.quantidadeClasses} cor="#7B2D8B" icon={<UsersIcon />} />
            <Indicador label="Pontos estudos bíblicos" valor={ministerio.quantidadePontosEstudos} cor="#0d9488" icon={<GaugeIcon />} />
            <div className="sm:col-span-2">
              <Indicador
                label="Qtidade de pessoas estudando"
                valor={ministerio.quantidadePessoasEstudando}
                detalhe="Soma estudos únicos e participantes de pontos/classes."
                cor="#C9963A"
                icon={<UsersIcon />}
              />
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Sub-classificações de classes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ClasseResumo classe="A" valor={ministerio.classes?.A} cor="#16a34a" bg="#dcfce7" />
              <ClasseResumo classe="B" valor={ministerio.classes?.B} cor="#b45309" bg="#fef3c7" />
              <ClasseResumo classe="C" valor={ministerio.classes?.C} cor="#dc2626" bg="#fee2e2" />
            </div>
          </div>
        </Painel>

        <Painel titulo="Escola Sabatina" subtitulo="Painel direito" cor="#C9963A">
          {podeEditarEscola && (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setEditando((atual) => !atual)}
                className="btn-outline text-xs px-3 py-2"
              >
                {editando ? 'Fechar edição' : 'Atualizar dados'}
              </button>
            </div>
          )}

          {editando && (
            <div className="bg-[#F4F5F7] rounded-lg p-4 border border-gray-100 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['unidadesAcao', 'Unidades de ação'],
                  ['classeProfessores', 'Classe dos professores'],
                  ['classeInteressados', 'Classe de interessados'],
                  ['quantidadePequenosGrupos', 'Quantidade de Pequenos Grupos'],
                  ['visitasDiretores', 'Visitas dos diretores'],
                  ['visitasProfessores', 'Visitas dos professores'],
                  ['visitasAlunos', 'Visitas dos alunos'],
                ].map(([campo, label]) => (
                  <label key={campo} className="block">
                    <span className="block text-xs font-semibold text-gray-500 mb-1">{label}</span>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formEscola[campo]}
                      onChange={(e) => setCampoEscola(campo, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn-outline text-xs px-3 py-2" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary text-xs px-3 py-2" onClick={salvarEscolaSabatina} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar Escola Sabatina'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Indicador label="Unidades de ação" valor={escola.unidadesAcao} cor="#1A3A6B" icon={<UsersIcon />} />
            <Indicador label="Classe dos professores" valor={escola.classeProfessores} cor="#7B2D8B" icon={<BookIcon />} />
            <Indicador label="Classe de interessados" valor={escola.classeInteressados} cor="#0d9488" icon={<UsersIcon />} />
            <Indicador label="Pequenos Grupos" valor={escola.quantidadePequenosGrupos} cor="#C9963A" icon={<GaugeIcon />} />
          </div>

          <div className="mt-5 bg-[#F4F5F7] rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#1A3A6B]">Visitas realizadas</h3>
                <p className="text-xs text-gray-400">Detalhamento por responsáveis</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#1A3A6B]">{numero(visitas.total)}</p>
                <p className="text-xs text-gray-400">total</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {visitasDetalhe.map((item) => (
                <div key={item.label} className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Icone cor={item.cor}><VisitIcon /></Icone>
                    <span className="text-xs font-semibold text-gray-500">{item.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: item.cor }}>{numero(item.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        </Painel>
      </div>
    </div>
  );
}
