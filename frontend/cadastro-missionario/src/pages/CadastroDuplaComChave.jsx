import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from '../lib/toast';
import api from '../lib/api';

const TIPOS_PROJETO = [
  { value: 'ESTUDO_BIBLICO', label: 'Estudo Bíblico', icon: '📖' },
  { value: 'CASA_A_CASA', label: 'Visitação', icon: '🏠' },
  { value: 'PEQUENOS_GRUPOS', label: 'Pequenos Grupos', icon: '👥' },
  { value: 'ACAO_SOCIAL', label: 'Ação Social', icon: '🤲' },
  { value: 'EVANGELISMO_PUBLICO', label: 'Classe Bíblica', icon: '📢' },
];

const LockIcon = () => (
  <svg className="w-4 h-4 text-[#C9963A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function CadastroDuplaComChave() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Etapa: 'chave' (digitar chave) ou 'formulario' (preencher cadastro)
  const [chaveInput, setChaveInput] = useState(searchParams.get('chave') || '');
  const [validandoChave, setValidandoChave] = useState(false);
  const [infoChave, setInfoChave] = useState(null); // { tipo, distrito, regiao, igrejas, distritos }

  // Formulário
  const [form, setForm] = useState({
    regiaoId: '',
    distritoId: '',
    igrejaId: '',
    bairro: '',
    tipoProjeto: 'ESTUDO_BIBLICO',

    // Membro 1 (Líder)
    liderNome: '',
    liderTelefone: '',
    liderEmail: '',
    liderSexo: '',
    liderDataNascimento: '',
    liderDataBatismo: '',
    liderEndereco: '',

    // Membro 2 (Parceiro)
    membro2Nome: '',
    membro2Telefone: '',
    membro2Email: '',
    membro2Sexo: '',
    membro2DataNascimento: '',
    membro2DataBatismo: '',
    membro2Endereco: '',

    // Classificação
    levouPessoaBatismo: null,
    jaDeuEstudoBiblico: null,
    estudoAtualEmAndamento: null,

    // Seção 5: Acesso
    emailAcesso: '',
    senhaAcesso: '',
    confirmarSenhaAcesso: '',
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucessoModal, setSucessoModal] = useState(false);
  const [distritosRegiao, setDistritosRegiao] = useState([]);
  const [igrejasDistrito, setIgrejasDistrito] = useState([]);
  const [carregandoIgrejas, setCarregandoIgrejas] = useState(false);

  // Se houver chave na URL, valida automaticamente
  useEffect(() => {
    const chaveUrl = searchParams.get('chave');
    if (chaveUrl && !infoChave) {
      validarChave(chaveUrl);
    }
  }, [searchParams]);

  const validarChave = async (chaveParaValidar) => {
    const chaveLimpa = String(chaveParaValidar || chaveInput).trim().toUpperCase();
    if (!chaveLimpa) {
      toast.error('Informe a chave de acesso.');
      return;
    }

    setValidandoChave(true);
    try {
      const res = await api.get('/auth/validar-chave-cadastro', { params: { chave: chaveLimpa } });
      const dados = res.data;
      setInfoChave(dados);
      setChaveInput(chaveLimpa);

      if (dados.tipo === 'DISTRITO') {
        setForm((prev) => ({
          ...prev,
          regiaoId: dados.regiao.id,
          distritoId: dados.distrito.id,
          igrejaId: dados.igrejas?.length === 1 ? String(dados.igrejas[0].id) : '',
        }));
        setIgrejasDistrito(dados.igrejas || []);
      } else if (dados.tipo === 'REGIAO') {
        setForm((prev) => ({
          ...prev,
          regiaoId: dados.regiao.id,
          distritoId: '',
          igrejaId: '',
        }));
        setDistritosRegiao(dados.distritos || []);
      }
      toast.success('Chave de acesso validada com sucesso!');
    } catch (err) {
      const msg = err.response?.data?.erro || 'Chave de acesso inválida ou expirada.';
      toast.error(msg);
      setInfoChave(null);
    } finally {
      setValidandoChave(false);
    }
  };

  // Quando seleciona um distrito no modo regional
  const handleSelecionarDistrito = async (distId) => {
    setForm((prev) => ({ ...prev, distritoId: distId, igrejaId: '' }));
    if (!distId) {
      setIgrejasDistrito([]);
      return;
    }

    // Se o infoChave já trouxe as igrejas daquele distrito
    const distEncontrado = infoChave?.distritos?.find((d) => d.id === Number(distId));
    if (distEncontrado?.igrejas?.length) {
      setIgrejasDistrito(distEncontrado.igrejas);
      if (distEncontrado.igrejas.length === 1) {
        setForm((prev) => ({ ...prev, igrejaId: String(distEncontrado.igrejas[0].id) }));
      }
      return;
    }

    // Caso contrário busca igrejas do distrito
    setCarregandoIgrejas(true);
    try {
      const res = await api.get(`/igrejas`, { params: { distritoId: distId } });
      setIgrejasDistrito(res.data || []);
      if (res.data?.length === 1) {
        setForm((prev) => ({ ...prev, igrejaId: String(res.data[0].id) }));
      }
    } catch (err) {
      console.error('Erro ao buscar igrejas do distrito:', err);
    } finally {
      setCarregandoIgrejas(false);
    }
  };

  // Cálculo da classificação estimada
  const calcularClassificacao = () => {
    if (form.levouPessoaBatismo === true) return { letra: 'A', desc: 'Líder / Experiente' };
    if (form.jaDeuEstudoBiblico === true) return { letra: 'B', desc: 'Em Formação' };
    if (form.levouPessoaBatismo === false && form.jaDeuEstudoBiblico === false) return { letra: 'C', desc: 'Iniciante' };
    return null;
  };

  const classificacaoAtual = calcularClassificacao();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.distritoId) {
      toast.error('Selecione o distrito da dupla.');
      return;
    }
    if (!form.igrejaId) {
      toast.error('Selecione a igreja da dupla.');
      return;
    }
    if (!form.liderNome.trim()) {
      toast.error('Preencha o nome do Membro 1 (Líder).');
      return;
    }
    if (!form.membro2Nome.trim()) {
      toast.error('Preencha o nome do Membro 2 (Parceiro).');
      return;
    }

    // Normalização para verificar duplicação interna
    const norm = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (norm(form.liderNome) === norm(form.membro2Nome)) {
      toast.error('O Membro 1 e o Membro 2 não podem ser a mesma pessoa.');
      return;
    }

    // Seção 5: Login e Senha
    const emailAcesso = form.emailAcesso.trim().toLowerCase();
    if (!emailAcesso || !emailAcesso.includes('@')) {
      toast.error('Informe um e-mail válido para o acesso da dupla.');
      return;
    }
    if (form.senhaAcesso.length < 8) {
      toast.error('A senha de acesso deve conter no mínimo 8 caracteres.');
      return;
    }
    if (form.senhaAcesso !== form.confirmarSenhaAcesso) {
      toast.error('A confirmação da senha não coincide com a senha digitada.');
      return;
    }

    setSalvando(true);
    try {
      await api.post('/auth/cadastrar-dupla-com-chave', {
        chave: chaveInput,
        regiaoId: form.regiaoId,
        distritoId: form.distritoId,
        igrejaId: form.igrejaId,
        bairro: form.bairro,
        tipoProjeto: form.tipoProjeto,

        liderNome: form.liderNome,
        liderTelefone: form.liderTelefone,
        liderEmail: form.liderEmail || emailAcesso,
        liderSexo: form.liderSexo || null,
        liderDataNascimento: form.liderDataNascimento || null,
        liderDataBatismo: form.liderDataBatismo || null,
        liderEndereco: form.liderEndereco || null,

        membro2Nome: form.membro2Nome,
        membro2Telefone: form.membro2Telefone,
        membro2Email: form.membro2Email || null,
        membro2Sexo: form.membro2Sexo || null,
        membro2DataNascimento: form.membro2DataNascimento || null,
        membro2DataBatismo: form.membro2DataBatismo || null,
        membro2Endereco: form.membro2Endereco || null,

        levouPessoaBatismo: form.levouPessoaBatismo,
        jaDeuEstudoBiblico: form.jaDeuEstudoBiblico,
        estudoAtualEmAndamento: form.estudoAtualEmAndamento,

        email: emailAcesso,
        senha: form.senhaAcesso,
      });

      setSucessoModal(true);
    } catch (err) {
      console.error('Erro ao cadastrar dupla:', err);
      const msg = err.response?.data?.erro || 'Erro ao realizar cadastro da dupla.';
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-[#1A3A6B] hover:text-[#0f2347] mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para o Login
          </Link>

          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-2 shadow-md" style={{ background: 'linear-gradient(135deg, #0f2347 0%, #1A3A6B 100%)' }}>
              <img src="/logoiasd.png" alt="Logo IASD" className="w-full h-full object-contain" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Cadastro de Dupla Missionária
          </h1>
          <p className="text-gray-500 text-sm mt-1">Programa Capacitação Missionária — Associação Paulistana</p>
        </div>

        {/* ETAPA 1: Se a chave ainda não foi validada */}
        {!infoChave && (
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C9963A] flex items-center justify-center font-bold text-xl border border-amber-200">
                🔑
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1A3A6B]">Informe sua Chave de Acesso</h2>
                <p className="text-xs text-gray-500">Solicite a chave ao seu pastor distrital ou coordenador regional</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Chave de Acesso (Distrital ou Regional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: ITAPEVI-2026 ou REGIAO-3-2026"
                  value={chaveInput}
                  onChange={(e) => setChaveInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && validarChave()}
                  className="input-field text-base font-mono uppercase tracking-wider text-center"
                  autoFocus
                />
              </div>

              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed">
                💡 <strong>Como funciona:</strong> Ao validar a chave do seu distrito, sua região e distrito serão travados automaticamente para garantir a correta vinculação da sua igreja e dos seus relatórios missionários.
              </div>

              <button
                type="button"
                onClick={() => validarChave()}
                disabled={validandoChave || !chaveInput.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base shadow-md disabled:opacity-50"
              >
                {validandoChave ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Validando chave...
                  </>
                ) : (
                  <>
                    <span>Validar e Continuar</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: Formulário Completo após validação da Chave */}
        {infoChave && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            {/* Banner de Identificação da Chave */}
            <div className="bg-gradient-to-r from-[#1A3A6B] to-[#254d8c] text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                  {infoChave.tipo === 'DISTRITO' ? '📍' : '🌐'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#C9963A] text-[#0f2347] font-bold px-2 py-0.5 rounded-full">
                      {infoChave.tipo === 'DISTRITO' ? 'Chave Distrital' : 'Chave Regional'}
                    </span>
                    <span className="text-xs font-mono text-amber-200">{chaveInput}</span>
                  </div>
                  <h3 className="text-base font-bold mt-0.5">
                    {infoChave.tipo === 'DISTRITO'
                      ? `Distrito ${infoChave.distrito.nome} — ${infoChave.regiao.nome}`
                      : `${infoChave.regiao.nome}`}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInfoChave(null)}
                className="text-xs text-white/80 hover:text-white underline self-end sm:self-center"
              >
                Trocar chave
              </button>
            </div>

            {/* SEÇÃO 1: Localização */}
            <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B]">Localização da Dupla</h2>
                  <p className="text-xs text-gray-400">Campos vinculados à sua chave de acesso</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Região (Travada) */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                    <LockIcon /> Região Missionária (Travada pela chave)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={infoChave.regiao?.nome || ''}
                    className="input-field bg-gray-100 text-gray-600 font-semibold cursor-not-allowed"
                  />
                </div>

                {/* Distrito */}
                {infoChave.tipo === 'DISTRITO' ? (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                      <LockIcon /> Distrito (Travado pela chave)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={infoChave.distrito?.nome || ''}
                      className="input-field bg-gray-100 text-gray-600 font-semibold cursor-not-allowed"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Distrito <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.distritoId}
                      onChange={(e) => handleSelecionarDistrito(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Selecione o distrito da sua região...</option>
                      {distritosRegiao.map((d) => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Igreja */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Igreja da Dupla <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!form.distritoId || carregandoIgrejas}
                    value={form.igrejaId}
                    onChange={(e) => setForm({ ...form, igrejaId: e.target.value })}
                    className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {carregandoIgrejas ? 'Carregando igrejas...' : 'Selecione a sua igreja...'}
                    </option>
                    {igrejasDistrito.map((ig) => (
                      <option key={ig.id} value={ig.id}>{ig.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Projeto / Atuação */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Foco Principal de Atuação
                  </label>
                  <select
                    value={form.tipoProjeto}
                    onChange={(e) => setForm({ ...form, tipoProjeto: e.target.value })}
                    className="input-field"
                  >
                    {TIPOS_PROJETO.map((tp) => (
                      <option key={tp.value} value={tp.value}>
                        {tp.icon} {tp.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Membro 1 — Líder */}
            <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B]">Membro 1 — Líder da Dupla</h2>
                  <p className="text-xs text-gray-400">Dados cadastrais do primeiro integrante</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Carlos da Silva"
                    value={form.liderNome}
                    onChange={(e) => setForm({ ...form, liderNome: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    WhatsApp / Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={form.liderTelefone}
                    onChange={(e) => setForm({ ...form, liderTelefone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={form.liderDataNascimento}
                    onChange={(e) => setForm({ ...form, liderDataNascimento: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sexo
                  </label>
                  <select
                    value={form.liderSexo}
                    onChange={(e) => setForm({ ...form, liderSexo: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Selecione...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Data de Batismo
                  </label>
                  <input
                    type="date"
                    value={form.liderDataBatismo}
                    onChange={(e) => setForm({ ...form, liderDataBatismo: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: Membro 2 — Parceiro */}
            <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B]">Membro 2 — Parceiro da Dupla</h2>
                  <p className="text-xs text-gray-400">Dados cadastrais do segundo integrante</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria das Dores Oliveira"
                    value={form.membro2Nome}
                    onChange={(e) => setForm({ ...form, membro2Nome: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    WhatsApp / Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98888-8888"
                    value={form.membro2Telefone}
                    onChange={(e) => setForm({ ...form, membro2Telefone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={form.membro2DataNascimento}
                    onChange={(e) => setForm({ ...form, membro2DataNascimento: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sexo
                  </label>
                  <select
                    value={form.membro2Sexo}
                    onChange={(e) => setForm({ ...form, membro2Sexo: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Selecione...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Data de Batismo
                  </label>
                  <input
                    type="date"
                    value={form.membro2DataBatismo}
                    onChange={(e) => setForm({ ...form, membro2DataBatismo: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: Classificação Missionária */}
            <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1A3A6B]">Experiência Missionária</h2>
                    <p className="text-xs text-gray-400">Classificação da dupla conforme o histórico</p>
                  </div>
                </div>

                {classificacaoAtual && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-[#916719]">
                    <span>Classe {classificacaoAtual.letra}</span>
                    <span className="text-gray-400">•</span>
                    <span>{classificacaoAtual.desc}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Pergunta 1 */}
                <div className="p-3.5 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    A dupla já levou pelo menos uma pessoa ao batismo?
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, levouPessoaBatismo: true })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.levouPessoaBatismo === true
                          ? 'bg-[#1A3A6B] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, levouPessoaBatismo: false })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.levouPessoaBatismo === false
                          ? 'bg-[#1A3A6B] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {/* Pergunta 2 */}
                <div className="p-3.5 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    A dupla já ministrou estudos bíblicos anteriormente?
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, jaDeuEstudoBiblico: true })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.jaDeuEstudoBiblico === true
                          ? 'bg-[#1A3A6B] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, jaDeuEstudoBiblico: false })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.jaDeuEstudoBiblico === false
                          ? 'bg-[#1A3A6B] text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>

                {/* Pergunta 3 */}
                <div className="p-3.5 bg-gray-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    A dupla possui estudos bíblicos em andamento no momento?
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, estudoAtualEmAndamento: true })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.estudoAtualEmAndamento === true
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Sim (Ativa)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, estudoAtualEmAndamento: false })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.estudoAtualEmAndamento === false
                          ? 'bg-gray-700 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Não (Inativa)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: Dados de Acesso (Login e Senha da Dupla) */}
            <div className="bg-white rounded-3xl shadow-sm p-6 border-2 border-[#C9963A]/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/60 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C9963A] to-[#b0802c] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  5
                </div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B] flex items-center gap-2">
                    Dados de Acesso (Login da Dupla)
                    <span className="text-[10px] bg-amber-100 text-[#916719] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Obrigatório
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Defina o e-mail e a senha que a dupla usará para entrar no sistema
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    E-mail de Login da Dupla <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ex: dupla.joao.maria@gmail.com"
                    value={form.emailAcesso}
                    onChange={(e) => setForm({ ...form, emailAcesso: e.target.value })}
                    className="input-field"
                    autoComplete="username"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Pode ser o e-mail de um dos membros ou um e-mail compartilhado pela dupla.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Senha de Acesso <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      value={form.senhaAcesso}
                      onChange={(e) => setForm({ ...form, senhaAcesso: e.target.value })}
                      className="input-field pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {mostrarSenha ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirmar Senha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Repita a nova senha"
                    value={form.confirmarSenhaAcesso}
                    onChange={(e) => setForm({ ...form, confirmarSenhaAcesso: e.target.value })}
                    className="input-field"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <Link to="/login" className="text-xs text-gray-500 hover:text-gray-700 underline">
                Cancelar e voltar ao login
              </Link>

              <button
                type="submit"
                disabled={salvando}
                className="btn-primary w-full sm:w-auto px-8 py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-lg disabled:opacity-50"
              >
                {salvando ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cadastrando Dupla...
                  </>
                ) : (
                  <>
                    <span>✨ Finalizar Cadastro da Dupla</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Modal de Sucesso */}
        {sucessoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border border-gray-100">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                🎉
              </div>
              <h3 className="text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                Cadastro Concluído!
              </h3>
              <p className="text-gray-600 text-sm mt-2">
                A dupla <strong>{form.liderNome} e {form.membro2Nome}</strong> foi cadastrada com sucesso na Associação Paulistana.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 my-5 text-left text-xs space-y-1.5">
                <p className="text-gray-500 font-medium">Seus dados para entrar no sistema:</p>
                <p className="font-mono text-sm text-[#1A3A6B] font-bold break-all">
                  E-mail: {form.emailAcesso}
                </p>
                <p className="text-gray-400 text-[11px]">Guarde sua senha para acessar sempre que desejar.</p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/login?email=${encodeURIComponent(form.emailAcesso)}`)}
                className="btn-primary w-full py-3 text-base shadow-md"
              >
                Acessar o Sistema Agora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
