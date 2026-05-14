import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const projetoLabel = {
  CASA_A_CASA: 'Casa em Casa',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Evangelismo Público',
};
const membro2Label = { MEMBRO_IASD: 'Membro IASD' };

const StatusBadge = ({ status }) => {
  const map = { ATIVA: 'badge-ativa', PENDENTE: 'badge-pendente', INATIVA: 'badge-inativa' };
  const label = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
  return <span className={map[status]}>{label[status]}</span>;
};

const InfoRow = ({ label, valor }) => valor ? (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-gray-50 last:border-0">
    <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-40 flex-shrink-0">{label}</dt>
    <dd className="text-sm text-gray-800 font-medium">{valor}</dd>
  </div>
) : null;

export default function DadosDupla() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dupla, setDupla] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [confirmandoDelete, setConfirmandoDelete] = useState(false);

  useEffect(() => {
    api.get(`/duplas/${id}`)
      .then((r) => setDupla(r.data))
      .finally(() => setCarregando(false));
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/duplas/${id}`);
      navigate(-1);
    } catch {
      alert('Erro ao remover dupla.');
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!dupla) return <div className="p-6 text-red-500">Dupla não encontrada.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6 flex-wrap">
        <button onClick={() => navigate('/regioes')} className="hover:text-[#1A3A6B]">Regiões</button>
        <span>/</span>
        <button onClick={() => navigate(-1)} className="hover:text-[#1A3A6B]">Duplas</button>
        <span>/</span>
        <span className="text-[#1A3A6B] font-medium">Detalhes</span>
      </div>

      {/* Header */}
      <div className="card mb-4 sm:mb-6 relative overflow-hidden p-4 sm:p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1A3A6B] to-[#C9963A]" />
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pt-2">
          <div className="flex items-center gap-4">
            {/* Avatares sobrepostos */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-[#1A3A6B] flex items-center justify-center text-white font-bold text-xl shadow-md">
                {dupla.liderNome.charAt(0)}
              </div>
              <div className="w-10 h-10 rounded-full bg-[#C9963A] flex items-center justify-center text-white font-bold text-sm absolute -bottom-1 -right-2 border-2 border-white shadow">
                {dupla.membro2Nome.charAt(0)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {dupla.liderNome}
                </h1>
                <span className="text-gray-300">+</span>
                <h2 className="text-lg font-semibold text-gray-700">{dupla.membro2Nome}</h2>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={dupla.status} />
                <span className="text-xs text-gray-400">📍 {dupla.bairro}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/duplas/${id}/editar`)}
              className="btn-outline text-sm px-4 py-2"
            >
              Editar
            </button>
            {!confirmandoDelete ? (
              <button
                onClick={() => setConfirmandoDelete(true)}
                className="px-4 py-2 rounded-lg border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Remover
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleDelete} className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold">
                  Confirmar
                </button>
                <button onClick={() => setConfirmandoDelete(false)} className="px-3 py-2 rounded-lg border text-sm">
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pessoas alcançadas */}
        {dupla.pessoasAlcancadas > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-[#C9963A]/10 rounded-xl px-4 py-3">
            <span className="text-2xl">🙏</span>
            <div>
              <p className="text-[#C9963A] font-bold text-xl">{dupla.pessoasAlcancadas}</p>
              <p className="text-gray-500 text-xs">pessoas alcançadas</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Localização e projeto */}
        <div className="card">
          <h3 className="font-bold text-[#1A3A6B] mb-3 flex items-center gap-2">
            <span>📍</span> Localização & Projeto
          </h3>
          <dl>
            <InfoRow label="Região" valor={dupla.distrito?.regiao?.nome || dupla.regiaoNome} />
            <InfoRow label="Distrito" valor={dupla.distrito?.nome} />
            <InfoRow label="Igreja" valor={dupla.igreja?.nome} />
            <InfoRow label="Bairro" valor={dupla.bairro} />
            <InfoRow label="Projeto" valor={projetoLabel[dupla.tipoProjeto]} />
            <InfoRow label="Data de início" valor={new Date(dupla.dataInicio).toLocaleDateString('pt-BR')} />
          </dl>
        </div>

        {/* Líder */}
        <div className="card">
          <h3 className="font-bold text-[#1A3A6B] mb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#1A3A6B] flex items-center justify-center text-white text-xs font-bold">1</div>
            Líder (Membro 1)
          </h3>
          <dl>
            <InfoRow label="Nome" valor={dupla.liderNome} />
            <InfoRow label="Telefone" valor={dupla.liderTelefone} />
            <InfoRow label="E-mail" valor={dupla.liderEmail} />
            <InfoRow label="Igreja" valor={dupla.liderIgreja} />
          </dl>
        </div>

        {/* Segundo membro */}
        <div className="card">
          <h3 className="font-bold text-[#1A3A6B] mb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#C9963A] flex items-center justify-center text-white text-xs font-bold">2</div>
            Parceiro (Membro 2)
          </h3>
          <dl>
            <InfoRow label="Nome" valor={dupla.membro2Nome} />
            <InfoRow label="Tipo" valor={membro2Label[dupla.membro2Tipo]} />
            <InfoRow label="Telefone" valor={dupla.membro2Telefone} />
          </dl>
        </div>

        {/* Observações */}
        {dupla.observacoes && (
          <div className="card">
            <h3 className="font-bold text-[#1A3A6B] mb-3 flex items-center gap-2">
              <span>📝</span> Observações
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">{dupla.observacoes}</p>
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className="card mt-5">
        <h3 className="font-bold text-[#1A3A6B] mb-3 flex items-center gap-2">
          <span>🕐</span> Histórico
        </h3>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span>Cadastrado em: <strong>{new Date(dupla.criadoEm).toLocaleDateString('pt-BR')}</strong></span>
          <span>Atualizado em: <strong>{new Date(dupla.atualizadoEm).toLocaleDateString('pt-BR')}</strong></span>
        </div>
      </div>
    </div>
  );
}
