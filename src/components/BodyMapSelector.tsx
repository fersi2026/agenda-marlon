import React, { useState } from 'react';
import { DEMANDAS_PSICOLOGICAS } from '../data/therapyData';
import { EixoDemandaPsicologica } from '../types';
import { 
  Check, 
  Brain, 
  HeartHandshake, 
  Briefcase, 
  Activity, 
  Search,
  Sparkles,
  Info
} from 'lucide-react';

interface BodyMapSelectorProps {
  selectedZones: string[];
  onChange: (zones: string[]) => void;
  readOnly?: boolean;
}

const EIXOS_CONFIG: Record<EixoDemandaPsicologica, {
  nome: string;
  rotuloCurto: string;
  icon: React.FC<{ className?: string }>;
  badgeClass: string;
  cor: string;
}> = {
  emocoes_humor: {
    nome: 'Emoções & Humor',
    rotuloCurto: 'Emocional',
    icon: Brain,
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    cor: 'teal'
  },
  relacionamentos: {
    nome: 'Relacionamentos & Família',
    rotuloCurto: 'Vínculos',
    icon: HeartHandshake,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    cor: 'rose'
  },
  cognicao_trabalho: {
    nome: 'Cognição, Carreira & Foco',
    rotuloCurto: 'Carreira/Foco',
    icon: Briefcase,
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    cor: 'blue'
  },
  comportamento_psicossomatica: {
    nome: 'Comportamento & Somática',
    rotuloCurto: 'Comportamento',
    icon: Activity,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    cor: 'amber'
  }
};

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  selectedZones = [],
  onChange,
  readOnly = false,
}) => {
  const [eixoFiltro, setEixoFiltro] = useState<EixoDemandaPsicologica | 'todos'>('todos');
  const [busca, setBusca] = useState('');

  const toggleDemanda = (id: string) => {
    if (readOnly) return;
    if (selectedZones.includes(id)) {
      onChange(selectedZones.filter((z) => z !== id));
    } else {
      onChange([...selectedZones, id]);
    }
  };

  const demandasFiltradas = DEMANDAS_PSICOLOGICAS.filter((d) => {
    if (eixoFiltro !== 'todos' && d.eixo !== eixoFiltro) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const matchNome = d.nome.toLowerCase().includes(q);
      const matchDesc = d.descricao?.toLowerCase().includes(q) || false;
      return matchNome || matchDesc;
    }
    return true;
  });

  return (
    <div id="clinical-focus-selector-container" className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-3">
      {/* Header & Status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-teal-700" />
            Demandas & Focos de Atendimento Psicológico
          </span>
          <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
            {selectedZones.length} selecionada(s)
          </span>
        </div>

        {/* Busca rápida */}
        {!readOnly && (
          <div className="relative text-xs w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar demandas..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}
      </div>

      {/* Tabs de Filtro por Eixo */}
      {!readOnly && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setEixoFiltro('todos')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              eixoFiltro === 'todos'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            Todas as Demandas
          </button>

          {(Object.keys(EIXOS_CONFIG) as EixoDemandaPsicologica[]).map((eixoKey) => {
            const conf = EIXOS_CONFIG[eixoKey];
            const Icon = conf.icon;
            const isAtivo = eixoFiltro === eixoKey;

            return (
              <button
                key={eixoKey}
                type="button"
                onClick={() => setEixoFiltro(eixoKey)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border ${
                  isAtivo
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{conf.rotuloCurto}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid Interativo de Demandas Clínicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
        {demandasFiltradas.length === 0 ? (
          <div className="col-span-full py-4 text-center text-xs text-stone-500">
            Nenhuma demanda encontrada com o filtro informado.
          </div>
        ) : (
          demandasFiltradas.map((demanda) => {
            const isSelected = selectedZones.includes(demanda.id);
            const eixoConf = EIXOS_CONFIG[demanda.eixo];
            const Icon = eixoConf.icon;

            return (
              <button
                key={demanda.id}
                type="button"
                disabled={readOnly}
                onClick={() => toggleDemanda(demanda.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-teal-50 border-teal-400 ring-1 ring-teal-400 shadow-xs'
                    : 'bg-white border-stone-200 hover:bg-stone-50/80 hover:border-stone-300'
                } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? 'bg-teal-700 text-white'
                      : 'bg-stone-100 text-stone-400 border border-stone-300'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <Icon className="w-3 h-3 text-stone-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold leading-tight truncate ${
                        isSelected ? 'text-teal-950' : 'text-stone-800'
                      }`}
                    >
                      {demanda.nome}
                    </span>
                  </div>
                  {demanda.descricao && (
                    <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                      {demanda.descricao}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Dica de Conduta */}
      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-stone-500">
        <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
        <span>
          Selecione os focos terapêuticos trabalhados nesta sessão para registrar na evolução clínica e prontuário do paciente.
        </span>
      </div>
    </div>
  );
};

export const ClinicalFocusSelector = BodyMapSelector;
