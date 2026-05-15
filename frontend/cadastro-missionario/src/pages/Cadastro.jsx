import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

export default function Cadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
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
    observacoes: '',
    dataInicio: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    api.get('/distritos').then((r) => setDistritos(r.data));
  }, []);

  useEffect(() => {
    if (form.distritoId) {
      api.get(`/distritos/${form.distritoId}`).then((r) => {
        setIgrejas(r.data.igrejas || []);
        setForm((prev) => ({ ...prev, regiaoNome: r.data.regiao?.nome || '' }));
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIgrejas([]);
    }
  }, [form.distritoId]);

  const set = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post('/duplas', form);
      setSucesso(true);
      const redirectTo = location.pathname.startsWith('/direto') ? '/direto/duplas' : '/duplas';
      setTimeout(() => navigate(redirectTo), 2500);
    } catch (err) {
      const erros = err.response?.data?.erros;
      setErro(erros ? erros.map((e) => e.msg).join(', ') : 'Erro ao salvar a dupla.');
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-scale-in">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-5 shadow-lg animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Dupla cadastrada com sucesso!
          </h2>
          <p className="text-gray-500 mt-2 text-sm">Redirecionando para a lista de duplas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
      {/* Cabeçalho */}
      <div className="mb-8 animate-fade-in-down">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Formulário</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Cadastro de Dupla
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Preencha os dados da nova dupla missionária</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEÇÃO 1 — Localização */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <SecaoHeader numero="1" titulo="Localização" descricao="Região, distrito e bairro de atuação da dupla" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <SecaoHeader numero="2" titulo="Membro 1 — Líder" descricao="Dados do líder responsável pela dupla" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <SecaoHeader numero="3" titulo="Membro 2 — Parceiro" descricao="Dados do parceiro da dupla" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* SEÇÃO 4 — Observações */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <SecaoHeader numero="4" titulo="Observações" descricao="Informações adicionais sobre a dupla (opcional)" />
          <textarea
            className="input-field min-h-24 resize-none"
            placeholder="Observações sobre a dupla, atividades, histórico..."
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
          />
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-fade-in flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 justify-end pb-6 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
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
                Salvar Dupla
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
