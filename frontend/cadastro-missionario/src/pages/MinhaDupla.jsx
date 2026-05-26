import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

// Painel exclusivo para o perfil DUPLA_MISSIONARIA
// A dupla só vê os dados da sua própria dupla e os atalhos para preencher relatórios
export default function MinhaDupla() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [dupla, setDupla] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!usuario?.duplaId) {
      setErro('Nenhuma dupla vinculada a este usuário. Contate o administrador.');
      setCarregando(false);
      return;
    }

    api.get(`/duplas/${usuario.duplaId}`)
      .then((res) => {
        setDupla(res.data);
        setCarregando(false);
      })
      .catch((err) => {
        setErro(err.response?.data?.erro || 'Erro ao carregar dados da dupla.');
        setCarregando(false);
      });
  }, [usuario]);

  // Detecta o prefixo de rota baseado no layout atual
  const prefix = localStorage.getItem('layout') === 'direto' ? '/direto' : '';

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando sua dupla...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <span className="text-4xl">⚠️</span>
          <p className="mt-3 text-red-700 font-medium">{erro}</p>
        </div>
      </div>
    );
  }

  const statusColor = {
    ATIVA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDENTE: 'bg-amber-100 text-amber-700 border-amber-200',
    INATIVA: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const classificacaoLabel = {
    A: { label: 'Classe A', desc: 'Já levou alguém ao batismo', cor: 'text-emerald-600' },
    B: { label: 'Classe B', desc: 'Já deu estudo bíblico', cor: 'text-blue-600' },
    C: { label: 'Classe C', desc: 'Ainda não deu estudo bíblico', cor: 'text-amber-600' },
  };

  const atalhos = [
    {
      icon: '📖',
      titulo: 'Estudo Bíblico',
      descricao: 'Cadastrar novo estudo bíblico individual',
      rota: `${prefix}/cadastro/estudos-biblicos`,
    },
    {
      icon: '👥',
      titulo: 'Ponto de Estudo',
      descricao: 'Registrar ponto de estudo em grupo',
      rota: `${prefix}/cadastro/ponto-estudo`,
    },
    {
      icon: '🏫',
      titulo: 'Classe Bíblica',
      descricao: 'Cadastrar participantes de classe bíblica',
      rota: `${prefix}/cadastro/classe-biblica`,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Cabeçalho — Identificação da Dupla */}
      <div className="bg-gradient-to-br from-[#1A3A6B] to-[#0d2347] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-blue-200 font-medium uppercase tracking-wider mb-1">
              ✝️ Minha Dupla Missionária
            </p>
            <h1 className="text-2xl font-bold">{dupla.liderNome}</h1>
            <p className="text-blue-200 mt-1">& {dupla.membro2Nome}</p>
          </div>
          {dupla.status && (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColor[dupla.status]}`}>
              {dupla.status}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-300 text-xs uppercase">Região</p>
            <p className="font-medium">{dupla.regiaoNome || '—'}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs uppercase">Bairro</p>
            <p className="font-medium">{dupla.bairro || '—'}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs uppercase">Projeto</p>
            <p className="font-medium">{dupla.tipoProjeto?.replace(/_/g, ' ') || '—'}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs uppercase">Pessoas Alcançadas</p>
            <p className="font-medium text-[#C9963A]">{dupla.pessoasAlcancadas ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Classificação Missionária */}
      {dupla.classificacaoDupla && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Classificação Missionária
          </h2>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${classificacaoLabel[dupla.classificacaoDupla]?.cor}`}>
              {classificacaoLabel[dupla.classificacaoDupla]?.label}
            </span>
            <span className="text-gray-500 text-sm">
              — {classificacaoLabel[dupla.classificacaoDupla]?.desc}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Atividade atual:{' '}
            <span className={dupla.atividadeDupla === 'ATIVA' ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
              {dupla.atividadeDupla === 'ATIVA' ? '✅ Com estudo em andamento' : '⏸ Sem estudo em andamento'}
            </span>
          </div>
        </div>
      )}

      {/* Atalhos para Relatórios */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          📋 Preencher Relatórios
        </h2>
        <div className="grid gap-3">
          {atalhos.map((atalho) => (
            <button
              key={atalho.rota}
              onClick={() => navigate(atalho.rota)}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 
                         hover:border-[#1A3A6B] hover:shadow-md transition-all text-left group"
            >
              <span className="text-2xl">{atalho.icon}</span>
              <div>
                <p className="font-semibold text-[#1A3A6B] group-hover:text-[#C9963A] transition-colors">
                  {atalho.titulo}
                </p>
                <p className="text-sm text-gray-500">{atalho.descricao}</p>
              </div>
              <span className="ml-auto text-gray-300 group-hover:text-[#C9963A] transition-colors text-xl">›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ver detalhes completos da dupla */}
      <button
        onClick={() => navigate(`${prefix}/duplas/${dupla.id}`)}
        className="w-full bg-[#1A3A6B] text-white rounded-xl py-3 font-semibold hover:bg-[#0d2347] 
                   transition-colors shadow-sm"
      >
        Ver Ficha Completa da Minha Dupla
      </button>
    </div>
  );
}
