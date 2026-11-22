import React, { useState } from 'react';
import { AgendamentoRecorrenteConfig, Paciente, TipoTerapia, ModalidadeCobranca, ConfiguracaoPrecos } from '../types';
import { DIAS_SEMANA_EXTENSO, getNomeDiaSemana } from '../utils/recurrenceUtils';
import { TIPOS_TERAPIA_CONFIG } from '../data/therapyData';
import { Repeat, Plus, Trash2, X, Check, Clock, User, DollarSign, Calendar, Power } from 'lucide-react';

interface RecurringSchedulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  recorrencias: AgendamentoRecorrenteConfig[];
  pacientes: Paciente[];
  configPrecos: ConfiguracaoPrecos;
  onSalvarRecorrencia: (recorrencia: AgendamentoRecorrenteConfig) => void;
  onExcluirRecorrencia: (id: string) => void;
  onToggleAtivo: (id: string) => void;
  onAbrirPuxarParaMes: () => void;
}

export const RecurringSchedulesModal: React.FC<RecurringSchedulesModalProps> = ({
  isOpen,
  onClose,
  recorrencias,
  pacientes,
  configPrecos,
  onSalvarRecorrencia,
  onExcluirRecorrencia,
  onToggleAtivo,
  onAbrirPuxarParaMes,
}) => {
  const [isAdicionando, setIsAdicionando] = useState(false);
  const [pacienteId, setPacienteId] = useState('');
  const [diaSemana, setDiaSemana] = useState(2); // Terça-feira default
  const [horario, setHorario] = useState('14:00');
  const [duracaoMinutos, setDuracaoMinutos] = useState(60);
  const [tipoTerapia, setTipoTerapia] = useState<TipoTerapia>('psicoterapia_individual');
  const [modalidadeCobranca, setModalidadeCobranca] = useState<ModalidadeCobranca>('pacote');
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) {
      setErro('Selecione um paciente cadastrado.');
      return;
    }

    // Verifica se já existe recorrência para o mesmo paciente no mesmo dia e horário
    const jaExiste = recorrencias.some(
      (r) => r.pacienteId === pacienteId && r.diaSemana === diaSemana && r.horario === horario
    );
    if (jaExiste) {
      setErro('Este paciente já possui atendimento recorrente cadastrado neste mesmo dia e horário.');
      return;
    }

    const valorSessao = modalidadeCobranca === 'pacote'
      ? Math.round(configPrecos.precoPacote / configPrecos.sessoesPorPacote)
      : configPrecos.precoAvulso;

    const novaRecorrencia: AgendamentoRecorrenteConfig = {
      id: `rec_${Date.now()}`,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      pacienteTelefone: paciente.telefone,
      diaSemana,
      horario,
      duracaoMinutos: Number(duracaoMinutos),
      tipoTerapia,
      modalidadeCobranca,
      zonasTratadas: ['ansiedade_panico'],
      valor: valorSessao,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    onSalvarRecorrencia(novaRecorrencia);
    setIsAdicionando(false);
    setPacienteId('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-teal-400 font-bold block">
                Gestão de Horários Fixos
              </span>
              <h2 className="text-base font-bold text-white">
                Pacientes com Agenda Recorrente Semanal
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

        {/* Action bar */}
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3">
          <p className="text-xs text-stone-600">
            {recorrencias.length} paciente(s) com atendimento semanal fixo.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAbrirPuxarParaMes();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Puxar para este Mês</span>
            </button>
            {!isAdicionando && (
              <button
                type="button"
                onClick={() => setIsAdicionando(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Horário Fixo</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Formulário de adicionar nova recorrência */}
          {isAdicionando && (
            <form
              onSubmit={handleSalvarNovo}
              className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-teal-100">
                <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                  Novo Atendimento Recorrente Semanal
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdicionando(false)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-medium"
                >
                  Cancelar
                </button>
              </div>

              {erro && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {erro}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Paciente *
                  </label>
                  <select
                    required
                    value={pacienteId}
                    onChange={(e) => setPacienteId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Selecione um paciente...</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Dia da Semana *
                  </label>
                  <select
                    value={diaSemana}
                    onChange={(e) => setDiaSemana(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    {DIAS_SEMANA_EXTENSO.map((nome, idx) => (
                      <option key={idx} value={idx}>
                        Toda {nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Horário de Atendimento *
                  </label>
                  <input
                    type="time"
                    required
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Modalidade de Cobrança
                  </label>
                  <select
                    value={modalidadeCobranca}
                    onChange={(e) => setModalidadeCobranca(e.target.value as ModalidadeCobranca)}
                    className="w-full text-xs px-3 py-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pacote">Pacote Mensal (R$ 500 / 4 sessões)</option>
                    <option value="avulso">Sessão Avulsa (R$ 150)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdicionando(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                >
                  Salvar Horário Recorrente
                </button>
              </div>
            </form>
          )}

          {/* Lista de recorrências */}
          {recorrencias.length === 0 && !isAdicionando ? (
            <div className="text-center py-10 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
              <Repeat className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-700">
                Nenhum paciente recorrente cadastrado ainda.
              </p>
              <p className="text-[11px] text-stone-500 mt-1 max-w-sm mx-auto">
                Cadastre pacientes que têm atendimento semanal fixo (no mesmo dia e horário). Ao abrir a agenda de um novo mês, você poderá puxar todos os atendimentos com 1 clique!
              </p>
              <button
                type="button"
                onClick={() => setIsAdicionando(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-700 rounded-lg shadow-xs hover:bg-teal-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Primeiro Horário Fixo</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recorrencias.map((rec) => {
                const terapiaInfo = TIPOS_TERAPIA_CONFIG[rec.tipoTerapia] || {
                  nome: 'Psicoterapia',
                };
                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      rec.ativo
                        ? 'bg-white border-stone-200 hover:border-teal-300'
                        : 'bg-stone-50 border-stone-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          rec.ativo ? 'bg-teal-100 text-teal-800' : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        <Repeat className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {rec.pacienteNome}
                          </h4>
                          {!rec.ativo && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-200 text-stone-600">
                              Pausado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-600 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-stone-800">
                            Toda {getNomeDiaSemana(rec.diaSemana)} às {rec.horario}
                          </span>
                          <span>•</span>
                          <span>{rec.modalidadeCobranca === 'pacote' ? 'Pacote' : 'Avulso'}</span>
                          <span>•</span>
                          <span>{terapiaInfo.nome}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleAtivo(rec.id)}
                        title={rec.ativo ? 'Pausar recorrência' : 'Ativar recorrência'}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          rec.ativo
                            ? 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100'
                            : 'text-stone-500 bg-stone-100 border-stone-200 hover:bg-stone-200'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Deseja remover o horário fixo de ${rec.pacienteNome}?`)) {
                            onExcluirRecorrencia(rec.id);
                          }
                        }}
                        title="Excluir regra de recorrência"
                        className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-5 py-3 border-t border-stone-200 flex justify-between items-center text-xs">
          <span className="text-stone-500 text-[11px]">
            * A recorrência atua exclusivamente dentro do mês selecionado.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-stone-200 hover:bg-stone-300 text-stone-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
