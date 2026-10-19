import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import { ehAdmin, PERFIS, useAuth } from '../contexts/AuthContext';
import { escopoUsuario, funcaoUsuario, nomePessoaUsuario } from '../lib/usuarioIdentidade';

const projetoLabel = {
  CASA_A_CASA: 'Visitação',
  ESTUDO_BIBLICO: 'Estudo Bíblico',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Classe Bíblica',
};

const projetoIcon = {
  CASA_A_CASA: '🏠',
  ESTUDO_BIBLICO: '📖',
  PEQUENOS_GRUPOS: '👥',
  ACAO_SOCIAL: '🤲',
  EVANGELISMO_PUBLICO: '📢',
};

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

function Ajuda({ children, texto, className = '' }) {
  return (
    <span
      className={`smart-tooltip inline-flex cursor-help items-center gap-1 border-b border-dotted border-current outline-none ${className}`}
      data-tooltip={texto}
      tabIndex={0}
    >
      {children}<span aria-hidden="true" className="text-[10px] opacity-70">ⓘ</span>
    </span>
  );
}

function SecaoProgressiva({ children, className = '', altura = 'min-h-64', ...props }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (visivel) return undefined;
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        setVisivel(true);
        observador.disconnect();
      }
    }, { rootMargin: '450px 0px' });
    if (ref.current) observador.observe(ref.current);
    return () => observador.disconnect();
  }, [visivel]);

  return (
    <section ref={ref} className={`${className} ${visivel ? '' : altura}`} {...props}>
      {visivel ? children : (
        <div className="flex h-full min-h-56 items-center justify-center rounded-2xl border border-slate-100 bg-white text-sm text-slate-400 shadow-sm">
          A análise será carregada ao se aproximar da tela.
        </div>
      )}
    </section>
  );
}

