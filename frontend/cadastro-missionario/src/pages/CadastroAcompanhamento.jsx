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
  evangelismo: {
    titulo: 'Cadastro de Evangelismo',
    subtitulo: 'Registre contato, dupla responsável e estudo atual',
    endpoint: '/evangelismos',
    nomeCampo: 'nomePessoa',
    nomeLabel: 'Nome da Pessoa',
    dataCampo: 'diaEvangelismo',
    dataLabel: 'Dia do Evangelismo',
    duplaLabel: 'Dupla responsável',
    atualCampo: 'estudoAtual',
    atualLabel: 'Estudo Atual',
    sucesso: 'Evangelismo cadastrado com sucesso!',
  },
};

const estadoInicial = {
  nomeEstudante: '',
  nomePessoa: '',
  endereco: '',
  cidade: '',
  estado: 'SP',
  whatsapp: '',
  diaEstudo: '',
  diaEvangelismo: '',
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

const Secao = ({ numero, titulo, children }) => (
  <section className="card">
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
        {numero}
      </div>
      <h2 className="font-bold text-[#1A3A6B]">{titulo}</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </section>
);

export default function CadastroAcompanhamento({ tipo = 'estudo' }) {
  const config = configs[tipo] || configs.estudo;
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const [form, setForm] = useState(estadoInicial);
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

  const limpar = () => setForm(estadoInicial);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setEnviando(true);
    try {
      const payload = {
        ...form,
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        [config.nomeCampo]: form[config.nomeCampo],
        [config.dataCampo]: form[config.dataCampo],
        [config.atualCampo]: form[config.atualCampo],
      };

      await api.post(config.endpoint, payload);
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
            <Secao numero="1" titulo={tipo === 'estudo' ? 'Dados do Estudante' : 'Dados do Contato'}>
              <Campo label={config.nomeLabel} obrigatorio>
                <input className="input-field" value={form[config.nomeCampo]} onChange={(e) => set(config.nomeCampo, e.target.value)} required />
              </Campo>
              <Campo label="WhatsApp" obrigatorio>
                <input className="input-field" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(11) 99999-0000" required />
              </Campo>
              <Campo label="Endereço" obrigatorio>
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
            </Secao>

            <Secao numero="2" titulo={tipo === 'estudo' ? 'Dados do Estudo' : 'Dados do Evangelismo'}>
              <Campo label={config.dataLabel} obrigatorio>
                <select className="input-field" value={form[config.dataCampo]} onChange={(e) => set(config.dataCampo, e.target.value)} required>
                  <option value="">Selecione o dia</option>
                  {DIAS_SEMANA.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
                </select>
              </Campo>
              <Campo label={config.duplaLabel} obrigatorio>
                <select className="input-field" value={form.duplaId} onChange={(e) => set('duplaId', e.target.value)} required>
                  <option value="">Selecione a dupla</option>
                  {duplas.map((dupla) => (
                    <option key={dupla.id} value={dupla.id}>
                      {dupla.liderNome} + {dupla.membro2Nome}
                    </option>
                  ))}
                </select>
              </Campo>
            </Secao>

            <Secao numero="3" titulo={tipo === 'estudo' ? 'Série de Estudo' : 'Série de Evangelismo'}>
              <Campo label="Série" obrigatorio>
                <select className="input-field" value={form.serie} onChange={(e) => set('serie', e.target.value)} required>
                  <option value="">Selecione a série</option>
                  {SERIES_ESTUDO.map((serie) => <option key={serie.id} value={serie.id}>{serie.nome}</option>)}
                </select>
              </Campo>
              <Campo label={config.atualLabel} obrigatorio>
                <select className="input-field" value={form[config.atualCampo]} onChange={(e) => set(config.atualCampo, e.target.value)} required disabled={!form.serie}>
                  <option value="">Selecione primeiro a série</option>
                  {licoes.map((licao) => (
                    <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>
                  ))}
                </select>
              </Campo>
            </Secao>
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
