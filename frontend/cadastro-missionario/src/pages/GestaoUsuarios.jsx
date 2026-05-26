import { useState, useEffect, useCallback } from 'react';
import { useAuth, PERFIS } from '../contexts/AuthContext';
import api from '../lib/api';

const PERFIL_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', cor: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  ADMINISTRADOR: { label: 'Administrador', cor: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  PASTOR_REGIONAL: { label: 'Pastor Regional', cor: 'bg-[#1A3A6B]/10 text-[#1A3A6B] border-[#1A3A6B]/20', dot: 'bg-[#1A3A6B]' },
  PASTOR_DISTRITAL: { label: 'Pastor Distrital', cor: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
  COORDENADOR_REGIONAL: { label: 'Coordenador Regional', cor: 'bg-[#C9963A]/15 text-[#8B6A28] border-[#C9963A]/30', dot: 'bg-[#C9963A]' },
  DUPLA_MISSIONARIA: { label: 'Dupla Missionária', cor: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
};

const PERFIS_LISTA = Object.entries(PERFIL_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const CAMPO_EXTRA = {
  PASTOR_REGIONAL: 'regiao',
  COORDENADOR_REGIONAL: 'regiao',
  PASTOR_DISTRITAL: 'distrito',
  DUPLA_MISSIONARIA: 'dupla',
};

function PerfilBadge({ perfil }) {
  const cfg = PERFIL_CONFIG[perfil] || { label: perfil, cor: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.cor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ ativo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
      ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-500'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ativo ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function EscopoUsuario({ usuario }) {
  if (usuario.regiao) return <span className="text-sm text-gray-600">{usuario.regiao.nome}</span>;
  if (usuario.distrito) return <span className="text-sm text-gray-600">{usuario.distrito.nome}</span>;
  if (usuario.dupla) return <span className="text-sm text-gray-600">{usuario.dupla.liderNome}</span>;
  return <span className="text-sm text-gray-300">Associação</span>;
}

function IconButton({ title, onClick, children, variant = 'default' }) {
  const variantClass = variant === 'danger'
    ? 'text-gray-500 hover:bg-red-50 hover:text-red-600'
    : 'text-gray-500 hover:bg-[#1A3A6B]/10 hover:text-[#1A3A6B]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${variantClass}`}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function TextInput({ label, className = '', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      <input
        {...props}
        className={`h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#1A3A6B] focus:ring-2 focus:ring-[#1A3A6B]/20 ${className}`}
      />
    </label>
  );
}

function SelectInput({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      <select
        {...props}
        className={`h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#1A3A6B] focus:ring-2 focus:ring-[#1A3A6B]/20 ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

function ModalUsuario({ usuario, onClose, onSalvo, regioes, distritos, duplas, usuarioLogado }) {
  const editando = Boolean(usuario);
  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    senha: '',
    perfil: usuario?.perfil || 'ADMINISTRADOR',
    regiaoId: usuario?.regiaoId || '',
    distritoId: usuario?.distritoId || '',
    duplaId: usuario?.duplaId || '',
    ativo: usuario?.ativo !== undefined ? usuario.ativo : true,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const campoExtra = CAMPO_EXTRA[form.perfil] || null;
  const perfisDisponiveis = PERFIS_LISTA.filter((p) => p.value !== 'SUPER_ADMIN' || usuarioLogado?.perfil === PERFIS.SUPER_ADMIN);
  const set = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro(null);
    setSalvando(true);

    if (!editando && !form.senha) {
      setErro('Senha obrigatória para novo usuário.');
      setSalvando(false);
      return;
    }

    const payload = {
      nome: form.nome,
      email: form.email,
      perfil: form.perfil,
      regiaoId: campoExtra === 'regiao' ? form.regiaoId || null : null,
      distritoId: campoExtra === 'distrito' ? form.distritoId || null : null,
      duplaId: campoExtra === 'dupla' ? form.duplaId || null : null,
      ativo: form.ativo,
    };
    if (form.senha) payload.senha = form.senha;

    try {
      if (editando) {
        await api.put(`/usuarios/${usuario.id}`, payload);
      } else {
        await api.post('/usuarios', payload);
      }
      onSalvo();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C9963A]">Acesso</p>
            <h2 className="mt-1 text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              {editando ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {editando ? usuario.nome : 'Crie uma credencial e defina o escopo do usuário.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Nome completo"
              placeholder="Ex: João da Silva"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              required
            />
            <TextInput
              label="E-mail"
              type="email"
              placeholder="usuario@ap.adventistas.org"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label={editando ? 'Nova senha' : 'Senha'}
              type="password"
              placeholder={editando ? 'Deixe em branco para manter' : 'Mínimo 8 caracteres'}
              value={form.senha}
              onChange={(e) => set('senha', e.target.value)}
              minLength={editando ? undefined : 8}
              required={!editando}
            />
            <SelectInput
              label="Perfil"
              value={form.perfil}
              onChange={(e) => {
                setForm((atual) => ({
                  ...atual,
                  perfil: e.target.value,
                  regiaoId: '',
                  distritoId: '',
                  duplaId: '',
                }));
              }}
              required
            >
              {perfisDisponiveis.map((perfil) => (
                <option key={perfil.value} value={perfil.value}>{perfil.label}</option>
              ))}
            </SelectInput>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Perfil selecionado</p>
                <p className="mt-0.5 text-xs text-gray-500">O escopo abaixo é aplicado conforme o perfil.</p>
              </div>
              <PerfilBadge perfil={form.perfil} />
            </div>
          </div>

          {campoExtra === 'regiao' && (
            <SelectInput
              label="Região"
              value={form.regiaoId}
              onChange={(e) => set('regiaoId', e.target.value)}
              required
            >
              <option value="">Selecione uma região</option>
              {regioes.map((regiao) => (
                <option key={regiao.id} value={regiao.id}>{regiao.nome}</option>
              ))}
            </SelectInput>
          )}

          {campoExtra === 'distrito' && (
            <SelectInput
              label="Distrito"
              value={form.distritoId}
              onChange={(e) => set('distritoId', e.target.value)}
              required
            >
              <option value="">Selecione um distrito</option>
              {distritos.map((distrito) => (
                <option key={distrito.id} value={distrito.id}>
                  {distrito.nome}{distrito.regiao?.nome ? ` (${distrito.regiao.nome})` : ''}
                </option>
              ))}
            </SelectInput>
          )}

          {campoExtra === 'dupla' && (
            <SelectInput
              label="Dupla Missionária"
              value={form.duplaId}
              onChange={(e) => set('duplaId', e.target.value)}
              required
            >
              <option value="">Selecione uma dupla</option>
              {duplas.map((dupla) => (
                <option key={dupla.id} value={dupla.id}>
                  {dupla.liderNome} e {dupla.membro2Nome} - {dupla.bairro || 'Sem bairro'}
                </option>
              ))}
            </SelectInput>
          )}

          {editando && (
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Conta ativa</p>
                <p className="text-xs text-gray-500">Contas inativas não conseguem fazer login.</p>
              </div>
              <button
                type="button"
                onClick={() => set('ativo', !form.ativo)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.ativo ? 'bg-emerald-500' : 'bg-gray-300'}`}
                aria-label="Alternar status da conta"
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${form.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-lg border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="h-11 rounded-lg bg-[#1A3A6B] px-5 text-sm font-semibold text-white transition hover:bg-[#0d2347] disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalConfirmar({ usuario, onClose, onConfirmar, processando }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-lg font-bold text-gray-900">Desativar usuário?</h3>
          <p className="mt-2 text-sm text-gray-500">
            {usuario.nome} não conseguirá acessar o sistema até ser reativado.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={processando}
            className="h-11 flex-1 rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {processando ? 'Desativando...' : 'Desativar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestaoUsuarios() {
  const { usuario: usuarioLogado } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalDesativar, setModalDesativar] = useState(null);
  const [processandoDesativar, setProcessandoDesativar] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [rUsuarios, rRegioes, rDistritos, rDuplas] = await Promise.all([
        api.get('/usuarios'),
        api.get('/regioes'),
        api.get('/distritos'),
        api.get('/duplas'),
      ]);
      setUsuarios(rUsuarios.data);
      setRegioes(rRegioes.data);
      setDistritos(rDistritos.data);
      setDuplas(rDuplas.data);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao carregar usuários.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleDesativar = async () => {
    setProcessandoDesativar(true);
    try {
      await api.delete(`/usuarios/${modalDesativar.id}`);
      setModalDesativar(null);
      await carregar();
    } finally {
      setProcessandoDesativar(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (filtroPerfil && usuario.perfil !== filtroPerfil) return false;
    if (filtroStatus === 'ativo' && !usuario.ativo) return false;
    if (filtroStatus === 'inativo' && usuario.ativo) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      return usuario.nome.toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo);
    }
    return true;
  });

  const contagens = Object.keys(PERFIL_CONFIG).reduce((acc, perfil) => {
    acc[perfil] = usuarios.filter((usuario) => usuario.perfil === perfil).length;
    return acc;
  }, {});
  const totalAtivos = usuarios.filter((usuario) => usuario.ativo).length;
  const totalInativos = usuarios.length - totalAtivos;
  const filtrosAtivos = Boolean(filtroPerfil || filtroStatus || busca);

  if (carregando) {
    return (
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-xl bg-white" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">{erro}</p>
          <button onClick={carregar} className="mt-3 text-sm font-semibold text-red-700 underline">Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C9963A]">Acessos do sistema</p>
            <h1 className="mt-1 text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Gestão de Usuários</h1>
            <p className="mt-1 text-sm text-gray-500">Controle perfis, escopos e status de acesso em um só lugar.</p>
          </div>
          <button
            onClick={() => setModalCriar(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1A3A6B] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0d2347]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Usuário
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="px-4 py-3 sm:px-5">
            <p className="text-2xl font-bold text-[#1A3A6B]">{usuarios.length}</p>
            <p className="text-xs font-medium text-gray-500">Total</p>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <p className="text-2xl font-bold text-emerald-600">{totalAtivos}</p>
            <p className="text-xs font-medium text-gray-500">Ativos</p>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <p className="text-2xl font-bold text-gray-500">{totalInativos}</p>
            <p className="text-xs font-medium text-gray-500">Inativos</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Object.entries(PERFIL_CONFIG).map(([perfil, cfg]) => (
          <button
            key={perfil}
            type="button"
            onClick={() => setFiltroPerfil(filtroPerfil === perfil ? '' : perfil)}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
              filtroPerfil === perfil ? 'border-[#1A3A6B] ring-2 ring-[#1A3A6B]/15' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`h-9 w-9 rounded-lg ${cfg.dot}`} />
              <span className="text-2xl font-bold text-[#1A3A6B]">{contagens[perfil]}</span>
            </div>
            <p className="mt-3 text-xs font-semibold text-gray-600">{cfg.label}</p>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#1A3A6B] focus:ring-2 focus:ring-[#1A3A6B]/20"
            />
          </div>
          <select
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#1A3A6B] focus:ring-2 focus:ring-[#1A3A6B]/20 lg:w-56"
          >
            <option value="">Todos os perfis</option>
            {PERFIS_LISTA.map((perfil) => (
              <option key={perfil.value} value={perfil.value}>{perfil.label}</option>
            ))}
          </select>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#1A3A6B] focus:ring-2 focus:ring-[#1A3A6B]/20 lg:w-48"
          >
            <option value="">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
          {filtrosAtivos && (
            <button
              type="button"
              onClick={() => { setFiltroPerfil(''); setFiltroStatus(''); setBusca(''); }}
              className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-[#1A3A6B]"
            >
              Limpar
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-[#1A3A6B]">Usuários cadastrados</h2>
            <p className="text-xs text-gray-500">{usuariosFiltrados.length} exibidos</p>
          </div>
        </div>
        {usuariosFiltrados.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="font-medium">Nenhum usuário encontrado</p>
            <p className="mt-1 text-sm">Ajuste os filtros ou crie um novo usuário.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Perfil</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Escopo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className={`transition-colors hover:bg-gray-50 ${!usuario.ativo ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1A3A6B] text-sm font-bold text-white">
                            {usuario.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{usuario.nome}</p>
                            <p className="text-xs text-gray-400">{usuario.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><PerfilBadge perfil={usuario.perfil} /></td>
                      <td className="px-4 py-4"><EscopoUsuario usuario={usuario} /></td>
                      <td className="px-4 py-4"><StatusBadge ativo={usuario.ativo} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <IconButton title="Editar usuário" onClick={() => setModalEditar(usuario)}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </IconButton>
                          {usuario.ativo && usuario.id !== usuarioLogado?.id && (
                            <IconButton title="Desativar usuário" onClick={() => setModalDesativar(usuario)} variant="danger">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {usuariosFiltrados.map((usuario) => (
                <div key={usuario.id} className={`p-4 ${!usuario.ativo ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1A3A6B] text-sm font-bold text-white">
                      {usuario.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{usuario.nome}</p>
                      <p className="truncate text-xs text-gray-400">{usuario.email}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <PerfilBadge perfil={usuario.perfil} />
                        <StatusBadge ativo={usuario.ativo} />
                      </div>
                      <div className="mt-2"><EscopoUsuario usuario={usuario} /></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <IconButton title="Editar usuário" onClick={() => setModalEditar(usuario)}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </IconButton>
                      {usuario.ativo && usuario.id !== usuarioLogado?.id && (
                        <IconButton title="Desativar usuário" onClick={() => setModalDesativar(usuario)} variant="danger">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {modalCriar && (
        <ModalUsuario
          onClose={() => setModalCriar(false)}
          onSalvo={() => { setModalCriar(false); carregar(); }}
          regioes={regioes}
          distritos={distritos}
          duplas={duplas}
          usuarioLogado={usuarioLogado}
        />
      )}
      {modalEditar && (
        <ModalUsuario
          usuario={modalEditar}
          onClose={() => setModalEditar(null)}
          onSalvo={() => { setModalEditar(null); carregar(); }}
          regioes={regioes}
          distritos={distritos}
          duplas={duplas}
          usuarioLogado={usuarioLogado}
        />
      )}
      {modalDesativar && (
        <ModalConfirmar
          usuario={modalDesativar}
          onClose={() => setModalDesativar(null)}
          onConfirmar={handleDesativar}
          processando={processandoDesativar}
        />
      )}
    </div>
  );
}