function TituloSecao({ icone, titulo, descricao, cor = 'from-[#1A3A6B] to-[#2a5298]' }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${cor} text-sm text-white shadow-sm`}>
        {icone}
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-slate-400">{descricao}</p>}
      </div>
    </div>
  );
}

function ListaDestaque({ titulo, descricao, itens = [], campo, cor = '#1A3A6B' }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <Ajuda texto={descricao} className="text-sm font-bold text-[#1A3A6B]">{titulo}</Ajuda>
      <div className="mt-3 space-y-2">
        {itens.map((item, indice) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 transition hover:bg-blue-50 active:bg-blue-100">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{indice + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{item.nome}</span>
            <strong className="text-sm" style={{ color: cor }}>{numero(item[campo])}</strong>
          </div>
        ))}
        {!itens.length && <p className="text-sm text-slate-400">Nenhum registro para esta análise.</p>}
      </div>
    </div>
  );
}

export default function Relatorios() {
  const { usuario } = useAuth();
  const isAdmin = ehAdmin(usuario);
  const isGestorRegional = [PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil);
  const podeConsultarRegioes = isAdmin || isGestorRegional;
  const escopo = escopoUsuario(usuario);
  const nomeEscopo = escopo.join(' • ') || 'Seu escopo de acesso';
  const [resumo, setResumo] = useState(null);
  const [porRegiao, setPorRegiao] = useState([]);
  const [painelAssociacao, setPainelAssociacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const requisicaoPainel = isAdmin
      ? api.get('/relatorios/dashboard-associacao').catch(() => ({ data: null }))
      : Promise.resolve({ data: null });

    Promise.all([
      api.get('/relatorios/resumo'),
      podeConsultarRegioes ? api.get('/relatorios/por-regiao') : Promise.resolve({ data: [] }),
      requisicaoPainel,
    ]).then(([r, pr, painel]) => {
      setResumo(r.data);
      setPorRegiao(pr.data);
      setPainelAssociacao(painel.data);
    }).catch((err) => {
      setErro(err.response?.data?.erro || 'Não foi possível carregar os relatórios do seu escopo.');
    }).finally(() => setCarregando(false));
  }, [isAdmin, podeConsultarRegioes]);

  const totalDuplasRegioes = useMemo(
    () => porRegiao.reduce((acc, regiao) => acc + Number(regiao.totalDuplas || 0), 0),
    [porRegiao],
  );

  const ministerio = painelAssociacao?.ministerioPessoal;
  const duplasMissionarias = painelAssociacao?.duplasMissionarias;
  const operacional = duplasMissionarias?.resumoOperacional;
  const cobertura = duplasMissionarias?.cobertura;

  const indicadoresAtividade = ministerio ? [
    { label: 'Estudos em andamento', valor: ministerio.quantidadeEstudos, cor: '#0284c7', tooltip: 'Total de fichas de estudo em andamento, somando estudos individuais, pontos de estudo e classes bíblicas.' },
    { label: 'Estudos encerrados', valor: operacional?.estudosEncerrados, cor: '#dc2626', tooltip: 'Total de fichas marcadas como encerradas, independentemente do motivo do encerramento.' },
    { label: 'Pessoas estudando', valor: ministerio.quantidadePessoasEstudando, cor: '#7c3aed', tooltip: 'Uma pessoa por estudo individual, mais os participantes cadastrados em pontos e classes bíblicas.' },
    { label: 'Estudos individuais', valor: ministerio.quantidadeEstudosIndividuais, cor: '#1A3A6B', tooltip: 'Fichas individuais de estudo bíblico que permanecem em andamento.' },
    { label: 'Pontos de estudo', valor: ministerio.quantidadePontosEstudos, cor: '#0d9488', tooltip: 'Pontos de estudo com ficha em andamento no banco de dados.' },
    { label: 'Classes bíblicas', valor: ministerio.quantidadeClasses, cor: '#ea580c', tooltip: 'Classes bíblicas com ficha em andamento no banco de dados.' },
    { label: 'Batismos de duplas', valor: operacional?.batismosConfirmados, cor: '#16a34a', tooltip: 'Pessoas vinculadas a estudos encerrados com o motivo Batismo.' },
    { label: 'Duplas com visitação', valor: operacional?.duplasComVisitacao, cor: '#C9963A', tooltip: 'Duplas que possuem ao menos um acompanhamento ou visita registrado.' },
  ] : [];

  if (carregando) return <LoadingState mensagem="Carregando relatórios..." />;
  if (erro) return <div className="m-6 rounded-xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">{erro}</div>;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="mb-8 animate-fade-in-down">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C9963A] sm:text-sm">{isAdmin ? 'Administração' : funcaoUsuario(usuario)}</p>
        </div>
        <h1 className="text-2xl font-bold text-[#1A3A6B] sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
          {isAdmin ? 'Relatório Geral' : `Relatórios — ${nomeEscopo}`}
        </h1>
        <p className="mt-1 text-xs text-gray-400 sm:text-sm">
          {isAdmin ? 'Visão consolidada das duplas, estudos e resultados missionários da Associação Paulistana' : `${nomePessoaUsuario(usuario)} • informações limitadas ao seu nível de acesso`}
        </p>
      </div>

      {resumo && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 stagger-children">
          {[
            { label: 'Total de Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B', icon: '✝️', gradient: 'from-[#1A3A6B] to-[#2a5298]', tooltip: 'Total de duplas missionárias cadastradas no escopo do relatório.' },
            { label: 'Duplas Ativas', valor: resumo.totalAtivas, cor: '#16a34a', icon: '✅', gradient: 'from-[#16a34a] to-[#22c55e]', tooltip: 'Duplas cujo cadastro está com o status ATIVA.' },
            { label: 'Duplas Pendentes', valor: resumo.totalPendentes, cor: '#C9963A', icon: '⏳', gradient: 'from-[#C9963A] to-[#e5b05a]', tooltip: 'Duplas que aguardam validação ou regularização do cadastro.' },
            { label: 'Duplas Inativas', valor: resumo.totalInativas, cor: '#9ca3af', icon: '⏸️', gradient: 'from-gray-400 to-gray-500', tooltip: 'Duplas cujo cadastro está com o status INATIVA.' },
            { label: 'Meta de Pessoas Alcançadas', valor: resumo.totalPessoasAlcancadas, cor: '#7B2D8B', icon: '🎯', gradient: 'from-[#7B2D8B] to-[#9333ea]', tooltip: 'Soma da meta de pessoas alcançadas informada no cadastro de cada dupla. Não é a quantidade de estudantes cadastrados.' },
          ].map((item) => (
            <div key={item.label} className="smart-tooltip card group cursor-help p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50/30 focus-visible:ring-2 focus-visible:ring-[#2563eb] sm:p-6" data-tooltip={item.tooltip} tabIndex={0} style={{ borderTop: `3px solid ${item.cor}` }}>
              <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-xl shadow-md transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12 sm:text-2xl`}>{item.icon}</div>
              <p className="text-2xl font-bold sm:text-3xl" style={{ color: item.cor }}>{numero(item.valor)}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {resumo?.classesBiblicas && (
        <SecaoProgressiva className="card mb-6 animate-fade-in-up">
          <TituloSecao icone="CB" titulo="Classes bíblicas por faixa de tamanho" descricao="Classificação baseada na quantidade de estudantes cadastrados em cada classe." cor="from-[#0d9488] to-[#14b8a6]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['A', '150 ou mais estudantes'],
              ['B', '67 a 149 estudantes'],
              ['C', '28 a 66 estudantes'],
            ].map(([classe, faixa]) => (
              <div key={classe} className="rounded-xl border border-gray-100 bg-[#F4F5F7] p-4 transition hover:border-teal-200 hover:bg-teal-50/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Ajuda texto={`Faixa ${classe}: classes bíblicas com ${faixa.toLowerCase()}. O número exibido é a soma dos estudantes dessas classes.`} className="font-bold text-[#1A3A6B]">Faixa {classe}</Ajuda>
                  <span className="text-xl font-bold text-[#C9963A]">{numero(resumo.classesBiblicas[classe]?.total)}</span>
                </div>
                <p className="mb-3 text-xs font-medium text-slate-400">{faixa}</p>
                <div className="space-y-2">
                  {(resumo.classesBiblicas[classe]?.igrejas || []).slice(0, 8).map((igreja) => (
                    <div key={igreja.id || igreja.nome} className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-gray-600">{igreja.nome}</span><span className="font-bold text-[#1A3A6B]">{numero(igreja.total)}</span></div>
                  ))}
                  {(resumo.classesBiblicas[classe]?.igrejas || []).length === 0 && <p className="text-sm text-gray-400">Nenhuma classe nesta faixa.</p>}
                </div>
              </div>
            ))}
          </div>
        </SecaoProgressiva>
      )}

      {podeConsultarRegioes ? (
        <SecaoProgressiva className="card mb-6 animate-fade-in-up" altura="min-h-96">
          <TituloSecao icone="📊" titulo="Distribuição por região" descricao="Leitura comparativa das duplas, atividades resumidas e metas informadas em cada região." />
          <div className="-mx-2 overflow-x-auto">
            <table className="min-w-[1120px] w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#F4F5F7] to-[#F4F5F7]/80">
                  <th className="rounded-l-lg px-4 py-3.5 text-left font-semibold text-gray-500">Região</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-gray-500">Distritos</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-gray-500">Duplas</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-gray-500">Ativas</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-gray-500"><Ajuda texto="Duplas que informaram estudo bíblico ativo no cadastro resumido.">Estudos informados</Ajuda></th>
                  <th className="px-4 py-3.5 text-center font-semibold text-gray-500"><Ajuda texto="Duplas que informaram classe bíblica ativa no cadastro resumido.">Classes informadas</Ajuda></th>
                  <th className="px-4 py-3.5 text-center font-semibold text-gray-500"><Ajuda texto="Soma da meta de pessoas alcançadas informada pelas duplas da região.">Meta de pessoas</Ajuda></th>
                  <th className="rounded-r-lg px-4 py-3.5 text-left font-semibold text-gray-500"><Ajuda texto="Percentual das duplas desta região em relação ao total de duplas das regiões exibidas.">Participação das duplas</Ajuda></th>
                </tr>
              </thead>
              <tbody>
                {porRegiao.map((regiao) => {
                  const percentual = totalDuplasRegioes > 0 ? (regiao.totalDuplas / totalDuplasRegioes) * 100 : 0;
                  return (
                    <tr key={regiao.id} className="border-b border-gray-50 outline-none transition-colors hover:bg-blue-50/60 active:bg-blue-100/70 focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300" tabIndex={0}>
                      <td className="px-4 py-4"><div className="flex items-center gap-2.5"><div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: regiao.cor }} /><span className="font-medium text-[#1A3A6B]">{regiao.nome}</span></div></td>
                      <td className="px-4 py-4 text-center font-medium text-gray-600">{numero(regiao.totalDistritos)}</td>
                      <td className="px-4 py-4 text-center font-bold text-[#1A3A6B]">{numero(regiao.totalDuplas)}</td>
                      <td className="px-4 py-4 text-center font-semibold text-emerald-700">{numero(regiao.ativas)}</td>
                      <td className="px-4 py-4 text-center font-semibold text-sky-700">{numero(regiao.estudosAtivos)}</td>
                      <td className="px-4 py-4 text-center font-semibold text-violet-700">{numero(regiao.evangelismosAtivos)}</td>
                      <td className="px-4 py-4 text-center font-semibold text-[#C9963A]">{numero(regiao.totalPessoas)}</td>
                      <td className="px-4 py-4"><div className="flex items-center gap-2"><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${percentual}%`, background: `linear-gradient(90deg, ${regiao.cor}, ${regiao.cor}cc)` }} /></div><span className="w-10 text-right text-xs font-medium text-gray-500">{percentual.toFixed(1)}%</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <Ajuda texto="É a soma do campo Pessoas Alcançadas preenchido no cadastro das duplas. Nesta tela o campo é tratado como meta e não como pessoas identificadas individualmente.">Como é calculada a meta de pessoas?</Ajuda>
            <Ajuda texto="Estudos e classes informados vêm dos indicadores resumidos das duplas. As fichas individuais aparecem na seção Atividade dos estudos.">De onde vêm estudos e classes?</Ajuda>
            <Ajuda texto="Número de duplas da região dividido pelo total de duplas das regiões exibidas. A soma das participações é 100%.">Como é calculada a participação?</Ajuda>
          </div>
        </SecaoProgressiva>
      ) : (
        <SecaoProgressiva className="card mb-6 animate-fade-in-up">
          <TituloSecao icone="📊" titulo={nomeEscopo} descricao="Resumo dos indicadores disponíveis no seu nível de acesso." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Duplas', resumo?.totalDuplas, 'Duplas cadastradas no seu escopo.'],
              ['Ativas', resumo?.totalAtivas, 'Duplas com cadastro ativo.'],
              ['Experiência de Batismo', resumo?.totalBatismos, 'Histórico de experiência de batismo informado pelas duplas.'],
              ['Meta de Pessoas Alcançadas', resumo?.totalPessoasAlcancadas, 'Soma das metas informadas pelas duplas.'],
            ].map(([label, valor, tooltip]) => (
              <div key={label} className="smart-tooltip rounded-lg border border-gray-100 bg-[#F8FAFC] p-4 text-center transition hover:bg-blue-50" data-tooltip={tooltip} tabIndex={0}><p className="text-2xl font-bold text-[#1A3A6B]">{numero(valor)}</p><p className="mt-1 text-xs font-medium text-gray-500">{label}</p></div>
            ))}
          </div>
        </SecaoProgressiva>
      )}

      {indicadoresAtividade.length > 0 && (
        <SecaoProgressiva className="card mb-6" altura="min-h-96">
          <TituloSecao icone="EB" titulo="Atividade dos estudos e das duplas" descricao="Indicadores calculados a partir das fichas de estudos, participantes e acompanhamentos." cor="from-[#0284c7] to-[#38bdf8]" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {indicadoresAtividade.map((item) => (
              <div key={item.label} className="smart-tooltip cursor-help rounded-xl border border-slate-100 bg-slate-50/70 p-4 outline-none transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-300" data-tooltip={item.tooltip} tabIndex={0}><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: item.cor }}>{numero(item.valor)}</p></div>
            ))}
          </div>
        </SecaoProgressiva>
      )}

      {cobertura && (
        <SecaoProgressiva className="card mb-6">
          <TituloSecao icone="◉" titulo="Cobertura atual das duplas" descricao="Quantas duplas possuem ao menos uma ficha ativa em cada frente de estudo." cor="from-[#0d9488] to-[#2dd4bf]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['Estudo bíblico individual', cobertura.estudoBiblico, '#0284c7'],
              ['Ponto de estudo', cobertura.pontoEstudo, '#0d9488'],
              ['Classe bíblica', cobertura.classeBiblica, '#7B2D8B'],
            ].map(([label, item, cor]) => {
              const total = Number(item?.com || 0) + Number(item?.sem || 0);
              const percentual = total > 0 ? (Number(item?.com || 0) / total) * 100 : 0;
              return (
                <div key={label} className="rounded-xl border border-slate-100 p-4 transition hover:border-teal-200 hover:bg-teal-50/30">
                  <div className="flex items-start justify-between gap-3"><p className="font-bold text-[#1A3A6B]">{label}</p><strong style={{ color: cor }}>{percentual.toFixed(1)}%</strong></div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${percentual}%`, backgroundColor: cor }} /></div>
                  <div className="mt-3 flex justify-between text-xs text-slate-500"><span><strong className="text-slate-700">{numero(item?.com)}</strong> com ficha</span><span><strong className="text-slate-700">{numero(item?.sem)}</strong> sem ficha</span></div>
                </div>
              );
            })}
          </div>
        </SecaoProgressiva>
      )}

      {duplasMissionarias?.porDistrito?.length > 0 && (
        <SecaoProgressiva className="card mb-6" altura="min-h-96">
          <TituloSecao icone="🏙" titulo="Distritos com maior número de duplas" descricao="Comparação dos oito maiores distritos e seus indicadores missionários." cor="from-[#C9963A] to-[#e5b05a]" />
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="rounded-l-lg px-4 py-3 text-left">Distrito</th><th className="px-4 py-3 text-center">Duplas</th><th className="px-4 py-3 text-center">Estudos ativos</th><th className="px-4 py-3 text-center">Visitações</th><th className="px-4 py-3 text-center"><Ajuda texto="Histórico informado no cadastro das duplas; não representa necessariamente estudos encerrados com batismo.">Experiência de batismo</Ajuda></th><th className="rounded-r-lg px-4 py-3 text-center"><Ajuda texto="Soma das metas de pessoas alcançadas informadas pelas duplas do distrito.">Meta de pessoas</Ajuda></th></tr></thead>
              <tbody>
                {duplasMissionarias.porDistrito.map((distrito) => (
                  <tr key={distrito.id} className="border-b border-slate-100 transition hover:bg-blue-50/60 active:bg-blue-100"><td className="px-4 py-3 font-semibold text-[#1A3A6B]">{distrito.nome}</td><td className="px-4 py-3 text-center font-bold">{numero(distrito.duplas)}</td><td className="px-4 py-3 text-center text-sky-700">{numero(distrito.estudos)}</td><td className="px-4 py-3 text-center text-violet-700">{numero(distrito.visitas)}</td><td className="px-4 py-3 text-center text-amber-700">{numero(distrito.batismos)}</td><td className="px-4 py-3 text-center text-orange-700">{numero(distrito.pessoasAlcancadas)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </SecaoProgressiva>
      )}

      {duplasMissionarias && (
        <SecaoProgressiva className="card mb-6" altura="min-h-[32rem]">
          <TituloSecao icone="★" titulo="Destaques das duplas" descricao="Rankings separados por indicador para evitar misturar métricas diferentes." cor="from-[#7B2D8B] to-[#a855f7]" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ListaDestaque titulo="Mais estudos ativos" descricao="Quantidade de fichas de estudo em andamento por dupla." itens={duplasMissionarias.topEstudos} campo="estudos" cor="#0284c7" />
            <ListaDestaque titulo="Mais visitações" descricao="Quantidade de acompanhamentos e visitações registrados por dupla." itens={duplasMissionarias.topVisitas} campo="visitas" cor="#7c3aed" />
            <ListaDestaque titulo="Maior experiência de batismo" descricao="Histórico de experiência informado no cadastro da dupla; não é o total de estudos encerrados com batismo." itens={duplasMissionarias.topBatismos} campo="batismos" cor="#C9963A" />
            <ListaDestaque titulo="Maior meta de pessoas alcançadas" descricao="Valor da meta de pessoas alcançadas informado pela dupla." itens={duplasMissionarias.topPessoasAlcancadas} campo="pessoasAlcancadas" cor="#ea580c" />
          </div>
        </SecaoProgressiva>
      )}

      {resumo?.porProjeto?.length > 0 && (
        <SecaoProgressiva className="card animate-fade-in-up">
          <TituloSecao icone="📋" titulo="Duplas por tipo de projeto" descricao="Projeto principal selecionado no cadastro de cada dupla." cor="from-[#C9963A] to-[#e5b05a]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {resumo.porProjeto.map((projeto) => {
              const total = resumo.totalDuplas || 1;
              const percentual = (projeto._count.tipoProjeto / total) * 100;
              return (
                <div key={projeto.tipoProjeto} className="smart-tooltip group rounded-xl border border-gray-100 bg-gradient-to-br from-[#F4F5F7] to-[#F4F5F7]/50 p-4 transition-all duration-300 hover:border-[#1A3A6B]/20 hover:bg-blue-50 hover:shadow-md" data-tooltip={`${projetoLabel[projeto.tipoProjeto]}: ${numero(projeto._count.tipoProjeto)} dupla(s), equivalente a ${percentual.toFixed(1)}% do total.`} tabIndex={0}>
                  <div className="mb-3 flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="text-lg">{projetoIcon[projeto.tipoProjeto]}</span><p className="text-sm font-medium text-gray-700">{projetoLabel[projeto.tipoProjeto]}</p></div><span className="text-lg font-bold text-[#1A3A6B]">{numero(projeto._count.tipoProjeto)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200/70"><div className="h-full rounded-full bg-gradient-to-r from-[#C9963A] to-[#e5b05a]" style={{ width: `${percentual}%` }} /></div>
                  <p className="mt-1.5 text-xs font-medium text-gray-400">{percentual.toFixed(1)}% do total</p>
                </div>
              );
            })}
          </div>
        </SecaoProgressiva>
      )}
    </div>
  );
}
