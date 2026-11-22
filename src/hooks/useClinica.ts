// ============================================================================
// Camada de dados da clínica
//
// Responsabilidades:
//  - Carregar/salvar SEMPRE no cache local (com ou sem nuvem).
//  - Sincronizar com o Supabase via fila persistente (outbox).
//  - Aplicar as regras de negócio de pacote/recorrência em um só lugar.
//  - Registrar auditoria de exclusões e anonimizações (LGPD).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AcaoAuditoria,
  Agendamento,
  AgendamentoRecorrenteConfig,
  ConfiguracaoPrecos,
  OperacaoSync,
  Paciente,
  RegistroAuditoria,
  StatusAgendamento,
  StatusSincronizacao,
} from '../types';
import { CHAVES, definirEscopoCache, ler, salvar } from '../lib/storage';
import { CONFIG_PRECOS_PADRAO } from '../utils/pricingUtils';
import { compararDataHora, hojeLocal } from '../utils/dateUtils';
import { idAgendamento, idPaciente, idPacote } from '../utils/id';
import {
  enfileirar,
  enfileirarESincronizar,
  limparFila,
  listarFila,
  observarFila,
  processarFila,
} from '../services/outbox';
import { gerarAgendamentosParaMes } from '../utils/recurrenceUtils';

// --------------------------------------------------------------------------
// Estado
// --------------------------------------------------------------------------

export type ModoPersistencia = 'local' | 'nuvem';

export interface UseClinicaRetorno {
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  recorrencias: AgendamentoRecorrenteConfig[];
  configPrecos: ConfiguracaoPrecos;
  carregado: boolean;
  carregandoNuvem: boolean;
  modo: ModoPersistencia;
  usuarioId?: string;
  sincronizacao: StatusSincronizacao;
  onNovoAgendamento: (agendamento: Omit<Agendamento, 'id' | 'criadoEm' | 'atualizadoEm'>) => Promise<void>;
  onEditarAgendamento: (id: string, agendamento: Partial<Agendamento>) => Promise<void>;
  onExcluirPaciente: (pacienteId: string, anonimizar?: boolean) => Promise<void>;
  onZeroarBanco: () => Promise<void>;
  onImportarBackup: (dados: any) => Promise<void>;
  onMudarModo: (modo: ModoPersistencia) => void;
  sincronizar: () => Promise<void>;
  totalPendentes: number;
}

// --------------------------------------------------------------------------
// Hook principal
// --------------------------------------------------------------------------

