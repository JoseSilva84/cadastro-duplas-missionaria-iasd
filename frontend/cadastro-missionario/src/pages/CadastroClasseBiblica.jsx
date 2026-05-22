import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import { DIAS_SEMANA, SERIES_ESTUDO, UFS_BRASIL, formatarWhatsApp } from '../lib/seriesEstudo';

const criarParticipante = (ordem) => ({
  ordem,
  nome: '',
  whatsapp: '',
  sexo: '',
  endereco: '',
  classificacaoInteressado: '',
  motivoImpedimento: '',
});

const estadoInicial = {
  nomeClasse: '',
  endereco: '',
  cidade: '',
  estado: 'SP',
  diaEstudo: '',
  duplaId: '',
  serie: '',
  licaoAtual: '',
};

const classificacoes = [
  { value: 'A', label: 'A', desc: 'Pronto para o batismo', cor: '#16a34a', bg: '#dcfce7' },
  { value: 'B', label: 'B', desc: 'Quer, mas tem impedimento', cor: '#b45309', bg: '#fef3c7' },
  { value: 'C', label: 'C', desc: 'Não está pronto', cor: '#dc2626', bg: '#fee2e2' },
];

const Campo = ({ label, children, obrigatorio }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-600 mb-1.5">
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </span>
    {children}
  </label>
);

const Secao = ({ numero, titulo, children }) => (
  <section className="card">
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
      <div className="w-9 h-9 rounded-lg bg-[#1A3A6B] flex items-center justify-center text-white font-bold text-sm shadow-md">
        {numero}
      </div>
      <h2 className="font-bold text-[#1A3A6B]">{titulo}</h2>
    </div>
    {children}
  </section>
);

