import React, { useState, useMemo } from 'react';
import { Agendamento, AgendamentoRecorrenteConfig } from '../types';
import { getNomeDiaSemana, obterDatasDoDiaSemanaNoMes } from '../utils/recurrenceUtils';
import { TIPOS_TERAPIA_CONFIG } from '../data/therapyData';
import { Calendar, CheckCircle2, Clock, Repeat, User, X, CheckSquare, Square } from 'lucide-react';

interface RecurrencePullModalProps {
  isOpen: boolean;
  onClose: () => void;
  ano: number;
  mes: number; // 0 = Janeiro .. 11 = Dezembro
  recorrencias: AgendamentoRecorrenteConfig[];
  agendamentosExistentes: Agendamento[];
  onConfirmarPuxar: (selecionadosIds: string[]) => void;
  onNaoPuxar: () => void;
}

export const RecurrencePullModal: React.FC<RecurrencePullModalProps> = ({
  isOpen,
  onClose,
  ano,
  mes,
  recorrencias,
  agendamentosExistentes,
  onConfirmarPuxar,
  onNaoPuxar,
}) => {
  const nomeMesAno = useMemo(() => {
    const dataObj = new Date(ano, mes, 1);
    return dataObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [ano, mes]);

  // Apenas as regras ativas
  const recorrenciasAtivas = useMemo(() => {
    return recorrencias.filter((r) => r.ativo);
  }, [recorrencias]);

  // Estado de seleção (todos pré-selecionados por padrão)
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>(() => {
    const inicial: Record<string, boolean> = {};
    recorrenciasAtivas.forEach((r) => {
      inicial[r.id] = true;
    });
    return inicial;
  });

  // Atualiza quando as regras ativas mudam
  React.useEffect(() => {
    const inicial: Record<string, boolean> = {};
    recorrenciasAtivas.forEach((r) => {
      inicial[r.id] = true;
    });
    setSelecionados(inicial);
  }, [recorrenciasAtivas]);

  if (!isOpen || recorrenciasAtivas.length === 0) return null;

  const toggleItem = (id: string) => {
    setSelecionados((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selecionarTodos = () => {
    const todos: Record<string, boolean> = {};
    recorrenciasAtivas.forEach((r) => {
      todos[r.id] = true;
    });
    setSelecionados(todos);
  };

  const desmarcarTodos = () => {
    const nenhum: Record<string, boolean> = {};
    recorrenciasAtivas.forEach((r) => {
      nenhum[r.id] = false;
    });
    setSelecionados(nenhum);
  };

  const totalSelecionados = Object.values(selecionados).filter(Boolean).length;

  // Calcula quantas sessões serão geradas no total para os selecionados
  let totalSessoesNovas = 0;
  recorrenciasAtivas.forEach((r) => {
    if (selecionados[r.id]) {
      const datas = obterDatasDoDiaSemanaNoMes(ano, mes, r.diaSemana);
      // Filtra as que não existem ainda
      const faltantes = datas.filter(
        (d) =>
          !agendamentosExistentes.some(
            (a) => a.pacienteId === r.pacienteId && a.data === d && a.horario === r.horario && a.status !== 'cancelado'
          )
      );
      totalSessoesNovas += faltantes.length;
    }
  });

  const handleConfirmar = () => {
    const idsParaPuxar = Object.entries(selecionados)
      .filter(([_, checked]) => checked)
      .map(([id]) => id);
    onConfirmarPuxar(idsParaPuxar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-teal-400 font-bold block">
                Agenda Recorrente Mensal
              </span>
              <h2 className="text-base font-bold text-white capitalize">
                Abrir Agenda de {nomeMesAno}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-teal-950">
              <Calendar className="w-4 h-4 text-teal-700" />
              Deseja puxar os atendimentos recorrentes para este mês?
            </p>
            <p className="text-teal-800 leading-relaxed text-[11.5px]">
              Os pacientes abaixo possuem horários fixos semanais. Todas as sessões serão agendadas
              <strong> estritamente dentro do mês de {nomeMesAno}</strong>, respeitando os dias e horários cadastrados.
            </p>
          </div>

          {/* Seleção rápida */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-bold text-stone-700">
              Pacientes com Atendimento Recorrente ({totalSelecionados}/{recorrenciasAtivas.length})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selecionarTodos}
                className="text-teal-700 hover:underline font-semibold text-xs"
              >
                Selecionar todos
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={desmarcarTodos}
                className="text-stone-500 hover:underline text-xs"
              >
                Desmarcar todos
              </button>
            </div>
          </div>

          {/* Lista de pacientes recorrentes */}
          <div className="space-y-2.5">
            {recorrenciasAtivas.map((rec) => {
              const isMarcado = !!selecionados[rec.id];
              const nomeDia = getNomeDiaSemana(rec.diaSemana);
              const datasNoMes = obterDatasDoDiaSemanaNoMes(ano, mes, rec.diaSemana);
              const datasFormatadas = datasNoMes
                .map((d) => d.split('-')[2])
                .join(', ');

              const terapiaInfo = TIPOS_TERAPIA_CONFIG[rec.tipoTerapia] || {
                nome: 'Psicoterapia',
                badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
              };

              return (
                <div
                  key={rec.id}
                  onClick={() => toggleItem(rec.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isMarcado
                      ? 'bg-teal-50/40 border-teal-300 ring-1 ring-teal-500/30'
                      : 'bg-white border-stone-200 hover:border-stone-300 opacity-75'
                  }`}
                >
                  <div className="mt-0.5 text-teal-700 shrink-0">
                    {isMarcado ? (
                      <CheckSquare className="w-4 h-4 text-teal-700" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-stone-900 truncate">
                        {rec.pacienteNome}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${terapiaInfo.badgeClass}`}
                      >
                        {terapiaInfo.nome}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-stone-800">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        Toda {nomeDia} às {rec.horario}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        ({datasNoMes.length} sessões: dias {datasFormatadas})
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-stone-500">
                      <span className="capitalize font-medium text-stone-700">
                        {rec.modalidadeCobranca === 'pacote' ? '📦 Pacote Mensal' : '🪙 Sessão Avulsa'}
                      </span>
                      <span>•</span>
                      <span>R$ {rec.valor}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-stone-50 px-5 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onNaoPuxar}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition-colors text-center"
          >
            Não puxar agora (abrir em branco)
          </button>

          <button
            type="button"
            disabled={totalSelecionados === 0}
            onClick={handleConfirmar}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all ${
              totalSelecionados > 0
                ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Puxar {totalSessoesNovas} Atendimentos Recorrentes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
