import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { toast } from '../../lib/toast';
import {
  DATA_MAX, DATA_MIN, DEPARTAMENTOS, formatarDia, moeda, periodoTema,
} from '../../lib/calendario';

const msgErro = (err, padrao) => err.response?.data?.erro || padrao;

export default function TemaModal({
  tema,
  permissoes,
  onFechar,
  onMudou,
  onAbrirEvento,
}) {
  const novo = !tema?.id;
  const [temaForm, setTemaForm] = useState(() => ({
    nome: tema?.nome || '',
    descricao: tema?.descricao || '',
    tipo: tema?.tipo || 'OUTRO',
    dataInicio: tema?.dataInicio ? String(tema.dataInicio).slice(0, 10) : '',
    dataFim: tema?.dataFim ? String(tema.dataFim).slice(0, 10) : '',
  }));
  const [salvandoTema, setSalvandoTema] = useState(false);

  // Formulário para adicionar novo evento preparatório ao tema
  const [novoEventoAberto, setNovoEventoAberto] = useState(false);
  const [eventoForm, setEventoForm] = useState({
    nome: '',
    data: '',
    departamento: 'OUTRO',
    descricao: '',
  });
  const [salvandoEvento, setSalvandoEvento] = useState(false);

  const eventos = tema?.eventos || [];

  useEffect(() => {
    const teclas = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', teclas);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', teclas);
      document.body.style.overflow = anterior;
    };
  }, [onFechar]);

  const setT = (campo, valor) => setTemaForm((f) => ({ ...f, [campo]: valor }));

  const salvarTema = async () => {
    if (!temaForm.nome.trim()) { toast.error('Informe o tema do evento.'); return; }
    const corpo = {
      ...temaForm,
      dataInicio: temaForm.dataInicio || null,
      dataFim: temaForm.dataFim || null,
    };
    setSalvandoTema(true);
    try {
      if (novo) {
        const res = await api.post('/calendario-missionario/temas', corpo);
        toast.success('Tema criado com sucesso!');
        onMudou(res.data.id);
      } else {
        await api.put(`/calendario-missionario/temas/${tema.id}`, corpo);
        toast.success('Tema atualizado.');
        onMudou(tema.id);
      }
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao salvar o tema.'));
    } finally {
      setSalvandoTema(false);
    }
  };

  const excluirTema = async () => {
    if (!window.confirm(`Excluir o tema "${tema.nome}" e todos os eventos vinculados a ele?`)) return;
    try {
      await api.delete(`/calendario-missionario/temas/${tema.id}`);
      toast.success('Tema excluído.');
      onMudou(null);
      onFechar();
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao excluir o tema.'));
    }
  };

  const criarEvento = async () => {
    if (!eventoForm.nome.trim()) { toast.error('Informe o nome do evento.'); return; }
    setSalvandoEvento(true);
    try {
      await api.post('/calendario-missionario/eventos', {
        temaId: tema.id,
        nome: eventoForm.nome,
        data: eventoForm.data || null,
        departamento: eventoForm.departamento,
        descricao: eventoForm.descricao,
      });
      toast.success('Evento criado e vinculado ao tema!');
      setNovoEventoAberto(false);
      setEventoForm({ nome: '', data: '', departamento: 'OUTRO', descricao: '' });
      onMudou(tema.id);
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao criar evento.'));
    } finally {
      setSalvandoEvento(false);
    }
  };

  const editarTema = novo ? permissoes.criarTema : permissoes.editarTema;
  const podeAdicionarEvento = permissoes.criarEvento;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-auto flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Tema */}
        <div className="relative bg-gradient-to-br from-[#1A3A6B] via-[#16335e] to-[#112749] p-5 sm:p-6 text-white">
          <button
            type="button"
            onClick={onFechar}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl font-bold transition hover:bg-white/25"
            aria-label="Fechar"
          >
            ×
          </button>

          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#E3B965]">
            Tema Central da Associação
          </p>

          {editarTema ? (
            <div className="mt-2 space-y-3 pr-10">
              <input
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xl font-black text-white placeholder-white/50 outline-none focus:border-[#E3B965]"
                value={temaForm.nome}
                onChange={(e) => setT('nome', e.target.value)}
                placeholder="Nome do tema (ex: Semana Santa)"
                style={{ fontFamily: 'Georgia, serif' }}
              />

              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Data de Início
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white outline-none [color-scheme:dark] focus:border-[#E3B965]"
                    min={DATA_MIN}
                    max={DATA_MAX}
                    value={temaForm.dataInicio}
                    onChange={(e) => setT('dataInicio', e.target.value)}
                  />
                </label>

                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Data de Fim
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white outline-none [color-scheme:dark] focus:border-[#E3B965]"
                    min={DATA_MIN}
                    max={DATA_MAX}
                    value={temaForm.dataFim}
                    onChange={(e) => setT('dataFim', e.target.value)}
                  />
                </label>
              </div>

              <textarea
                className="min-h-[70px] w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/50 outline-none focus:border-[#E3B965]"
                value={temaForm.descricao}
                onChange={(e) => setT('descricao', e.target.value)}
                placeholder="Orientações e diretrizes do tema para os pastores e igrejas (opcional)"
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-xl bg-[#C9963A] px-5 py-2 text-xs font-black text-white shadow-md transition hover:bg-[#b4852f] disabled:opacity-60"
                  disabled={salvandoTema}
                  onClick={salvarTema}
                >
                  {salvandoTema ? 'Salvando...' : novo ? 'Criar Tema' : 'Salvar Alterações'}
                </button>
                {!novo && permissoes.excluirTema && (
                  <button
                    type="button"
                    className="rounded-xl border border-red-300/40 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20"
                    onClick={excluirTema}
                  >
                    Excluir Tema
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="pr-10">
              <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
                {tema?.nome}
              </h2>
              <p className="mt-1 text-sm text-white/80 font-medium">{periodoTema(tema)}</p>
              {tema?.descricao && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-white/90">
                  {tema.descricao}
                </p>
              )}
              {permissoes.excluirTema && (
                <button
                  type="button"
                  className="mt-3 rounded-xl border border-red-300/40 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20"
                  onClick={excluirTema}
                >
                  Excluir Tema
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lista de Eventos Preparatórios deste Tema */}
        {!novo && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#1A3A6B]">
                  Eventos Preparatórios ({eventos.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Atividades e mobilizações que preparam para este tema
                </p>
              </div>

              {podeAdicionarEvento && !novoEventoAberto && (
                <button
                  type="button"
                  className="btn-primary px-3.5 py-1.5 text-xs font-bold"
                  onClick={() => setNovoEventoAberto(true)}
                >
                  + Adicionar Evento a este Tema
                </button>
              )}
            </div>

            {/* Formulário para novo evento */}
            {novoEventoAberto && (
              <div className="rounded-xl border border-[#C9963A]/40 bg-white p-4 shadow-sm space-y-3">
                <p className="text-xs font-bold text-[#1A3A6B]">
                  Novo evento preparatório para “{tema.nome}”
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Nome do Evento *
                      <input
                        className="input-field mt-1"
                        value={eventoForm.nome}
                        onChange={(e) => setEventoForm((f) => ({ ...f, nome: e.target.value }))}
                        placeholder="Ex.: Ações ASA, Feira de Saúde, etc."
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Departamento
                      <select
                        className="input-field mt-1"
                        value={eventoForm.departamento}
                        onChange={(e) => setEventoForm((f) => ({ ...f, departamento: e.target.value }))}
                      >
                        {Object.entries(DEPARTAMENTOS).map(([k, d]) => (
                          <option key={k} value={k}>{d.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Data de Referência
                    <input
                      type="date"
                      className="input-field mt-1"
                      min={DATA_MIN}
                      max={DATA_MAX}
                      value={eventoForm.data}
                      onChange={(e) => setEventoForm((f) => ({ ...f, data: e.target.value }))}
                    />
                  </label>

                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Orientações do Evento (opcional)
                    <input
                      className="input-field mt-1"
                      value={eventoForm.descricao}
                      onChange={(e) => setEventoForm((f) => ({ ...f, descricao: e.target.value }))}
                      placeholder="Breve instrução"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="btn-outline px-3.5 py-1.5 text-xs font-bold"
                    onClick={() => setNovoEventoAberto(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-4 py-1.5 text-xs font-bold"
                    disabled={salvandoEvento}
                    onClick={criarEvento}
                  >
                    {salvandoEvento ? 'Salvando...' : 'Salvar Evento'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista dos eventos */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {eventos.map((ev) => {
                const depto = DEPARTAMENTOS[ev.departamento] || DEPARTAMENTOS.OUTRO;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onAbrirEvento(ev, tema)}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#C9963A] hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9.5px] font-black text-white"
                          style={{ backgroundColor: depto.cor }}
                        >
                          {depto.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatarDia(ev.data)}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm font-black text-[#1A3A6B] group-hover:text-[#9A6F1F]">
                        {ev.nome}
                      </p>
                      {ev.descricao && (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{ev.descricao}</p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-bold">
                      <span className="text-slate-600">{ev.totalAcoes || 0} ação(ões)</span>
                      <span className="text-[#C9963A] font-black">
                        {moeda(ev.orcamentoTotal || 0)} →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {eventos.length === 0 && !novoEventoAberto && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-400">
                Nenhum evento preparatório cadastrado para este tema.
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-white px-5 py-3">
          <button type="button" className="btn-outline px-4 py-1.5 text-xs font-bold" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
