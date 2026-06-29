import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import { DIAS_SEMANA, SERIES_ESTUDO, UFS_BRASIL, formatarWhatsApp } from '../lib/seriesEstudo';

const configs = {
  estudo: {
    titulo: 'Cadastro de Estudo Bíblico',
    subtitulo: 'Registre estudante, dupla responsável e lição atual',
    endpoint: '/estudos-biblicos',
    nomeCampo: 'nomeEstudante',
    nomeLabel: 'Nome do Estudante da Bíblia',
    dataCampo: 'diaEstudo',
    dataLabel: 'Dia do Estudo',
    duplaLabel: 'Dupla que está dando o estudo',
    atualCampo: 'licaoAtual',
    atualLabel: 'Lição Atual',
    sucesso: 'Estudo bíblico cadastrado com sucesso!',
  },
  ponto: {
    titulo: 'Cadastro de Ponto de Estudo',
    subtitulo: 'Registre até 5 estudantes, dupla responsável e lição atual',
    endpoint: '/estudos-biblicos',
    nomeCampo: 'nomeEstudante',
    nomeLabel: 'Nome do Ponto de Estudo',
    dataCampo: 'diaEstudo',
    dataLabel: 'Dia do Estudo',
    duplaLabel: 'Dupla que está dando o estudo',
    atualCampo: 'licaoAtual',
    atualLabel: 'Lição Atual',
    sucesso: 'Ponto de estudo cadastrado com sucesso!',
  },
  evangelismo: {
    titulo: 'Cadastro de Classe Bíblica',
    subtitulo: 'Registre contato, dupla responsável e estudo atual',
    endpoint: '/evangelismos',
    nomeCampo: 'nomePessoa',
    nomeLabel: 'Nome da Pessoa',
    dataCampo: 'diaEvangelismo',
    dataLabel: 'Dia da Classe Bíblica',
    duplaLabel: 'Dupla responsável',
    atualCampo: 'estudoAtual',
    atualLabel: 'Estudo Atual',
    sucesso: 'Classe Bíblica cadastrada com sucesso!',
  },
};

const participanteVazio = () => ({
  nome: '',
  whatsapp: '',
  sexo: '',
  endereco: '',
  classificacaoInteressado: '',
  motivoImpedimento: '',
});

const estadoInicial = {
  nomeEstudante: '',
  nomePessoa: '',
  endereco: '',
  cidade: '',
  estado: 'SP',
  whatsapp: '',
  sexo: '',
  classificacaoInteressado: '',
  motivoImpedimento: '',
  vaIgreja: '',
  leBiblia: '',
  estudaLicao: '',
  devolveDizimos: '',
  cultoFamiliar: '',
  observacoes: '',
  diaEstudo: '',
  diaEvangelismo: '',
  horarioEstudo: '',
  duplaId: '',
  serie: '',
  licaoAtual: '',
  estudoAtual: '',
};

const Campo = ({ label, children, obrigatorio }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-600 mb-1.5">
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </span>
    {children}
  </label>
);