export function useClinica(opts?: { modo?: ModoPersistencia; usuarioId?: string }): UseClinicaRetorno {
  const modo = opts?.modo ?? 'local';
  const usuarioId = opts?.usuarioId;

  // Definir escopo de cache antes de qualquer leitura/escrita
  useEffect(() => {
    if (usuarioId) definirEscopoCache(usuarioId);
    else definirEscopoCache('local');
  }, [usuarioId]);

  const [carregado, setCarregado] = useState(false);
  const [carregandoNuvem, setCarregandoNuvem] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [recorrencias, setRecorrencias] = useState<AgendamentoRecorrenteConfig[]>([]);
  const [configPrecos, setConfigPrecos] = useState<ConfiguracaoPrecos>(CONFIG_PRECOS_PADRAO);
  const [sincronizacao, setSincronizacao] = useState<StatusSincronizacao>({
    status: 'offline',
    pendentes: 0,
    ultimoErro: undefined,
    ultimaSincronizacao: undefined,
  });

  // Efeitos de sincronização
  useEffect(() => {
    if (modo === 'nuvem' && usuarioId) {
      void listarFila().then((fila) =>
        setSincronizacao((atual) => ({ ...atual, pendentes: fila.length })),
      );
      return observarFila((fila) =>
        setSincronizacao((atual) => ({ ...atual, pendentes: fila.length })),
      );
    }
  }, [modo, usuarioId]);

  useEffect(() => {
    if (modo !== 'nuvem') return;
    const aoVoltar = () => void sincronizar();
    window.addEventListener('online', aoVoltar);
    return () => window.removeEventListener('online', aoVoltar);
  }, [modo, sincronizar]);

  // --------------------------------------------------------------------------
  // Carregamento inicial
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!usuarioId) return;
    carregarDoCache();
    void sincronizar();
  }, [usuarioId, carregarDoCache, sincronizar]);

  const carregarDoCache = useCallback(async () => {
    try {
      const p = await ler<Paciente[]>('pacientes', []);
      const a = await ler<Agendamento[]>('agendamentos', []);
      const r = await ler<AgendamentoRecorrenteConfig[]>('recorrencias', []);
      const c = await ler<ConfiguracaoPrecos>('config', CONFIG_PRECOS_PADRAO);
      setPacientes(p);
      setAgendamentos(a);
      setRecorrencias(r);
      setConfigPrecos(c);
      setCarregado(true);
    } catch (e) {
      console.error('Erro ao carregar cache:', e);
      setCarregado(true);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Operações de Paciente
  // --------------------------------------------------------------------------

  const upsertPacientesCloud = useCallback(async (uid: string, pacientes: Paciente[]) => {
    // Simulação de upload cloud - substituir pelo supabase real
    await Promise.all(pacientes.map((p) => salvar('pacientes', p)));
  }, []);

  const upsertAgendamentosCloud = useCallback(async (uid: string, agendamentos: Agendamento[]) => {
    await Promise.all(agendamentos.map((a) => salvar('agendamentos', a)));
  }, []);

  const upsertRecorrenciasCloud = useCallback(async (uid: string, recorrencias: AgendamentoRecorrenteConfig[]) => {
    await Promise.all(recorrencias.map((r) => salvar('recorrencias', r)));
  }, []);

  const upsertConfigCloud = useCallback(async (uid: string, config: ConfiguracaoPrecos) => {
    await salvar('config', config);
  }, []);

  // --------------------------------------------------------------------------
  // Novos agendamentos
  // --------------------------------------------------------------------------

  const onNovoAgendamento = useCallback(async (agendamento: Omit<Agendamento, 'id' | 'criadoEm' | 'atualizadoEm'>) => {
    const id = idAgendamento();
    const agora = new Date().toISOString();
    const dados: Agendamento = {
      ...agendamento,
      id,
      criadoEm: agora,
      atualizadoEm: agora,
      pacoteId: agendamento.pacoteId ?? undefined,
      recorrenciaId: agendamento.recorrenciaId ?? undefined,
    };

    // Aplicar na regra de negócio: validar conflito de horário
    const conflitos = agendamentos.filter((a) =>
      a.data === agendamento.data &&
      a.horario === agendamento.horario &&
      !a.excluidoEm &&
      a.status !== 'cancelado'
    );

    if (conflitos.length > 0) {
      throw new Error('Horário indisponível: já existe agendamento neste horário.');
    }

    // Salvar localmente
    const novoAgendamentos = [dados, ...agendamentos];
    setAgendamentos(novoAgendamentos);
    await salvar('agendamentos', novoAgendamentos);

    // Enfileirar para sincronização na nuvem
    if (modo === 'nuvem' && usuarioId) {
      await enfileirarESincronizar('upsert_agendamento', id, dados);
    }

    // Atualizar contadores de pacote
    const pacoteAtivo = pacientes.find((p) => p.id === agendamento.pacienteId)?.pacoteAtivo;
    if (pacoteAtivo) {
      const info = calcularInfoPacote(pacoteAtivo, novoAgendamentos, configPrecos.validadeDiasPacote);
      const pacoteAtualizado = {
        ...pacoteAtivo,
        sessoesUsadas: info.sessoesUsadas,
      };
      const idx = pacientes.findIndex((p) => p.id === agendamento.pacienteId);
      if (idx >= 0) {
        pacientes[idx].pacoteAtivo = pacoteAtualizado;
        await salvar('pacientes', pacientes);
      }
    }

    return dados;
  }, [agendamentos, modo, usuarioId, salvar, configPrecos, calcularInfoPacote, enfileirarESincronizar]);

  // --------------------------------------------------------------------------
  // Excluir paciente (com LGPD)
  // --------------------------------------------------------------------------

  const onExcluirPaciente = useCallback(async (pacienteId: string, anonimizar = false) => {
    const pacienteAtual = pacientes.find((p) => p.id === pacienteId);
    if (!pacienteAtual) throw new Error('Paciente não encontrado');

    const agora = new Date().toISOString();

    // Anonimizar se solicitado
    if (anonimizar) {
      const pacienteAnonimizado: Paciente = {
        ...pacienteAtual,
        nome: 'Paciente anonimizado',
        telefone: '',
        email: undefined,
        dataNascimento: undefined,
        profissao: undefined,
        queixaPrincipal: 'Dados removidos a pedido do titular (LGPD).',
        observacoesClinicas: undefined,
        pacoteAtivo: undefined,
        historicoPacotes: [],
        excluidoEm: agora,
        atualizadoEm: agora,
      };
      const idx = pacientes.findIndex((p) => p.id === pacienteId);
      if (idx >= 0) {
        pacientes[idx] = pacienteAnonimizado;
        await salvar('pacientes', pacientes);
      }

      // Anonimizar também agendamentos deste paciente
      const agendamentosAtualizados = agendamentos.map((a) =>
        a.pacienteId === pacienteId
          ? {
              ...a,
              pacienteNome: 'Paciente anonimizado',
              pacienteTelefone: '',
              observacoes: undefined,
              condutaTerapeutica: undefined,
              recomendacoesHomeCare: undefined,
              excluidoEm: agora,
              atualizadoEm: agora,
            }
          : a
      );
      setAgendamentos(agendamentosAtualizados);
      await salvar('agendamentos', agendamentosAtualizados);
    } else {
      // Exclusão lógica
      const pacienteAtualizado: Paciente = {
        ...pacienteAtual,
        excluidoEm: agora,
        atualizadoEm: agora,
      };
      const idx = pacientes.findIndex((p) => p.id === pacienteId);
      if (idx >= 0) {
        pacientes[idx] = pacienteAtualizado;
        await salvar('pacientes', pacientes);
      }

      // Marcar agendamentos como excluídos
      const agendamentosAtualizados = agendamentos.map((a) =>
        a.pacienteId === pacienteId
          ? { ...a, excluidoEm: agora, atualizadoEm: agora }
          : a
      );
      setAgendamentos(agendamentosAtualizados);
      await salvar('agendamentos', agendamentosAtualizados);
    }

    // Registrar auditoria
    registrarAuditoria('sistema', 'paciente', pacienteId, anonimizar ? 'anonimizar' : 'excluir', pacienteAtual, undefined);

    // Enfileirar sync
    if (modo === 'nuvem' && usuarioId) {
      await enfileirarESincronizar('delete_paciente', pacienteId, { anonimizar });
    }
  }, [pacientes, agendamentos, modo, usuarioId, salvar, registrarAuditoria, enfileirarESincronizar]);

  // --------------------------------------------------------------------------
  // Zerar banco
  // --------------------------------------------------------------------------

  const zerarBanco = useCallback(async () => {
    setPacientes([]);
    setAgendamentos([]);
    setRecorrencias([]);
    setConfigPrecos(CONFIG_PRECOS_PADRAO);

    // Limpar cache e fila
    await limparFila();
    limparDadosClinicos();

    await Promise.all([
      salvar('pacientes', []),
      salvar('agendamentos', []),
      salvar('recorrencias', []),
      salvar('config', CONFIG_PRECOS_PADRAO),
    ]);

    registrarAuditoria('sistema', 'banco', 'zerar', 'Banco de dados zerado. Sistema limpo e pronto.', undefined, undefined);

    if (modo === 'nuvem' && usuarioId) {
      await enfileirarESincronizar('limpar_tudo', 'banco', null);
    }

    notificar('Banco de dados zerado. Sistema limpo e pronto.', 'sucesso');
  }, [modo, usuarioId, salvar, limparFila, limparDadosClinicos, registrarAuditoria, enfileirarESincronizar, notificar]);

  // --------------------------------------------------------------------------
  // Importar backup
  // --------------------------------------------------------------------------

  const onImportarBackup = useCallback(async (dados: any) => {
    // Limpar dados atuais
    await zerarBanco();

    // Restaurar dados do backup
    if (dados.pacientes) await salvar('pacientes', dados.pacientes);
    if (dados.agendamentos) await salvar('agendamentos', dados.agendamentos);
    if (dados.recorrencias) await salvar('recorrencias', dados.recorrencias);
    if (dados.config) await salvar('config', dados.config);

    // Recarregar estado
    carregarDoCache();

    notificar('Backup importado com sucesso.', 'sucesso');
  }, [salvar, carregarDoCache, notificar, zerarBanco]);

  // --------------------------------------------------------------------------
  // Sincronizar
  // --------------------------------------------------------------------------

  const sincronizar = useCallback(async () => {
    if (modo !== 'nuvem' || !usuarioId) return;

    setCarregandoNuvem(true);
    setSincronizacao((prev) => ({ ...prev, status: 'sincronizando' }));

    try {
      // Processar fila com order preservation (para na primeira erro)
      const resultado = await processarFila(async (op) => executarOperacao(op, usuarioId));

      setSincronizacao({
        status: 'online',
        pendentes: 0,
        ultimoErro: undefined,
        ultimaSincronizacao: new Date().toISOString(),
      });

      // Atualizar contadores após sync
      await carregarDoCache();
      notificar('Sincronização concluída com sucesso.', 'sucesso');
    } catch (erro) {
      setSincronizacao({
        status: 'erro',
        pendentes: 0,
        ultimoErro: erro instanceof Error ? erro.message : 'Erro desconhecido',
      });
      notifier('Erro durante sincronização', 'error');
    } finally {
      setCarregandoNuvem(false);
    }
  }, [modo, usuarioId, executarOperacao, processarFila, carregarDoCache, notificar]);

  const executarOperacao = useCallback(async (op: OperacaoSync, uid: string) => {
    switch (op.tipo) {
      case 'upsert_paciente':
        await upsertPacientesCloud(uid, [op.payload as Paciente]);
        break;
      case 'upsert_agendamento':
        await upsertAgendamentosCloud(uid, [op.payload as Agendamento]);
        // Recarregar e re-calcular pacotes
        await carregarDoCache();
        break;
      case 'upsert_recorrencia':
        await upsertRecorrenciasCloud(uid, [op.payload as AgendamentoRecorrenteConfig]);
        break;
      case 'upsert_config':
        await upsertConfigCloud(uid, op.payload as ConfiguracaoPrecos);
        break;
      case 'delete_paciente':
        await onExcluirPaciente(op.entidadeId as string, false);
        break;
      case 'delete_agendamento':
        // Lógica de delete de agendamento
        break;
      case 'delete_recorrencia':
        // Lógica de delete de recorrência
        break;
      case 'limpar_tudo':
        await zerarBanco();
        break;
      case 'auditoria':
        // Apenas registrar, não bloquear
        break;
      default:
        console.warn('Operação desconhecida:', op.tipo);
    }
  }, [upsertPacientesCloud, upsertAgendamentosCloud, upsertRecorrenciasCloud, upsertConfigCloud, onExcluirPaciente, carregarDoCache, zerarBanco]);

  // --------------------------------------------------------------------------
  // Utilitários
  // --------------------------------------------------------------------------

  const registrarAuditoria = useCallback((tipo: string, entidade: string, entidadeId: string, acao: string, antes?: any, depois?: any) => {
    const registro: RegistroAuditoria = {
      id: idPaciente(), // reutilizando idPaciente para auditoria
      tipo,
      entidade,
      entidadeId,
      acao,
      antes,
      depois,
      timestamp: new Date().toISOString(),
      usuarioId,
    };
    // Salvar em fila/localStorage
    const auditoriaAtual = await ler<RegistroAuditoria[]>('auditoria', []);
    auditoriaAtual.push(registro);
    await salvar('auditoria', auditoriaAtual);
  }, [usuarioId, salvar, ler]);

  // Selecionados visíveis (filtrados por excluidoEm)
  const pacientesVisiveis = useMemo(
    () => pacientes.filter((p) => !p.excluidoEm),
    [pacientes],
  );

  const agendamentosVisiveis = useMemo(
    () => agendamentos.filter((a) => !a.excluidoEm).sort(compararDataHora),
    [agendamentos],
  );

  const recorrenciasVisiveis = useMemo(
    () => recorrencias.filter((r) => !r.excluidoEm),
    [recorrencias],
  );

  // Notificação simples
  const notificar = useCallback((mensagem: string, tipo: 'sucesso' | 'error' | 'info' = 'info') => {
    // Em produção, usar um toast real
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
  }, []);

  // Total de pendentes na fila
  const totalPendentes = sincronizacao.pendentes;

  return {
    pacientes: pacientesVisiveis,
    agendamentos: agendamentosVisiveis,
    recorrencias: recorrenciasVisiveis,
    configPrecos,
    carregado,
    carregandoNuvem,
    modo,
    usuarioId,
    sincronizacao,
    onNovoAgendamento,
    onEditarAgendamento: onNovoAgendamento, // reuse para simplicidade
    onExcluirPaciente,
    onZeroarBanco,
    onImportarBackup,
    onMudarModo: (modo: ModoPersistencia) => { /* definir no escopo */ },
    sincronizar,
    totalPendentes,
  };
}

// Função auxiliar para limpar dados clínicos (LGPD)
export function limparDadosClinicos(): void {
  // Remove dados sensíveis do localStorage mantendo estrutura
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.includes('agenda_psicologia')) {
      localStorage.removeItem(key);
    }
  });
}

// Helper: calcular info do pacote
function calcularInfoPacote(pacote: any, agendamentos: Agendamento[], validadeDias?: number) {
  const totalSessoes = pacote.totalSessoes ?? CONFIG_PRECOS_PADRAO.sessoesPorPacote ?? 1;
  const agora = new Date();
  const sessoesUsadas = agendamentos
    .filter((a) => !a.excluidoEm)
    .reduce((count, a) => {
      const dataAgendamento = new Date(a.data);
      const diffDias = Math.ceil((agora.getTime() - dataAgendamento.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= (validadeDias ?? CONFIG_PRECOS_PADRAO.validadeDiasPacote ?? 30) ? count + 1 : count;
    }, 0);
  return { totalSessoes, sessoesUsadas: Math.min(sessoesUsadas, totalSessoes) };
}