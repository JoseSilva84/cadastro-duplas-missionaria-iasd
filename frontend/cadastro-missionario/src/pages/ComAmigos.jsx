import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const StatusBadge = ({ status }) => {
  const map = { ATIVA: 'badge-ativa', PENDENTE: 'badge-pendente', INATIVA: 'badge-inativa' };
  const label = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
  return <span className={map[status]}>{label[status]}</span>;
};

export default function ComAmigos() {
  const navigate = useNavigate();
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/duplas', { params: { comAmigos: 'true' } })
      .then((r) => setDuplas(r.data))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-purple-500 text-sm font-semibold uppercase tracking-wider">Missão</p>
          <h1 className="text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Duplas com Amigos
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Duplas que incluem convidados externos ou interessados
          </p>
        </div>
        <button
          onClick={() => navigate('/duplas/nova', { state: { comAmigos: true } })}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Dupla com Amigos
        </button>
      </div>

      {/* Banner explicativo */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">🤝</span>
        <div>
          <p className="font-semibold text-purple-800">O que são Duplas com Amigos?</p>
          <p className="text-purple-600 text-sm mt-1">
            São duplas missionárias onde o segundo membro é um convidado externo, amigo ou pessoa interessada
            na mensagem adventista — não necessariamente membro da IASD.
            Estas duplas recebem atenção especial no acompanhamento pastoral.
          </p>
        </div>
      </div>

      {/* Grid de duplas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {duplas.map((dupla) => (
          <button
            key={dupla.id}
            onClick={() => navigate(`/duplas/${dupla.id}`)}
            className="text-left card border-2 border-transparent hover:border-purple-200 group transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#1A3A6B] flex items-center justify-center text-white font-bold">
                  {dupla.liderNome.charAt(0)}
                </div>
                <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xs absolute -bottom-1 -right-1 border-2 border-white">
                  {dupla.membro2Nome.charAt(0)}
                </div>
              </div>
              <div>
                <p className="font-semibold text-[#1A3A6B] text-sm">{dupla.liderNome}</p>
                <p className="text-xs text-purple-600 font-medium">+ {dupla.membro2Nome}
                  <span className="text-gray-400 font-normal"> ({dupla.membro2Tipo === 'CONVIDADO' ? 'Convidado' : 'Interessado'})</span>
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={dupla.status} />
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">📍 {dupla.bairro}</p>
                <p className="text-xs text-gray-500 mt-0.5">🏛️ {dupla.distrito?.nome}</p>
              </div>
              {dupla.pessoasAlcancadas > 0 && (
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">{dupla.pessoasAlcancadas}</p>
                  <p className="text-xs text-gray-400">alcançadas</p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {duplas.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🤝</p>
          <p className="font-medium">Nenhuma dupla com amigos cadastrada.</p>
          <button
            onClick={() => navigate('/duplas/nova', { state: { comAmigos: true } })}
            className="btn-secondary mt-4 text-sm px-4 py-2"
          >
            Cadastrar primeira dupla
          </button>
        </div>
      )}
    </div>
  );
}