const Secao = ({ numero, titulo, children, compacto = false }) => (
  <section className="card">
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
        {numero}
      </div>
      <h2 className="font-bold text-[#1A3A6B]">{titulo}</h2>
    </div>
    <div className={compacto ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>{children}</div>
  </section>
);

const BooleanSelect = ({ value, onChange }) => (
  <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">Não informado</option>
    <option value="true">Sim</option>
    <option value="false">Não</option>
  </select>
);

const valorBooleano = (valor) => {
  if (valor === '') return undefined;
  return valor === 'true';
};

const removerVazios = (objeto) => Object.fromEntries(
  Object.entries(objeto).filter(([, valor]) => valor !== '' && valor !== undefined)
);

export default function CadastroAcompanhamento({ tipo = 'estudo' }) {
  const config = configs[tipo] || configs.estudo;
  const isEstudo = tipo === 'estudo';
  const isPonto = tipo === 'ponto';
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const [form, setForm] = useState(estadoInicial);
  const [participantes, setParticipantes] = useState([participanteVazio()]);
  const [duplas, setDuplas] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get('/duplas').then((res) => setDuplas(Array.isArray(res.data) ? res.data : []));
  }, []);

  const licoes = useMemo(() => (
    SERIES_ESTUDO.find((serie) => serie.id === form.serie)?.licoes || []
  ), [form.serie]);

  const set = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: campo === 'whatsapp' ? formatarWhatsApp(valor) : valor,
      ...(campo === 'serie' ? { licaoAtual: '', estudoAtual: '' } : {}),
    }));
  };

  const setParticipante = (index, campo, valor) => {
    setParticipantes((prev) => prev.map((participante, i) => (
      i === index
        ? { ...participante, [campo]: campo === 'whatsapp' ? formatarWhatsApp(valor) : valor }
        : participante
    )));
  };

  const adicionarParticipante = () => {
    setParticipantes((prev) => (prev.length >= 5 ? prev : [...prev, participanteVazio()]));
  };

  const removerParticipante = (index) => {
    setParticipantes((prev) => prev.filter((_, i) => i !== index));
  };

  const limpar = () => {
    setForm(estadoInicial);
    setParticipantes([participanteVazio()]);
  };

  const montarParticipantes = () => {
    const preenchidos = participantes.filter((participante) => participante.nome.trim());
    if (!isPonto) return [];
    if (preenchidos.length === 0) {
      toast.error('Informe pelo menos um estudante do ponto de estudo.');
      return null;
    }
    const semWhatsApp = preenchidos.find((participante) => !participante.whatsapp.replace(/\D/g, ''));
    if (semWhatsApp) {
      toast.error('Informe o WhatsApp de cada estudante preenchido.');
      return null;
    }    return preenchidos.map((participante) => ({
      nome: participante.nome.trim(),
      whatsapp: participante.whatsapp.replace(/\D/g, '') || null,
      sexo: participante.sexo || null,
      endereco: participante.endereco.trim() || null,
      classificacaoInteressado: participante.classificacaoInteressado || null,
      motivoImpedimento: participante.motivoImpedimento.trim() || null,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const participantesValidos = montarParticipantes();
    if (participantesValidos === null) return;
    setEnviando(true);
    try {
      const primeiroParticipante = participantesValidos[0];
      const payload = {
        ...form,
        whatsapp: isPonto ? primeiroParticipante?.whatsapp : form.whatsapp.replace(/\D/g, ''),
        [config.nomeCampo]: isPonto ? (form.nomeEstudante || primeiroParticipante?.nome || 'Ponto de Estudo') : form[config.nomeCampo],
        [config.dataCampo]: form[config.dataCampo],
        [config.atualCampo]: form[config.atualCampo],
      };

      if (isEstudo) {
        payload.tipoEstudo = 'UNICO';
        payload.vaIgreja = valorBooleano(form.vaIgreja);
        payload.leBiblia = valorBooleano(form.leBiblia);
        payload.estudaLicao = valorBooleano(form.estudaLicao);
        payload.devolveDizimos = valorBooleano(form.devolveDizimos);
        payload.cultoFamiliar = valorBooleano(form.cultoFamiliar);
      }

      if (isPonto) {
        payload.tipoEstudo = 'PONTO';
        payload.participantes = participantesValidos;
      }

      await api.post(config.endpoint, removerVazios(payload));
      toast.success(config.sucesso);
      limpar();
      setTimeout(() => navigate(isDireto ? '/direto/relatorios/estudos-biblicos' : '/relatorios/estudos-biblicos'), 600);
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : err.response?.data?.erro || 'Erro ao salvar cadastro.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in' : 'min-h-screen animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Cadastro</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          {config.titulo}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{config.subtitulo}</p>
      </div>

      <form onSubmit={handleSubmit} className={isDireto ? 'flex-1 flex flex-col min-h-0' : 'space-y-6'}>
        <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F5F7]' : 'space-y-6'}>
          <div className="max-w-5xl mx-auto space-y-5">
            <Secao numero="1" titulo={isPonto ? 'Dados do Ponto' : tipo === 'estudo' ? 'Dados do Estudante' : 'Dados do Contato'}>
              <Campo label={config.nomeLabel} obrigatorio>
                <input className="input-field" value={form[config.nomeCampo]} onChange={(e) => set(config.nomeCampo, e.target.value)} required={!isPonto} />
              </Campo>
              {!isPonto && (
                <Campo label="WhatsApp" obrigatorio>
                  <input className="input-field" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(11) 99999-0000" required />
                </Campo>
              )}
              {!isPonto && isEstudo && (
                <>
                  <Campo label="Sexo">
                    <select className="input-field" value={form.sexo} onChange={(e) => set('sexo', e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="FEMININO">Feminino</option>
                      <option value="MASCULINO">Masculino</option>
                    </select>
                  </Campo>
                  <Campo label="Classificação do estudante">
                    <select className="input-field" value={form.classificacaoInteressado} onChange={(e) => set('classificacaoInteressado', e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="A">A - Pronto para o batismo</option>
                      <option value="B">B - Quer, mas tem impedimento</option>
                      <option value="C">C - Nao esta pronto</option>
                    </select>
                  </Campo>
                  {form.classificacaoInteressado === 'B' && (
                    <div className="md:col-span-2">
                      <Campo label="Motivo do impedimento">
                        <textarea
                          className="input-field min-h-24 resize-y"
                          value={form.motivoImpedimento}
                          onChange={(e) => set('motivoImpedimento', e.target.value)}
                          placeholder="Ex.: precisa se casar, parar de fumar, dificuldade com o sabado no trabalho..."
                        />
                      </Campo>
                    </div>
                  )}
                </>
              )}
              <Campo label={isPonto ? 'Endereço / Local do ponto' : 'Endereço'}>
                <input className="input-field" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
              </Campo>
              <Campo label="Cidade">
                <input className="input-field" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
              </Campo>
              <Campo label="Estado">
                <select className="input-field" value={form.estado} onChange={(e) => set('estado', e.target.value)}>
                  {UFS_BRASIL.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Campo>
            </Secao>

            <Secao numero="2" titulo={tipo === 'evangelismo' ? 'Dados da Classe Bíblica' : 'Dados do Estudo'}>
              <Campo label={config.dataLabel}>
                <select className="input-field" value={form[config.dataCampo]} onChange={(e) => set(config.dataCampo, e.target.value)}>
                  <option value="">Selecione o dia</option>
                  {DIAS_SEMANA.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
                </select>
              </Campo>
              {tipo !== 'evangelismo' && (
                <Campo label="Horário do Estudo">
                  <input type="time" className="input-field" value={form.horarioEstudo} onChange={(e) => set('horarioEstudo', e.target.value)} />
                </Campo>
              )}
              <Campo label={config.duplaLabel}>
                <select className="input-field" value={form.duplaId} onChange={(e) => set('duplaId', e.target.value)}>
                  <option value="">Selecione a dupla</option>
                  {duplas.map((dupla) => (
                    <option key={dupla.id} value={dupla.id}>
                      {dupla.liderNome} + {dupla.membro2Nome}
                    </option>
                  ))}
                </select>
              </Campo>
            </Secao>

            <Secao numero="3" titulo={tipo === 'evangelismo' ? 'Série da Classe Bíblica' : 'Série de Estudo'}>
              <Campo label="Estudo">
                <select className="input-field" value={form.serie} onChange={(e) => set('serie', e.target.value)}>
                  <option value="">Selecione a série</option>
                  {SERIES_ESTUDO.map((serie) => <option key={serie.id} value={serie.id}>{serie.nome}</option>)}
                </select>
              </Campo>
              <Campo label={config.atualLabel}>
                <select className="input-field" value={form[config.atualCampo]} onChange={(e) => set(config.atualCampo, e.target.value)} disabled={!form.serie}>
                  <option value="">Selecione primeiro a série</option>
                  {licoes.map((licao) => (
                    <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>
                  ))}
                </select>
              </Campo>
            </Secao>

            {isEstudo && (
              <Secao numero="4" titulo="Informações do Estudante">
                <Campo label="Está indo à igreja?"><BooleanSelect value={form.vaIgreja} onChange={(valor) => set('vaIgreja', valor)} /></Campo>
                <Campo label="Estuda a Bíblia?"><BooleanSelect value={form.leBiblia} onChange={(valor) => set('leBiblia', valor)} /></Campo>
                <Campo label="Estuda a lição da Escola Sabatina?"><BooleanSelect value={form.estudaLicao} onChange={(valor) => set('estudaLicao', valor)} /></Campo>
                <Campo label="Devolve os dízimos?"><BooleanSelect value={form.devolveDizimos} onChange={(valor) => set('devolveDizimos', valor)} /></Campo>
                <Campo label="Faz o culto familiar?"><BooleanSelect value={form.cultoFamiliar} onChange={(valor) => set('cultoFamiliar', valor)} /></Campo>
              </Secao>
            )}

            {isPonto && (
              <Secao numero="4" titulo="Estudantes" compacto>
                {participantes.map((participante, index) => (
                  <div key={index} className="rounded-lg border border-gray-100 bg-[#F4F5F7] p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-bold text-[#1A3A6B]">Estudante {index + 1}</h3>
                      {participantes.length > 1 && (
                        <button type="button" className="text-xs font-semibold text-red-500 hover:text-red-600" onClick={() => removerParticipante(index)}>
                          Remover
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      <Campo label={`Nome ${index + 1}`} obrigatorio={index === 0}>
                        <input className="input-field" value={participante.nome} onChange={(e) => setParticipante(index, 'nome', e.target.value)} required={index === 0} />
                      </Campo>
                      <Campo label="WhatsApp" obrigatorio={Boolean(participante.nome) || index === 0}>
                        <input className="input-field" value={participante.whatsapp} onChange={(e) => setParticipante(index, 'whatsapp', e.target.value)} placeholder="(11) 99999-0000" required={Boolean(participante.nome) || index === 0} />
                      </Campo>
                      <Campo label="Sexo">
                        <select className="input-field" value={participante.sexo} onChange={(e) => setParticipante(index, 'sexo', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="FEMININO">Feminino</option>
                          <option value="MASCULINO">Masculino</option>
                        </select>
                      </Campo>
                      <Campo label="Classificação A/B/C">
                        <select className="input-field" value={participante.classificacaoInteressado} onChange={(e) => setParticipante(index, 'classificacaoInteressado', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="A">A - Pronto para o batismo</option>
                          <option value="B">B - Quer, mas tem impedimento</option>
                          <option value="C">C - Nao esta pronto</option>
                        </select>
                      </Campo>
                      {participante.classificacaoInteressado === 'B' && (
                        <div className="md:col-span-2 xl:col-span-3">
                          <Campo label="Motivo do impedimento">
                            <textarea
                              className="input-field min-h-20 resize-y"
                              value={participante.motivoImpedimento}
                              onChange={(e) => setParticipante(index, 'motivoImpedimento', e.target.value)}
                              placeholder="Ex.: precisa se casar, parar de fumar, dificuldade com o sabado no trabalho..."
                        />
                          </Campo>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <Campo label="Endereço">
                          <input className="input-field" value={participante.endereco} onChange={(e) => setParticipante(index, 'endereco', e.target.value)} />
                        </Campo>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">{participantes.length}/5 estudantes adicionados</p>
                  <button type="button" className="btn-outline text-sm px-4 py-2" onClick={adicionarParticipante} disabled={participantes.length >= 5}>
                    Adicionar estudante
                  </button>
                </div>
              </Secao>
            )}

            {(isEstudo || isPonto) && (
              <Secao numero="5" titulo="Observações" compacto>
                <textarea
                  className="input-field min-h-28 resize-y"
                  value={form.observacoes}
                  onChange={(e) => set('observacoes', e.target.value)}
                  placeholder="Observações livres sobre o estudo"
                />
              </Secao>
            )}
          </div>
        </div>

        <div className={isDireto ? 'flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3' : 'max-w-5xl mx-auto flex justify-end gap-3 pb-8'}>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Cancelar</button>
          <button type="button" onClick={limpar} className="btn-outline">Limpar</button>
          <button type="submit" disabled={enviando} className="btn-primary">{enviando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}