export default function CadastroClasseBiblica() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const [form, setForm] = useState(estadoInicial);
  const [participantes, setParticipantes] = useState([criarParticipante(1)]);
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
      [campo]: valor,
      ...(campo === 'serie' ? { licaoAtual: '' } : {}),
    }));
  };

  const setParticipante = (index, campo, valor) => {
    setParticipantes((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const novo = {
        ...item,
        [campo]: campo === 'whatsapp' ? formatarWhatsApp(valor) : valor,
      };
      if (campo === 'classificacaoInteressado' && valor === 'A') {
        novo.motivoImpedimento = '';
      }
      return novo;
    }));
  };

  const adicionarParticipante = () => {
    setParticipantes((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, criarParticipante(prev.length + 1)];
    });
  };

  const removerParticipante = (index) => {
    setParticipantes((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, ordem: i + 1 })));
  };

  const validarParticipantes = () => {
    const preenchidos = participantes.filter((p) => p.nome.trim());
    if (preenchidos.length === 0) {
      toast.error('Informe pelo menos um participante da classe bíblica.');
      return null;
    }

    const incompletos = preenchidos.filter((p) => !p.classificacaoInteressado);
    if (incompletos.length > 0) {
      toast.error('Classifique todos os participantes preenchidos como A, B ou C.');
      return null;
    }

    const semMotivo = preenchidos.filter((p) => ['B', 'C'].includes(p.classificacaoInteressado) && !p.motivoImpedimento.trim());
    if (semMotivo.length > 0) {
      toast.error('Participantes B ou C precisam ter o motivo informado.');
      return null;
    }

    return preenchidos.map((p) => ({
      nome: p.nome.trim(),
      whatsapp: p.whatsapp.replace(/\D/g, '') || null,
      sexo: p.sexo || null,
      endereco: p.endereco.trim() || null,
      classificacaoInteressado: p.classificacaoInteressado,
      motivoImpedimento: p.motivoImpedimento.trim() || null,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const participantesValidos = validarParticipantes();
    if (!participantesValidos) return;

    setEnviando(true);
    try {
      await api.post('/estudos-biblicos', {
        nomeEstudante: form.nomeClasse,
        endereco: form.endereco,
        cidade: form.cidade,
        estado: form.estado,
        whatsapp: participantesValidos[0]?.whatsapp || '00000000000',
        diaEstudo: form.diaEstudo,
        duplaId: form.duplaId,
        serie: form.serie,
        licaoAtual: form.licaoAtual,
        tipoEstudo: 'CLASSE',
        participantes: participantesValidos,
      });

      toast.success('Classe Bíblica cadastrada com sucesso.');
      setForm(estadoInicial);
      setParticipantes([criarParticipante(1)]);
      setTimeout(() => navigate(isDireto ? '/direto/relatorios/estudos-biblicos' : '/relatorios/estudos-biblicos'), 500);
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : err.response?.data?.erro || 'Erro ao salvar classe bíblica.');
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
          Classe Bíblica
        </h1>
        <p className="text-gray-400 text-sm mt-1">Registre a classe, a série de estudos e até 10 participantes.</p>
      </div>

      <form onSubmit={handleSubmit} className={isDireto ? 'flex-1 flex flex-col min-h-0' : 'space-y-6'}>
        <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F5F7]' : 'space-y-6'}>
          <div className="max-w-6xl mx-auto space-y-5">
            <Secao numero="1" titulo="Dados da Classe">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Nome da Classe Bíblica" obrigatorio>
                  <input className="input-field" value={form.nomeClasse} onChange={(e) => set('nomeClasse', e.target.value)} required />
                </Campo>
                <Campo label="Dupla responsável" obrigatorio>
                  <select className="input-field" value={form.duplaId} onChange={(e) => set('duplaId', e.target.value)} required>
                    <option value="">Selecione a dupla</option>
                    {duplas.map((dupla) => (
                      <option key={dupla.id} value={dupla.id}>{dupla.liderNome} + {dupla.membro2Nome}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Endereço / Local" obrigatorio>
                  <input className="input-field" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} required />
                </Campo>
                <Campo label="Cidade" obrigatorio>
                  <input className="input-field" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} required />
                </Campo>
                <Campo label="Estado" obrigatorio>
                  <select className="input-field" value={form.estado} onChange={(e) => set('estado', e.target.value)} required>
                    {UFS_BRASIL.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </Campo>
                <Campo label="Dia da Classe" obrigatorio>
                  <select className="input-field" value={form.diaEstudo} onChange={(e) => set('diaEstudo', e.target.value)} required>
                    <option value="">Selecione o dia</option>
                    {DIAS_SEMANA.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
                  </select>
                </Campo>
              </div>
            </Secao>

            <Secao numero="2" titulo="Série e Lição">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Série de Estudo" obrigatorio>
                  <select className="input-field" value={form.serie} onChange={(e) => set('serie', e.target.value)} required>
                    <option value="">Selecione a série</option>
                    {SERIES_ESTUDO.map((serie) => <option key={serie.id} value={serie.id}>{serie.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Lição Atual" obrigatorio>
                  <select className="input-field" value={form.licaoAtual} onChange={(e) => set('licaoAtual', e.target.value)} required disabled={!form.serie}>
                    <option value="">Selecione primeiro a série</option>
                    {licoes.map((licao) => (
                      <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>
                    ))}
                  </select>
                </Campo>
              </div>
            </Secao>

            <Secao numero="3" titulo="Participantes">
              <div className="space-y-4">
                {participantes.map((participante, index) => (
                  <div key={participante.ordem} className="rounded-lg border border-gray-100 bg-[#F4F5F7] p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-bold text-[#1A3A6B]">Participante {index + 1}</h3>
                      {participantes.length > 1 && (
                        <button type="button" className="text-xs font-semibold text-red-500 hover:text-red-600" onClick={() => removerParticipante(index)}>
                          Remover
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <Campo label="Nome" obrigatorio={index === 0}>
                        <input className="input-field" value={participante.nome} onChange={(e) => setParticipante(index, 'nome', e.target.value)} required={index === 0} />
                      </Campo>
                      <Campo label="WhatsApp">
                        <input className="input-field" value={participante.whatsapp} onChange={(e) => setParticipante(index, 'whatsapp', e.target.value)} placeholder="(11) 99999-0000" />
                      </Campo>
                      <Campo label="Sexo">
                        <select className="input-field" value={participante.sexo} onChange={(e) => setParticipante(index, 'sexo', e.target.value)}>
                          <option value="">Selecione</option>
                          <option value="FEMININO">Feminino</option>
                          <option value="MASCULINO">Masculino</option>
                        </select>
                      </Campo>
                      <Campo label="Classificação" obrigatorio={Boolean(participante.nome.trim())}>
                        <select className="input-field" value={participante.classificacaoInteressado} onChange={(e) => setParticipante(index, 'classificacaoInteressado', e.target.value)}>
                          <option value="">A, B ou C</option>
                          {classificacoes.map((item) => <option key={item.value} value={item.value}>{item.label} - {item.desc}</option>)}
                        </select>
                      </Campo>
                      <div className="md:col-span-2">
                        <Campo label="Endereço do participante">
                          <input className="input-field" value={participante.endereco} onChange={(e) => setParticipante(index, 'endereco', e.target.value)} />
                        </Campo>
                      </div>
                      {['B', 'C'].includes(participante.classificacaoInteressado) && (
                        <div className="md:col-span-2">
                          <Campo label={`Motivo da Classe ${participante.classificacaoInteressado}`} obrigatorio>
                            <input
                              className="input-field"
                              value={participante.motivoImpedimento}
                              onChange={(e) => setParticipante(index, 'motivoImpedimento', e.target.value)}
                              placeholder="Ex.: precisa se casar, dificuldade com sábado, ainda não decidiu..."
                              required
                            />
                          </Campo>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">{participantes.length}/10 participantes adicionados</p>
                  <button type="button" className="btn-outline text-sm px-4 py-2" onClick={adicionarParticipante} disabled={participantes.length >= 10}>
                    Adicionar participante
                  </button>
                </div>
              </div>
            </Secao>
          </div>
        </div>

        <div className={isDireto ? 'flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3' : 'max-w-6xl mx-auto flex justify-end gap-3 pb-8'}>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Cancelar</button>
          <button type="submit" disabled={enviando} className="btn-primary">{enviando ? 'Salvando...' : 'Salvar Classe Bíblica'}</button>
        </div>
      </form>
    </div>
  );
}
