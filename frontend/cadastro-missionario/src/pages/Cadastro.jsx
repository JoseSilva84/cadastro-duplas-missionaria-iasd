import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

const TIPOS_PROJETO = [
  { value: 'CASA_A_CASA', label: 'Casa a Casa' },
  { value: 'PEQUENOS_GRUPOS', label: 'Pequenos Grupos' },
  { value: 'ACAO_SOCIAL', label: 'Ação Social' },
  { value: 'MISSAO_COM_AMIGOS', label: 'Missão com Amigos' },
  { value: 'EVANGELISMO_PUBLICO', label: 'Evangelismo Público' },
];

const TIPOS_MEMBRO2 = [
  { value: 'MEMBRO_IASD', label: 'Membro da IASD' },
  { value: 'CONVIDADO', label: 'Convidado / Amigo' },
  { value: 'INTERESSADO', label: 'Interessado' },
];

// Componente de campo de formulário
const Campo = ({ label, obrigatorio, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

// Cabeçalho de seção
const SecaoHeader = ({ numero, titulo, descricao }) => (
  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
    <div className="w-8 h-8 rounded-full bg-[#1A3A6B] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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
  const comAmigosInicial = location.state?.comAmigos || false;

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
    comAmigos: comAmigosInicial,
    pessoasAlcancadas: 0,
    observacoes: '',
    dataInicio: new Date().toISOString().split('T')[0],
  });

  // Busca distritos ao montar
  useEffect(() => {
    api.get('/distritos').then((r) => setDistritos(r.data));
  }, []);

  // Atualiza igrejas ao mudar distrito
  useEffect(() => {
    if (form.distritoId) {
      api.get(`/distritos/${form.distritoId}`).then((r) => {
        setIgrejas(r.data.igrejas || []);
        // Preenche nome da região automaticamente
        setForm((prev) => ({ ...prev, regiaoNome: r.data.regiao?.nome || '' }));
      });
    } else {
      setIgrejas([]);
    }
  }, [form.distritoId]);

  // Detecta se o parceiro é externo automaticamente
  useEffect(() => {
    if (form.membro2Tipo !== 'MEMBRO_IASD') {
      setForm((prev) => ({ ...prev, comAmigos: true }));
    }
  }, [form.membro2Tipo]);

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post('/duplas', form);
      setSucesso(true);
      setTimeout(() => {
        navigate('/duplas');
      }, 2500);
    } catch (err) {
      const erros = err.response?.data?.erros;
      setErro(erros ? erros.map((e) => e.msg).join(', ') : 'Erro ao salvar a dupla.');
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
    <div className="p-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Formulário</p>
        <h1 className="text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Cadastro de Dupla
        </h1>
        <p className="text-gray-400 text-sm mt-1">Preencha os dados da nova dupla missionária</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SEÇÃO 1 — Localização */}
        <div className="card">
          <SecaoHeader numero="1" titulo="Localização" descricao="Região, distrito e bairro de atuação da dupla" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Distrito" obrigatorio>
              <select
                className="input-field"
                value={form.distritoId}
                onChange={(e) => set('distritoId', e.target.value)}
                required
              >
                <option value="">Selecione o distrito</option>
                {distritos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} — {d.regiao?.nome}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Igreja / Congregação">
              <select
                className="input-field"
                value={form.igrejaId}
                onChange={(e) => set('igrejaId', e.target.value)}
                disabled={!form.distritoId}
              >
                <option value="">Selecione a igreja</option>
                {igrejas.map((ig) => (
                  <option key={ig.id} value={ig.id}>{ig.nome}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Bairro de Atuação" obrigatorio>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Santana, Gonzaga..."
                value={form.bairro}
                onChange={(e) => set('bairro', e.target.value)}
                required
              />
            </Campo>

            <Campo label="Tipo de Projeto" obrigatorio>
              <select
                className="input-field"
                value={form.tipoProjeto}
                onChange={(e) => set('tipoProjeto', e.target.value)}
                required
              >
                <option value="">Selecione o tipo</option>
                {TIPOS_PROJETO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Data de Início">
              <input
                type="date"
                className="input-field"
                value={form.dataInicio}
                onChange={(e) => set('dataInicio', e.target.value)}
              />
            </Campo>

            <Campo label="Status">
              <select
                className="input-field"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="ATIVA">Ativa</option>
                <option value="PENDENTE">Pendente</option>
                <option value="INATIVA">Inativa</option>
              </select>
            </Campo>
          </div>
        </div>

        {/* SEÇÃO 2 — Líder */}
        <div className="card">
          <SecaoHeader numero="2" titulo="Membro 1 — Líder" descricao="Dados do líder responsável pela dupla" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nome Completo" obrigatorio>
              <input
                type="text"
                className="input-field"
                placeholder="Nome do líder"
                value={form.liderNome}
                onChange={(e) => set('liderNome', e.target.value)}
                required
              />
            </Campo>
            <Campo label="Telefone">
              <input
                type="tel"
                className="input-field"
                placeholder="(11) 99999-0000"
                value={form.liderTelefone}
                onChange={(e) => set('liderTelefone', e.target.value)}
              />
            </Campo>
            <Campo label="E-mail">
              <input
                type="email"
                className="input-field"
                placeholder="lider@email.com"
                value={form.liderEmail}
                onChange={(e) => set('liderEmail', e.target.value)}
              />
            </Campo>
            <Campo label="Igreja / Congregação">
              <input
                type="text"
                className="input-field"
                placeholder="Igreja do líder"
                value={form.liderIgreja}
                onChange={(e) => set('liderIgreja', e.target.value)}
              />
            </Campo>
          </div>
        </div>

        {/* SEÇÃO 3 — Parceiro */}
        <div className="card">
          <SecaoHeader numero="3" titulo="Membro 2 — Parceiro" descricao="Dados do parceiro da dupla" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Tipo do Parceiro" obrigatorio>
              <select
                className="input-field"
                value={form.membro2Tipo}
                onChange={(e) => set('membro2Tipo', e.target.value)}
                required
              >
                {TIPOS_MEMBRO2.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Nome Completo" obrigatorio>
              <input
                type="text"
                className="input-field"
                placeholder="Nome do parceiro"
                value={form.membro2Nome}
                onChange={(e) => set('membro2Nome', e.target.value)}
                required
              />
            </Campo>
            <Campo label="Telefone">
              <input
                type="tel"
                className="input-field"
                placeholder="(11) 99999-0000"
                value={form.membro2Telefone}
                onChange={(e) => set('membro2Telefone', e.target.value)}
              />
            </Campo>
            <Campo label="Pessoas Alcançadas">
              <input
                type="number"
                className="input-field"
                min="0"
                value={form.pessoasAlcancadas}
                onChange={(e) => set('pessoasAlcancadas', e.target.value)}
              />
            </Campo>
          </div>

          {/* Indicador automático de "com amigos" */}
          {form.membro2Tipo !== 'MEMBRO_IASD' && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-2">
              <span>🤝</span>
              <p className="text-purple-700 text-sm">
                Esta dupla será registrada como <strong>Dupla com Amigos</strong> por incluir um parceiro externo.
              </p>
            </div>
          )}
        </div>

        {/* SEÇÃO 4 — Observações */}
        <div className="card">
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
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 justify-end pb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="btn-primary flex items-center gap-2"
          >
            {enviando ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
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
