import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AvatarUpload from '../components/AvatarUpload';
import { FotoService } from '../foto.service';
import api from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';

const campoInicial = {
  nome: '',
  email: '',
  senha: '',
  confirmarSenha: '',
  confirmacao: '',
  regiaoId: '',
  distritoId: '',
  igrejaId: '',
  liderNome: '',
  membro2Nome: '',
  fotoPastor: '',
};

function SelectField({ label, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span>
      <select {...props} className="input-field">
        {children}
      </select>
    </label>
  );
}

function TextField({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span>
      <input {...props} className="input-field" />
    </label>
  );
}

export default function AtivarAcessoQr() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState(campoInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [duplaBusca, setDuplaBusca] = useState(null);

  useEffect(() => {
    let cancelado = false;
    const carregar = async () => {
      if (!token) {
        setCarregando(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/qr-ativacao/info', { params: { token } });
        if (!cancelado) setInfo(data);
      } catch (err) {
        toastError(err.response?.data?.erro || 'QR Code inválido.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };
    carregar();
    return () => { cancelado = true; };
  }, [token]);

  const regioes = useMemo(() => info?.opcoes?.regioes || [], [info]);
  const distritos = useMemo(() => info?.opcoes?.distritos || [], [info]);
  const igrejas = useMemo(() => info?.opcoes?.igrejas || [], [info]);

  const distritosFiltrados = useMemo(() => (
    form.regiaoId ? distritos.filter((d) => String(d.regiaoId) === String(form.regiaoId)) : distritos
  ), [distritos, form.regiaoId]);

  const igrejasFiltradas = useMemo(() => (
    form.distritoId ? igrejas.filter((i) => String(i.distritoId) === String(form.distritoId)) : []
  ), [igrejas, form.distritoId]);

  const distritoSelecionado = distritos.find((d) => String(d.id) === String(form.distritoId));
  const requerConfirmacaoSensivel = ['PRESIDENTE', 'DEPARTAMENTAL_MIPS'].includes(info?.tipo);
  const textoConfirmacao = info?.tipo === 'PRESIDENTE' ? 'PRESIDENTE' : 'MIPS';

  const alterar = (campo, valor) => {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === 'regiaoId' ? { distritoId: '', igrejaId: '' } : {}),
      ...(campo === 'distritoId' ? { igrejaId: '' } : {}),
    }));
    if (['regiaoId', 'distritoId', 'igrejaId', 'liderNome', 'membro2Nome'].includes(campo)) {
      setDuplaBusca(null);
    }
  };

  const validarSenha = () => {
    if (!form.email.trim() || !form.email.includes('@')) {
      toastError('Informe um e-mail válido.');
      return false;
    }
    if (form.senha.length < 8) {
      toastError('A senha deve ter pelo menos 8 caracteres.');
      return false;
    }
    if (form.senha !== form.confirmarSenha) {
      toastError('A confirmação da senha não confere.');
      return false;
    }
    if (requerConfirmacaoSensivel && form.confirmacao.trim().toUpperCase() !== textoConfirmacao) {
      toastError(`Digite ${textoConfirmacao} para confirmar este acesso geral.`);
      return false;
    }
    return true;
  };

  const buscarDupla = async () => {
    if (!form.distritoId || !form.igrejaId || !form.liderNome.trim() || !form.membro2Nome.trim()) {
      toastError('Informe região, distrito, igreja e os nomes dos dois membros.');
      return;
    }
    setSalvando(true);
    try {
      const { data } = await api.post('/auth/qr-ativacao/buscar-dupla', {
        token,
        distritoId: form.distritoId,
        igrejaId: form.igrejaId,
        liderNome: form.liderNome,
        membro2Nome: form.membro2Nome,
      });
      setDuplaBusca(data);
      if (data.encontrada) toastSuccess('Dupla encontrada. Agora crie o login e senha.');
      else if (data.possivel) toastError('Encontramos uma dupla parecida. Confirme se é a sua antes de cadastrar nova.');
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao buscar dupla.');
    } finally {
      setSalvando(false);
    }
  };

  const confirmarDuplaPossivel = (dupla) => {
    setDuplaBusca({
      encontrada: true,
      confirmadaManualmente: true,
      dupla,
    });
    toastSuccess('Dupla confirmada. Agora crie o login e senha.');
  };

  const ativar = async (event) => {
    event.preventDefault();
    if (!validarSenha()) return;
    if (info.tipo === 'DUPLA_MISSIONARIA' && !duplaBusca?.dupla?.id) {
      toastError('Localize a dupla antes de ativar o acesso.');
      return;
    }
    setSalvando(true);
    try {
      const fotoPastorRef = info.tipo === 'PASTOR_DISTRITAL' && form.fotoPastor
        ? await FotoService.salvarFotoPorReferencia('distrito', form.distritoId, 'pastor', form.fotoPastor)
        : '';

      await api.post('/auth/qr-ativacao/ativar', {
        token,
        nome: form.nome,
        fotoPastor: fotoPastorRef || null,
        email: form.email,
        senha: form.senha,
        regiaoId: form.regiaoId,
        distritoId: form.distritoId,
        igrejaId: form.igrejaId,
        duplaId: duplaBusca?.dupla?.id,
        confirmacao: form.confirmacao,
      });
      toastSuccess('Acesso ativado com sucesso.');
      navigate(`/login?email=${encodeURIComponent(form.email)}`, { replace: true });
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao ativar acesso.');
    } finally {
      setSalvando(false);
    }
  };

  const cadastrarNovaDupla = () => {
    if (!distritoSelecionado?.chaveAcesso || !distritoSelecionado?.chaveAtiva) {
      toastError('Este distrito não possui uma chave ativa para cadastro de nova dupla.');
      return;
    }
    const params = new URLSearchParams({
      chave: distritoSelecionado.chaveAcesso,
      regiaoId: form.regiaoId,
      distritoId: form.distritoId,
      igrejaId: form.igrejaId,
      liderNome: form.liderNome,
      membro2Nome: form.membro2Nome,
    });
    navigate(`/cadastro-dupla?${params.toString()}`);
  };

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3A6B] border-t-transparent" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] p-4">
        <div className="max-w-md rounded-3xl bg-white p-7 text-center shadow-xl">
          <h1 className="text-xl font-bold text-[#1A3A6B]">QR Code inválido</h1>
          <p className="mt-2 text-sm text-gray-500">Leia novamente o QR Code ou solicite um novo ao responsável.</p>
          <Link to="/login" className="btn-primary mt-5 inline-flex">Voltar ao login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8 sm:px-6">
      <main className="mx-auto max-w-3xl">
        <div className="mb-7 text-center">
          <Link to="/login" className="mb-4 inline-flex text-xs font-semibold text-[#1A3A6B] hover:underline">
            Voltar para o Login
          </Link>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A3A6B] p-2 shadow-md">
            <img src="/logoiasd.png" alt="Logo IASD" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3A6B] sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
            Ativar Acesso
          </h1>
          <p className="mt-1 text-sm text-gray-500">{info.label}</p>
        </div>

        <form onSubmit={ativar} className="space-y-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-xl sm:p-7">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-sm leading-relaxed text-blue-950">{info.descricao}</p>
          </div>

          {info.escopo === 'regiao' && (
            <SelectField label="Região" value={form.regiaoId} onChange={(e) => alterar('regiaoId', e.target.value)} required>
              <option value="">Selecione a região</option>
              {regioes.map((regiao) => <option key={regiao.id} value={regiao.id}>{regiao.nome}</option>)}
            </SelectField>
          )}

          {info.escopo === 'distrito' && (
            <SelectField label="Distrito" value={form.distritoId} onChange={(e) => alterar('distritoId', e.target.value)} required>
              <option value="">Selecione o distrito</option>
              {distritos.map((distrito) => (
                <option key={distrito.id} value={distrito.id}>{distrito.nome} ({distrito.regiao?.nome})</option>
              ))}
            </SelectField>
          )}

          {info.escopo === 'igreja' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField label="Região" value={form.regiaoId} onChange={(e) => alterar('regiaoId', e.target.value)} required>
                <option value="">Região</option>
                {regioes.map((regiao) => <option key={regiao.id} value={regiao.id}>{regiao.nome}</option>)}
              </SelectField>
              <SelectField label="Distrito" value={form.distritoId} onChange={(e) => alterar('distritoId', e.target.value)} required disabled={!form.regiaoId}>
                <option value="">Distrito</option>
                {distritosFiltrados.map((distrito) => <option key={distrito.id} value={distrito.id}>{distrito.nome}</option>)}
              </SelectField>
              <SelectField label="Igreja" value={form.igrejaId} onChange={(e) => alterar('igrejaId', e.target.value)} required disabled={!form.distritoId}>
                <option value="">Igreja</option>
                {igrejasFiltradas.map((igreja) => <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>)}
              </SelectField>
            </div>
          )}

          {info.tipo === 'DUPLA_MISSIONARIA' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField label="Região" value={form.regiaoId} onChange={(e) => alterar('regiaoId', e.target.value)} required>
                  <option value="">Região</option>
                  {regioes.map((regiao) => <option key={regiao.id} value={regiao.id}>{regiao.nome}</option>)}
                </SelectField>
                <SelectField label="Distrito" value={form.distritoId} onChange={(e) => alterar('distritoId', e.target.value)} required disabled={!form.regiaoId}>
                  <option value="">Distrito</option>
                  {distritosFiltrados.map((distrito) => <option key={distrito.id} value={distrito.id}>{distrito.nome}</option>)}
                </SelectField>
                <SelectField label="Igreja" value={form.igrejaId} onChange={(e) => alterar('igrejaId', e.target.value)} required disabled={!form.distritoId}>
                  <option value="">Igreja</option>
                  {igrejasFiltradas.map((igreja) => <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>)}
                </SelectField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nome do líder" value={form.liderNome} onChange={(e) => alterar('liderNome', e.target.value)} required />
                <TextField label="Nome do parceiro" value={form.membro2Nome} onChange={(e) => alterar('membro2Nome', e.target.value)} required />
              </div>
              <button
                type="button"
                onClick={buscarDupla}
                disabled={salvando}
                className="h-11 w-full rounded-lg border border-[#1A3A6B]/30 text-sm font-bold text-[#1A3A6B] transition hover:bg-[#1A3A6B]/5 disabled:opacity-50"
              >
                Localizar dupla existente
              </button>

              {duplaBusca?.encontrada && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {duplaBusca.confirmadaManualmente ? 'Dupla confirmada: ' : 'Encontramos a dupla '}
                  <strong>{duplaBusca.dupla.liderNome} e {duplaBusca.dupla.membro2Nome}</strong> em {duplaBusca.dupla.igreja?.nome}. Crie abaixo o novo login e senha.
                </div>
              )}

              {duplaBusca?.possivel && !duplaBusca.encontrada && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
                  <p className="font-semibold">{duplaBusca.mensagem}</p>
                  <div className="mt-3 space-y-3">
                    {duplaBusca.possiveis?.map((dupla) => (
                      <div key={dupla.id} className="rounded-xl border border-blue-100 bg-white p-3">
                        <p>
                          <strong>{dupla.liderNome}</strong> e <strong>{dupla.membro2Nome}</strong>
                          {dupla.igreja?.nome ? ` — ${dupla.igreja.nome}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-blue-700">Semelhança aproximada: {dupla.confianca}%</p>
                        <button
                          type="button"
                          onClick={() => confirmarDuplaPossivel(dupla)}
                          className="mt-3 rounded-lg bg-[#1A3A6B] px-4 py-2 text-xs font-bold text-white"
                        >
                          Sim, sou esta dupla
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-blue-800">
                    Se nenhuma opção acima for a dupla correta, revise os nomes ou prossiga para cadastrar uma nova dupla.
                  </p>
                  <button
                    type="button"
                    onClick={cadastrarNovaDupla}
                    className="mt-3 rounded-lg border border-[#1A3A6B]/30 bg-white px-4 py-2 text-xs font-bold text-[#1A3A6B]"
                  >
                    Não é nenhuma destas, cadastrar nova dupla
                  </button>
                </div>
              )}

              {duplaBusca && !duplaBusca.encontrada && !duplaBusca.possivel && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                  <p>{duplaBusca.mensagem}</p>
                  <button
                    type="button"
                    onClick={cadastrarNovaDupla}
                    className="mt-3 rounded-lg bg-[#1A3A6B] px-4 py-2 text-xs font-bold text-white"
                  >
                    Cadastrar nova dupla com estes dados
                  </button>
                </div>
              )}
            </div>
          )}

          {info.tipo !== 'DUPLA_MISSIONARIA' && (
            <div className={info.tipo === 'PASTOR_DISTRITAL' ? 'grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-end' : ''}>
              {info.tipo === 'PASTOR_DISTRITAL' && (
                <AvatarUpload
                  value={form.fotoPastor}
                  onChange={(valor) => alterar('fotoPastor', valor)}
                  label="Foto do Pastor (opcional)"
                />
              )}
              <TextField
                label={info.tipo === 'PASTOR_DISTRITAL' ? 'Nome do pastor distrital (opcional)' : 'Nome que aparecerá no sistema'}
                value={form.nome}
                onChange={(e) => alterar('nome', e.target.value)}
                placeholder={info.tipo === 'PASTOR_DISTRITAL' ? 'Opcional: deixe em branco para usar o nome já cadastrado' : 'Opcional: deixe em branco para usar o nome do cargo/local'}
              />
            </div>
          )}

          {requerConfirmacaoSensivel && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Confirmação de acesso geral</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Este QR Code altera um acesso sensível. Digite <strong>{textoConfirmacao}</strong> para continuar.
              </p>
              <input
                type="text"
                value={form.confirmacao}
                onChange={(e) => alterar('confirmacao', e.target.value)}
                className="input-field mt-3 uppercase"
                placeholder={textoConfirmacao}
                required
              />
            </div>
          )}

          <div className="grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
            <TextField label="E-mail de login" type="email" value={form.email} onChange={(e) => alterar('email', e.target.value)} required autoComplete="username" />
            <div className="hidden sm:block" />
            <TextField label="Senha" type="password" minLength={8} value={form.senha} onChange={(e) => alterar('senha', e.target.value)} required autoComplete="new-password" />
            <TextField label="Confirmar senha" type="password" minLength={8} value={form.confirmarSenha} onChange={(e) => alterar('confirmarSenha', e.target.value)} required autoComplete="new-password" />
          </div>

          <button
            type="submit"
            disabled={salvando || (info.tipo === 'DUPLA_MISSIONARIA' && !duplaBusca?.encontrada)}
            className="btn-primary w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? 'Ativando...' : 'Ativar acesso'}
          </button>
        </form>
      </main>
    </div>
  );
}
