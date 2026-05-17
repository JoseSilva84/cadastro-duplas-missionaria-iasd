import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from '../lib/toast';
import api from '../lib/api';

const TIPOS_PROJETO = [
  { value: 'CASA_A_CASA', label: 'Casa a Casa', icon: '🏠' },
  { value: 'PEQUENOS_GRUPOS', label: 'Pequenos Grupos', icon: '👥' },
  { value: 'ACAO_SOCIAL', label: 'Ação Social', icon: '🤲' },
  { value: 'EVANGELISMO_PUBLICO', label: 'Evangelismo Público', icon: '📢' },
];

const TIPOS_MEMBRO2 = [
  { value: 'MEMBRO_IASD', label: 'Membro da IASD', icon: '✝️' },
];

const Campo = ({ label, obrigatorio, children, icone }) => (
  <div className="group/campo">
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5 group-focus-within/campo:text-[#1A3A6B] transition-colors">
      {icone && <span className="text-sm">{icone}</span>}
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

const SecaoHeader = ({ numero, titulo, descricao }) => (
  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
      {numero}
    </div>
    <div>
      <h2 className="font-bold text-[#1A3A6B]">{titulo}</h2>
      {descricao && <p className="text-xs text-gray-400">{descricao}</p>}
    </div>
  </div>
);

const formVazio = {
  regiaoNome: '',
  distritoId: '',
  igrejaId: '',
  bairro: '',
  tipoProjeto: '',
  liderNome: '',
  liderTelefone: '',
  liderEmail: '',
  liderIgreja: '',
  membro2Tipo: 'MEMBRO_IASD',
  membro2Nome: '',
  membro2Telefone: '',
  status: 'ATIVA',
  pessoasAlcancadas: 0,
  estudoBiblico: '',
  statusEstudoBiblico: '',
  statusEvangelismo: '',
  batismos: 0,
  observacoes: '',
  dataInicio: new Date().toISOString().split('T')[0],
};

export default function Cadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isDireto = location.pathname.startsWith('/direto');
  const isEdicao = !!id;

  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(isEdicao);

  const [form, setForm] = useState({ ...formVazio });

  // Pega query params (ex: ?distritoId=...&igrejaId=...)
  useEffect(() => {
    if (!isEdicao) {
      const searchParams = new URLSearchParams(location.search);
      const distritoId = searchParams.get('distritoId');
      const igrejaId = searchParams.get('igrejaId');
      if (distritoId || igrejaId) {
        setForm(prev => ({
          ...prev,
          ...(distritoId && { distritoId }),
          ...(igrejaId && { igrejaId })
        }));
      }
    }
  }, [location.search, isEdicao]);

  // Carrega lista de distritos
  useEffect(() => {
    api.get('/distritos').then((r) => setDistritos(r.data));
  }, []);

  // Carrega dados da dupla se for edição
  useEffect(() => {
    if (!isEdicao) {
      setCarregando(false);
      return;
    }
    api.get(`/duplas/${id}`)
      .then((r) => {
        const d = r.data;
        setForm({
          regiaoNome: d.regiaoNome || d.distrito?.regiao?.nome || '',
          distritoId: d.distritoId || '',
          igrejaId: d.igrejaId || '',
          bairro: d.bairro || '',
          tipoProjeto: d.tipoProjeto || '',
          liderNome: d.liderNome || '',
          liderTelefone: d.liderTelefone || '',
          liderEmail: d.liderEmail || '',
          liderIgreja: d.liderIgreja || '',
          membro2Tipo: d.membro2Tipo || 'MEMBRO_IASD',
          membro2Nome: d.membro2Nome || '',
          membro2Telefone: d.membro2Telefone || '',
          status: d.status || 'ATIVA',
          pessoasAlcancadas: d.pessoasAlcancadas || 0,
          estudoBiblico: d.estudoBiblico || '',
          statusEstudoBiblico: d.statusEstudoBiblico || '',
          statusEvangelismo: d.statusEvangelismo || '',
          batismos: d.batismos || 0,
          observacoes: d.observacoes || '',
          dataInicio: d.dataInicio ? new Date(d.dataInicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        });
      })
      .catch(() => {
        toast.error('Erro ao carregar dados da dupla.');
      })
      .finally(() => {
        setCarregando(false);
      });
  }, [id, isEdicao]);

  // Carrega igrejas quando distrito muda
  useEffect(() => {
    if (form.distritoId) {
      api.get(`/distritos/${form.distritoId}`).then((r) => {
        setIgrejas(r.data.igrejas || []);
        setForm((prev) => ({ ...prev, regiaoNome: r.data.regiao?.nome || '' }));
      });
    } else {
      setIgrejas([]);
    }
  }, [form.distritoId]);

  const set = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      if (isEdicao) {
        await api.put(`/duplas/${id}`, form);
        toast.success('Dupla atualizada com sucesso!');
      } else {
        await api.post('/duplas', form);
        toast.success('Dupla cadastrada com sucesso!');
      }
      const redirectTo = isDireto ? '/direto/duplas' : '/duplas';
      setTimeout(() => navigate(redirectTo), 1000);
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : `Erro ao ${isEdicao ? 'atualizar' : 'salvar'} a dupla.`);
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando dados...</p>
        </div>
      </div>
    );
  }



  return (
    <div className={isDireto ? "flex flex-col h-full animate-fade-in" : "p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in"}>
      {/* Cabeçalho */}
      <div className={isDireto ? "flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 z-10" : "mb-8 animate-fade-in-down"}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">
            {isEdicao ? 'Edição' : 'Formulário'}
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          {isEdicao ? 'Editar Dupla' : 'Cadastro de Dupla'}
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">
          {isEdicao ? 'Atualize os dados da dupla missionária' : 'Preencha os dados da nova dupla missionária'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={isDireto ? "flex-1 flex flex-col min-h-0" : "space-y-6"}>
        <div className={isDireto ? "flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-[#F4F5F7] master-detail-scroll" : ""}>
          <div className={isDireto ? "flex gap-4 w-max min-h-full pb-2" : "space-y-6"}>
            {/* SEÇÃO 1 — Localização */}
            <div className={`card animate-fade-in-up ${isDireto ? 'w-[320px] sm:w-[360px] flex-shrink-0' : ''}`} style={{ animationDelay: '100ms' }}>
              <SecaoHeader numero="1" titulo="Localização" descricao="Região, distrito e bairro de atuação da dupla" />
              <div className={`grid grid-cols-1 ${isDireto ? '' : 'sm:grid-cols-2'} gap-4`}>
                <Campo label="Distrito" obrigatorio icone="🏛️">
                  <select className="input-field" value={form.distritoId} onChange={(e) => set('distritoId', e.target.value)} required>
                    <option value="">Selecione o distrito</option>
                    {distritos.map((d) => (
                      <option key={d.id} value={d.id}>{d.nome} — {d.regiao?.nome}</option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Igreja / Congregação" icone="⛪">
                  <select className="input-field" value={form.igrejaId} onChange={(e) => set('igrejaId', e.target.value)} disabled={!form.distritoId}>
                    <option value="">Selecione a igreja</option>
                    {igrejas.map((ig) => (<option key={ig.id} value={ig.id}>{ig.nome}</option>))}
                  </select>
                </Campo>

                <Campo label="Bairro de Atuação" obrigatorio icone="📍">
                  <input type="text" className="input-field" placeholder="Ex: Santana, Gonzaga..." value={form.bairro} onChange={(e) => set('bairro', e.target.value)} required />
                </Campo>

                <Campo label="Tipo de Projeto" obrigatorio icone="📋">
                  <select className="input-field" value={form.tipoProjeto} onChange={(e) => set('tipoProjeto', e.target.value)} required>
                    <option value="">Selecione o tipo</option>
                    {TIPOS_PROJETO.map((t) => (<option key={t.value} value={t.value}>{t.icon} {t.label}</option>))}
                  </select>
                </Campo>

                <Campo label="Data de Início" icone="📅">
                  <input type="date" className="input-field" value={form.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} />
                </Campo>

                <Campo label="Status" icone="📊">
                  <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
                    <option value="ATIVA">✅ Ativa</option>
                    <option value="PENDENTE">⏳ Pendente</option>
                    <option value="INATIVA">⏸️ Inativa</option>
                  </select>
                </Campo>
              </div>
            </div>

            {/* SEÇÃO 2 — Líder */}
            <div className={`card animate-fade-in-up ${isDireto ? 'w-[320px] sm:w-[360px] flex-shrink-0' : ''}`} style={{ animationDelay: '200ms' }}>
              <SecaoHeader numero="2" titulo="Membro 1 — Líder" descricao="Dados do líder responsável pela dupla" />
              <div className={`grid grid-cols-1 ${isDireto ? '' : 'sm:grid-cols-2'} gap-4`}>
                <Campo label="Nome Completo" obrigatorio icone="👤">
                  <input type="text" className="input-field" placeholder="Nome do líder" value={form.liderNome} onChange={(e) => set('liderNome', e.target.value)} required />
                </Campo>
                <Campo label="Telefone" icone="📱">
                  <input type="tel" className="input-field" placeholder="(11) 99999-0000" value={form.liderTelefone} onChange={(e) => set('liderTelefone', e.target.value)} />
                </Campo>
                <Campo label="E-mail" icone="✉️">
                  <input type="email" className="input-field" placeholder="lider@email.com" value={form.liderEmail} onChange={(e) => set('liderEmail', e.target.value)} />
                </Campo>
                <Campo label="Igreja / Congregação" icone="⛪">
                  <input type="text" className="input-field" placeholder="Igreja do líder" value={form.liderIgreja} onChange={(e) => set('liderIgreja', e.target.value)} />
                </Campo>
              </div>
            </div>

            {/* SEÇÃO 3 — Parceiro */}
            <div className={`card animate-fade-in-up ${isDireto ? 'w-[320px] sm:w-[360px] flex-shrink-0' : ''}`} style={{ animationDelay: '300ms' }}>
              <SecaoHeader numero="3" titulo="Membro 2 — Parceiro" descricao="Dados do parceiro da dupla" />
              <div className={`grid grid-cols-1 ${isDireto ? '' : 'sm:grid-cols-2'} gap-4`}>
                <Campo label="Tipo do Parceiro" obrigatorio icone="🏷️">
                  <select className="input-field" value={form.membro2Tipo} onChange={(e) => set('membro2Tipo', e.target.value)} required>
                    {TIPOS_MEMBRO2.map((t) => (<option key={t.value} value={t.value}>{t.icon} {t.label}</option>))}
                  </select>
                </Campo>
                <Campo label="Nome Completo" obrigatorio icone="👤">
                  <input type="text" className="input-field" placeholder="Nome do parceiro" value={form.membro2Nome} onChange={(e) => set('membro2Nome', e.target.value)} required />
                </Campo>
                <Campo label="Telefone" icone="📱">
                  <input type="tel" className="input-field" placeholder="(11) 99999-0000" value={form.membro2Telefone} onChange={(e) => set('membro2Telefone', e.target.value)} />
                </Campo>
                <Campo label="Pessoas Alcançadas" icone="🙏">
                  <input type="number" className="input-field" min="0" value={form.pessoasAlcancadas} onChange={(e) => set('pessoasAlcancadas', e.target.value)} />
                </Campo>
              </div>
            </div>

            {/* SEÇÃO 4 — Acompanhamento Missionário */}
            <div className={`card animate-fade-in-up ${isDireto ? 'w-[320px] sm:w-[360px] flex-shrink-0' : ''}`} style={{ animationDelay: '400ms' }}>
              <SecaoHeader numero="4" titulo="Acompanhamento" descricao="Métricas e andamento missionário da dupla" />
              <div className={`grid grid-cols-1 ${isDireto ? '' : 'sm:grid-cols-2'} gap-4`}>
                <Campo label="Estudo Bíblico" icone="📖">
                  <select className="input-field" value={form.estudoBiblico} onChange={(e) => set('estudoBiblico', e.target.value)}>
                    <option value="">Selecione o estudo</option>
                    <option value="Ouvindo a Voz de Deus">Ouvindo a Voz de Deus</option>
                    <option value="Apocalipse">Apocalipse</option>
                    <option value="Bíblia Fácil">Bíblia Fácil</option>
                    <option value="Outro">Outro</option>
                  </select>
                </Campo>

                <Campo label="Status do Estudo Bíblico" icone="📈">
                  <select className="input-field" value={form.statusEstudoBiblico} onChange={(e) => set('statusEstudoBiblico', e.target.value)} disabled={!form.estudoBiblico}>
                    <option value="">Não iniciado</option>
                    <option value="ATIVO">Em andamento</option>
                    <option value="DESATIVADO">Desativado / Pausado</option>
                    <option value="TERMINADO">Concluído</option>
                  </select>
                </Campo>

                <Campo label="Evangelismo" icone="📢">
                  <select className="input-field" value={form.statusEvangelismo} onChange={(e) => set('statusEvangelismo', e.target.value)}>
                    <option value="">Não iniciado</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="TERMINADO">Terminado</option>
                  </select>
                </Campo>

                <Campo label="Quantidade de Batismos" icone="💧">
                  <input type="number" className="input-field" min="0" placeholder="0" value={form.batismos} onChange={(e) => set('batismos', e.target.value)} />
                </Campo>
              </div>
            </div>

            {/* SEÇÃO 5 — Observações */}
            <div className={`card animate-fade-in-up flex flex-col ${isDireto ? 'w-[320px] sm:w-[360px] flex-shrink-0' : ''}`} style={{ animationDelay: '500ms' }}>
              <SecaoHeader numero="5" titulo="Observações" descricao="Informações adicionais sobre a dupla (opcional)" />
              <textarea
                className="input-field flex-1 resize-none min-h-[120px]"
                placeholder="Observações sobre a dupla, atividades, histórico..."
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
              />
            </div>
          </div>
        </div>



        {/* Botões */}
        <div className={isDireto ? "flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3 z-10" : "flex gap-3 justify-end pb-6 animate-fade-in-up"}>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className="btn-primary flex items-center gap-2">
            {enviando ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEdicao ? 'Atualizar Dupla' : 'Salvar Dupla'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
