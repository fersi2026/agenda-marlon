import React, { useState, useEffect } from 'react';
import { 
  Agendamento, 
  Paciente, 
  StatusAgendamento, 
  FiltrosAgenda,
  ConfiguracaoPrecos,
  AgendamentoRecorrenteConfig
} from './types';
import { 
  PACIENTES_INICIAIS, 
  AGENDAMENTOS_INICIAIS,
  PRECO_PACOTE
} from './data/therapyData';
import { carregarConfiguracaoPrecos, salvarConfiguracaoPrecos, STORAGE_KEY_PRECOS, CONFIG_PRECOS_PADRAO } from './utils/pricingUtils';
import { formatarMoeda, obterHojeString } from './utils/dateUtils';
import { 
  carregarRecorrencias, 
  salvarRecorrencias, 
  gerarAgendamentosParaMes,
  criarRecorrenciaConfig,
  obterDatasDoDiaSemanaNoMes,
  STORAGE_RECORRENCIAS
} from './utils/recurrenceUtils';
import { Header, AbaNavegacao } from './components/Header';
import { QuickStats } from './components/QuickStats';
import { AppointmentFilters } from './components/AppointmentFilters';
import { DailyTimelineView } from './components/DailyTimelineView';
import { WeeklyView } from './components/WeeklyView';
import { MonthlyView } from './components/MonthlyView';
import { PatientsView } from './components/PatientsView';
import { AppointmentModal } from './components/AppointmentModal';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { PricingConfigModal } from './components/PricingConfigModal';
import { NextDayRemindersAlert } from './components/NextDayRemindersAlert';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { DatabaseManagerModal } from './components/DatabaseManagerModal';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { SettingsView } from './components/SettingsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RecurrencePullModal } from './components/RecurrencePullModal';
import { RecurringSchedulesModal } from './components/RecurringSchedulesModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import { AuthGate } from './components/AuthGate';
import {
  clearAllCloudData,
  deleteAgendamentoCloud,
  deleteRecorrenciaCloud,
  fetchAllCloudData,
  upsertAgendamentosCloud,
  upsertConfigPrecosCloud,
  upsertPacientesCloud,
  upsertRecorrenciasCloud,
} from './services/supabaseStorage';

// Chaves de armazenamento persistente com banco de dados zerado por padrão
const STORAGE_PACIENTES = 'agenda_psicologia_apk_pacientes_v1';
const STORAGE_AGENDAMENTOS = 'agenda_psicologia_apk_agendamentos_v1';
const LEGACY_STORAGE_PACIENTES = 'agenda_miofascial_apk_pacientes_v1';
const LEGACY_STORAGE_AGENDAMENTOS = 'agenda_miofascial_apk_agendamentos_v1';

export default function App() {
  // PWA e suporte à instalação do APK Android
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalInstallOpen, setIsModalInstallOpen] = useState<boolean>(false);
  const [isModalDatabaseOpen, setIsModalDatabaseOpen] = useState<boolean>(false);

  // Configuração dinâmica de preços (avulso vs pacote e quantidade de sessões)
  const [configPrecos, setConfigPrecos] = useState<ConfiguracaoPrecos>(() => carregarConfiguracaoPrecos());
  const [isModalPricingOpen, setIsModalPricingOpen] = useState<boolean>(false);

  // Estado de Pacientes e Agendamentos persistidos em localStorage - BANCO DE DADOS ZERADO POR PADRÃO
  const [pacientes, setPacientes] = useState<Paciente[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PACIENTES) || localStorage.getItem(LEGACY_STORAGE_PACIENTES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler pacientes do localStorage:', e);
    }
    return []; // Inicia com banco de dados zerado
  });

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AGENDAMENTOS) || localStorage.getItem(LEGACY_STORAGE_AGENDAMENTOS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler agendamentos do localStorage:', e);
    }
    return []; // Inicia com banco de dados zerado
  });

  // Estado de Autenticação & Sincronização em Nuvem (Supabase ou Acesso Local)
  const supabaseConfigured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [localUserLogin, setLocalUserLogin] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(supabaseConfigured);
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);
  const [migracaoLocalPendente, setMigracaoLocalPendente] = useState<{
    pacientes: Paciente[];
    agendamentos: Agendamento[];
    recorrencias: AgendamentoRecorrenteConfig[];
    configPrecos: ConfiguracaoPrecos;
  } | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (supabaseConfigured) return;
    try {
      localStorage.setItem(STORAGE_PACIENTES, JSON.stringify(pacientes));
    } catch (e) {
      console.error('Erro ao salvar pacientes:', e);
    }
  }, [pacientes, supabaseConfigured]);

  useEffect(() => {
    if (supabaseConfigured) return;
    try {
      localStorage.setItem(STORAGE_AGENDAMENTOS, JSON.stringify(agendamentos));
    } catch (e) {
      console.error('Erro ao salvar agendamentos:', e);
    }
  }, [agendamentos, supabaseConfigured]);

  // Controle de Navegação e Datas (baseado no relógio atual do Android / Sistema)
  const [abaAtiva, setAbaAtiva] = useState<AbaNavegacao>('diaria');
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => obterHojeString());

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosAgenda>({
    status: 'todos',
    tipoTerapia: 'todos',
    buscaPaciente: '',
  });

  // Modais
  const [isModalNovoAgendamentoOpen, setIsModalNovoAgendamentoOpen] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<Agendamento | null>(null);
  const [agendamentoDetalhe, setAgendamentoDetalhe] = useState<Agendamento | null>(null);
  const [horarioPredefinido, setHorarioPredefinido] = useState<string>('09:00');
  const [dataPredefinida, setDataPredefinida] = useState<string>(() => obterHojeString());

  // Estado de Agenda Recorrente Semanal & Horários Fixos (dentro do mês)
  const [recorrencias, setRecorrencias] = useState<AgendamentoRecorrenteConfig[]>(() => carregarRecorrencias());
  const [isModalRecurrencePullOpen, setIsModalRecurrencePullOpen] = useState<boolean>(false);
  const [isModalRecurringSchedulesOpen, setIsModalRecurringSchedulesOpen] = useState<boolean>(false);
  const [mesParaPuxar, setMesParaPuxar] = useState<{ ano: number; mes: number; nomeMes: string }>(() => {
    const d = new Date();
    return {
      ano: d.getFullYear(),
      mes: d.getMonth(),
      nomeMes: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    };
  });

  useEffect(() => {
    if (supabaseConfigured) return;
    salvarRecorrencias(recorrencias);
  }, [recorrencias, supabaseConfigured]);

  // Carrega dados da nuvem ao autenticar no Supabase
  useEffect(() => {
    const userId = session?.user?.id;
    if (!supabaseConfigured || !userId) return;

    let active = true;
    setCloudLoading(true);
    fetchAllCloudData(userId)
      .then((cloud) => {
        if (!active) return;
        setPacientes(cloud.pacientes);
        setAgendamentos(cloud.agendamentos);
        setRecorrencias(cloud.recorrencias);
        if (cloud.configPrecos) {
          setConfigPrecos(cloud.configPrecos);
        }

        // Verifica se há dados locais ainda não enviados para a nuvem
        if (cloud.pacientes.length === 0 && cloud.agendamentos.length === 0) {
          try {
            const localPacRaw = localStorage.getItem(STORAGE_PACIENTES) || localStorage.getItem(LEGACY_STORAGE_PACIENTES);
            const localAgRaw = localStorage.getItem(STORAGE_AGENDAMENTOS) || localStorage.getItem(LEGACY_STORAGE_AGENDAMENTOS);
            const localPac: Paciente[] = localPacRaw ? JSON.parse(localPacRaw) : [];
            const localAg: Agendamento[] = localAgRaw ? JSON.parse(localAgRaw) : [];
            const localRec = carregarRecorrencias();
            if (localPac.length > 0 || localAg.length > 0 || localRec.length > 0) {
              setMigracaoLocalPendente({
                pacientes: localPac,
                agendamentos: localAg,
                recorrencias: localRec,
                configPrecos: carregarConfiguracaoPrecos(),
              });
            }
          } catch {
            // ignora erro de leitura local
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados do Supabase:', err);
        mostrarNotificacao('Erro ao sincronizar dados da nuvem. Verifique as tabelas no Supabase.', 'alerta');
      })
      .finally(() => {
        if (active) setCloudLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session?.user?.id, supabaseConfigured]);

  const userId = session?.user?.id;

  const sincronizarComNuvem = (promise: Promise<void>) => {
    if (!supabaseConfigured || !userId) return;
    promise.catch((err) => {
      console.error('Erro de sincronização Supabase:', err);
      mostrarNotificacao('Falha ao salvar alteração na nuvem Supabase.', 'alerta');
    });
  };

  const handleMigrarDadosLocaisParaNuvem = async () => {
    if (!userId || !migracaoLocalPendente) return;
    setCloudLoading(true);
    try {
      await Promise.all([
        upsertPacientesCloud(userId, migracaoLocalPendente.pacientes),
        upsertAgendamentosCloud(userId, migracaoLocalPendente.agendamentos),
        upsertRecorrenciasCloud(userId, migracaoLocalPendente.recorrencias),
        upsertConfigPrecosCloud(userId, migracaoLocalPendente.configPrecos),
      ]);
      setPacientes(migracaoLocalPendente.pacientes);
      setAgendamentos(migracaoLocalPendente.agendamentos);
      setRecorrencias(migracaoLocalPendente.recorrencias);
      setConfigPrecos(migracaoLocalPendente.configPrecos);
      setMigracaoLocalPendente(null);
      mostrarNotificacao('Dados locais importados para o Supabase com sucesso!');
    } catch (err) {
      console.error('Erro na migração local -> nuvem:', err);
      mostrarNotificacao('Erro ao importar dados locais para o Supabase.', 'alerta');
    } finally {
      setCloudLoading(false);
    }
  };

  const handleResetLocalAllData = () => {
    setPacientes([]);
    setAgendamentos([]);
    setRecorrencias([]);
    setConfigPrecos(CONFIG_PRECOS_PADRAO);
    setAgendamentoDetalhe(null);
    setAgendamentoParaEditar(null);
    setNotificacao(null);
    localStorage.removeItem(STORAGE_PACIENTES);
    localStorage.removeItem(STORAGE_AGENDAMENTOS);
    localStorage.removeItem(LEGACY_STORAGE_PACIENTES);
    localStorage.removeItem(LEGACY_STORAGE_AGENDAMENTOS);
    localStorage.removeItem(STORAGE_RECORRENCIAS);
    localStorage.removeItem(STORAGE_KEY_PRECOS);
  };

  const handleLogout = async () => {
    setAgendamentoDetalhe(null);
    setAgendamentoParaEditar(null);
    setNotificacao(null);
    if (supabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setPacientes([]);
      setAgendamentos([]);
      setRecorrencias([]);
      setMigracaoLocalPendente(null);
      return;
    }
    setLocalUserLogin(null);
  };

  // Feedback Notification
  const [notificacao, setNotificacao] = useState<{ mensagem: string; tipo?: 'info' | 'alerta' } | null>(null);

  const mostrarNotificacao = (mensagem: string, tipo: 'info' | 'alerta' = 'info') => {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => {
      setNotificacao(null);
    }, 4500);
  };

  // Filtragem dos agendamentos
  const agendamentosFiltrados = agendamentos.filter((a) => {
    if (filtros.status && filtros.status !== 'todos' && a.status !== filtros.status) {
      return false;
    }
    if (filtros.tipoTerapia && filtros.tipoTerapia !== 'todos' && a.tipoTerapia !== filtros.tipoTerapia) {
      return false;
    }
    if (filtros.buscaPaciente && filtros.buscaPaciente.trim() !== '') {
      const q = filtros.buscaPaciente.toLowerCase();
      const matchNome = a.pacienteNome.toLowerCase().includes(q);
      const matchObs = a.observacoes?.toLowerCase().includes(q) || false;
      const matchConduta = a.condutaTerapeutica?.toLowerCase().includes(q) || false;
      if (!matchNome && !matchObs && !matchConduta) return false;
    }
    return true;
  });

  // Manipulação de Agendamentos e Dedução de Pacote
  const handleSalvarAgendamento = (
    dadosAgendamento: Omit<Agendamento, 'id' | 'criadoEm'>,
    novoPaciente?: Omit<Paciente, 'id' | 'dataCadastro'>,
    atualizarPacotePaciente?: { pacienteId: string; sessoesUtilizadas: number; novoPacote?: boolean },
    opcoesRecorrencia?: {
      isRecorrente: boolean;
      gerarParaTodoMes?: boolean;
    }
  ) => {
    // Se um novo paciente foi cadastrado junto
    let pacienteNovoPersistir: Paciente | undefined;
    if (novoPaciente) {
      const novoPac: Paciente = {
        ...novoPaciente,
        id: dadosAgendamento.pacienteId,
        dataCadastro: new Date().toISOString().split('T')[0],
      };
      pacienteNovoPersistir = novoPac;
      setPacientes((prev) => [novoPac, ...prev]);
      if (userId) {
        sincronizarComNuvem(upsertPacientesCloud(userId, [novoPac]));
      }
    }

    // Se deve atualizar o pacote do paciente
    if (atualizarPacotePaciente && !pacienteNovoPersistir) {
      const alvo = pacientes.find((p) => p.id === atualizarPacotePaciente.pacienteId);
      if (alvo) {
        let pacienteAtualizado: Paciente = alvo;
        if (atualizarPacotePaciente.novoPacote) {
          pacienteAtualizado = {
            ...alvo,
            pacoteAtivo: {
              id: `pct_${Date.now()}`,
              totalSessoes: configPrecos.sessoesPorPacote,
              sessoesUtilizadas: atualizarPacotePaciente.sessoesUtilizadas,
              valorTotal: configPrecos.precoPacote,
              dataCompra: dadosAgendamento.data,
              ativo: true,
            }
          };
        } else if (alvo.pacoteAtivo) {
          pacienteAtualizado = {
            ...alvo,
            pacoteAtivo: {
              ...alvo.pacoteAtivo,
              sessoesUtilizadas: atualizarPacotePaciente.sessoesUtilizadas
            }
          };
        }

        setPacientes((prev) =>
          prev.map((p) => (p.id === atualizarPacotePaciente.pacienteId ? pacienteAtualizado : p))
        );
        if (userId) {
          sincronizarComNuvem(upsertPacientesCloud(userId, [pacienteAtualizado]));
        }
      }
    }

    // Processamento de Recorrência se solicitado
    let regraRecorrenciaId: string | undefined = undefined;
    if (opcoesRecorrencia?.isRecorrente) {
      const parts = dadosAgendamento.data.split('-').map(Number);
      const diaSemanaCalc = dadosAgendamento.diaSemana ?? new Date(parts[0], parts[1] - 1, parts[2]).getDay();

      const novaRecorrencia = criarRecorrenciaConfig({
        pacienteId: dadosAgendamento.pacienteId,
        pacienteNome: dadosAgendamento.pacienteNome,
        pacienteTelefone: dadosAgendamento.pacienteTelefone,
        diaSemana: diaSemanaCalc,
        horario: dadosAgendamento.horario,
        duracaoMinutos: dadosAgendamento.duracaoMinutos,
        tipoTerapia: dadosAgendamento.tipoTerapia,
        modalidadeCobranca: dadosAgendamento.modalidadeCobranca || 'avulso',
        valor: dadosAgendamento.valor,
        zonasTratadas: dadosAgendamento.zonasTratadas,
        ativo: true,
      });
      regraRecorrenciaId = novaRecorrencia.id;

      setRecorrencias((prev) => {
        const semMesmoHorario = prev.filter(
          (r) => !(r.pacienteId === dadosAgendamento.pacienteId && r.diaSemana === diaSemanaCalc && r.horario === dadosAgendamento.horario)
        );
        return [novaRecorrencia, ...semMesmoHorario];
      });
      if (userId) {
        sincronizarComNuvem(upsertRecorrenciasCloud(userId, [novaRecorrencia]));
      }
    }

    if (agendamentoParaEditar) {
      // Atualização
      const agEditado: Agendamento = {
        ...agendamentoParaEditar,
        ...dadosAgendamento,
        recorrenciaId: regraRecorrenciaId || agendamentoParaEditar.recorrenciaId,
      };
      const atualizados = agendamentos.map((item) =>
        item.id === agendamentoParaEditar.id ? agEditado : item
      );
      setAgendamentos(atualizados);
      if (userId) {
        sincronizarComNuvem(upsertAgendamentosCloud(userId, [agEditado]));
      }
      mostrarNotificacao('Atendimento atualizado com sucesso!');
      setAgendamentoParaEditar(null);
      if (agendamentoDetalhe?.id === agendamentoParaEditar.id) {
        setAgendamentoDetalhe(agEditado);
      }
    } else {
      // Criação da sessão principal
      const novoId = `ag_${Date.now()}`;
      const novo: Agendamento = {
        ...dadosAgendamento,
        id: novoId,
        criadoEm: new Date().toISOString(),
        recorrenciaId: regraRecorrenciaId,
      };

      // Se solicitado gerar para todas as semanas deste mês
      let agendamentosExtrasDoMes: Agendamento[] = [];
      if (opcoesRecorrencia?.isRecorrente && opcoesRecorrencia.gerarParaTodoMes) {
        const parts = dadosAgendamento.data.split('-').map(Number);
        const ano = parts[0];
        const mesIdx = parts[1] - 1;
        const diaSemanaCalc = dadosAgendamento.diaSemana ?? new Date(ano, mesIdx, parts[2]).getDay();
        const datasSemanais = obterDatasDoDiaSemanaNoMes(ano, mesIdx, diaSemanaCalc);

        for (const dataStr of datasSemanais) {
          if (dataStr !== dadosAgendamento.data) {
            // Verifica se o horário já não está ocupado
            const horarioOcupado = agendamentos.some((a) => a.data === dataStr && a.horario === dadosAgendamento.horario);
            if (!horarioOcupado) {
              agendamentosExtrasDoMes.push({
                ...dadosAgendamento,
                id: `ag_rec_${Date.now()}_${dataStr}`,
                data: dataStr,
                criadoEm: new Date().toISOString(),
                recorrente: true,
                recorrenciaId: regraRecorrenciaId,
                diaSemana: diaSemanaCalc,
              });
            }
          }
        }
      }

      setAgendamentos((prev) => [novo, ...agendamentosExtrasDoMes, ...prev]);
      if (userId) {
        sincronizarComNuvem(upsertAgendamentosCloud(userId, [novo, ...agendamentosExtrasDoMes]));
      }

      // Feedback e Alertas Clínicos
      if (agendamentosExtrasDoMes.length > 0) {
        mostrarNotificacao(
          `Atendimento semanal fixo salvo! ${agendamentosExtrasDoMes.length + 1} sessões geradas para este mês.`,
          'info'
        );
      } else if (dadosAgendamento.modalidadeCobranca === 'pacote' && dadosAgendamento.numeroSessaoPacote === configPrecos.sessoesPorPacote) {
        mostrarNotificacao(
          `⚠️ Atenção Clínica: Esta é a ${configPrecos.sessoesPorPacote}ª e última sessão do pacote de ${dadosAgendamento.pacienteNome}! Lembre-se de propor renovação (${formatarMoeda(configPrecos.precoPacote)}).`,
          'alerta'
        );
      } else if (dadosAgendamento.modalidadeCobranca === 'pacote') {
        mostrarNotificacao(
          `Sessão ${dadosAgendamento.numeroSessaoPacote}/${configPrecos.sessoesPorPacote} deduzida do pacote de ${dadosAgendamento.pacienteNome}.`,
          'info'
        );
      } else {
        mostrarNotificacao(`Atendimento (${formatarMoeda(dadosAgendamento.valor)}) agendado com sucesso!`);
      }
    }
  };

  // Funções de Gestão de Recorrências
  const handleSalvarRecorrencia = (config: AgendamentoRecorrenteConfig) => {
    setRecorrencias((prev) => {
      const idx = prev.findIndex((r) => r.id === config.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = config;
        return copy;
      }
      return [config, ...prev];
    });
    if (userId) {
      sincronizarComNuvem(upsertRecorrenciasCloud(userId, [config]));
    }
    mostrarNotificacao(`Horário fixo semanal salvo para ${config.pacienteNome}!`);
  };

  const handleExcluirRecorrencia = (id: string) => {
    setRecorrencias((prev) => prev.filter((r) => r.id !== id));
    if (userId) {
      sincronizarComNuvem(deleteRecorrenciaCloud(userId, id));
    }
    mostrarNotificacao('Regra de atendimento recorrente removida.');
  };

  const handleToggleRecorrenciaAtivo = (id: string) => {
    const alvo = recorrencias.find((r) => r.id === id);
    const atualizada = alvo ? { ...alvo, ativo: !alvo.ativo } : null;
    setRecorrencias((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ativo: !r.ativo } : r))
    );
    if (userId && atualizada) {
      sincronizarComNuvem(upsertRecorrenciasCloud(userId, [atualizada]));
    }
  };

  const handleConfirmarPuxarRecorrencias = (selecionadosIds: string[]) => {
    const { ano, mes, nomeMes } = mesParaPuxar;
    const regrasSelecionadas = recorrencias.filter(
      (r) => r.ativo && selecionadosIds.includes(r.id)
    );

    let novos: Agendamento[] = [];
    regrasSelecionadas.forEach((config) => {
      const gerados = gerarAgendamentosParaMes(
        config,
        ano,
        mes,
        [...agendamentos, ...novos]
      );
      novos = [...novos, ...gerados];
    });

    if (novos.length === 0) {
      mostrarNotificacao('Nenhum agendamento novo a ser criado para este mês (horários já preenchidos ou sem regras ativas).', 'info');
      setIsModalRecurrencePullOpen(false);
      return;
    }

    setAgendamentos((prev) => [...novos, ...prev]);
    if (userId) {
      sincronizarComNuvem(upsertAgendamentosCloud(userId, novos));
    }
    setIsModalRecurrencePullOpen(false);
    mostrarNotificacao(
      `Sucesso! ${novos.length} atendimentos recorrentes foram puxados para o mês de ${nomeMes}.`,
      'info'
    );
  };

  const handleMudarMesMonthlyView = (novoAno: number, novoMes: number) => {
    const nomeMes = new Date(novoAno, novoMes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    setMesParaPuxar({ ano: novoAno, mes: novoMes, nomeMes });

    const ativas = recorrencias.filter((r) => r.ativo);
    if (ativas.length > 0) {
      setIsModalRecurrencePullOpen(true);
    }
  };

  const handleAbrirPuxarManual = (ano: number, mes: number) => {
    const ativas = recorrencias.filter((r) => r.ativo);
    if (ativas.length === 0) {
      mostrarNotificacao('Nenhuma regra de horário fixo ativo encontrada. Cadastre horários fixos primeiro.', 'info');
      setIsModalRecurringSchedulesOpen(true);
      return;
    }
    const nomeMes = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    setMesParaPuxar({ ano, mes, nomeMes });
    setIsModalRecurrencePullOpen(true);
  };

  const handleRenovarPacote = (
    pacienteId: string,
    detalhes?: {
      dataRenovacao?: string;
      formaPagamento?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
      observacoes?: string;
    }
  ) => {
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) return;

    const dataHoje = detalhes?.dataRenovacao || new Date().toISOString().split('T')[0];

    const historicoAnterior = paciente.historicoPacotes || [];
    const historicoAtualizado = paciente.pacoteAtivo
      ? [
          {
            ...paciente.pacoteAtivo,
            ativo: false,
            dataRenovacao: dataHoje,
          },
          ...historicoAnterior,
        ]
      : historicoAnterior;

    const pacienteAtualizado: Paciente = {
      ...paciente,
      pacoteAtivo: {
        id: `pct_${Date.now()}`,
        totalSessoes: configPrecos.sessoesPorPacote,
        sessoesUtilizadas: 0,
        valorTotal: configPrecos.precoPacote,
        dataCompra: dataHoje,
        ativo: true,
        formaPagamento: detalhes?.formaPagamento || 'pix',
        observacoes: detalhes?.observacoes,
      },
      historicoPacotes: historicoAtualizado,
    };

    setPacientes((prev) =>
      prev.map((p) => (p.id === pacienteId ? pacienteAtualizado : p))
    );
    if (userId) {
      sincronizarComNuvem(upsertPacientesCloud(userId, [pacienteAtualizado]));
    }

    mostrarNotificacao(
      `Pacote de ${configPrecos.sessoesPorPacote} atendimentos (${formatarMoeda(configPrecos.precoPacote)}) renovado com sucesso para ${paciente.nome}! Histórico financeiro e novo ciclo iniciados.`,
      'info'
    );
  };

  const handleSalvarConfigPrecos = (novaConfig: ConfiguracaoPrecos) => {
    salvarConfiguracaoPrecos(novaConfig);
    setConfigPrecos(novaConfig);
    if (userId) {
      sincronizarComNuvem(upsertConfigPrecosCloud(userId, novaConfig));
    }
    mostrarNotificacao(
      `Tabela de preços atualizada com sucesso: Avulso R$ ${novaConfig.precoAvulso} | Pacote (${novaConfig.sessoesPorPacote}x) R$ ${novaConfig.precoPacote}`,
      'info'
    );
  };

  const handleStatusChange = (id: string, novoStatus: StatusAgendamento) => {
    const alvo = agendamentos.find((a) => a.id === id);
    const atualizado = alvo ? { ...alvo, status: novoStatus } : null;
    setAgendamentos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a))
    );
    if (userId && atualizado) {
      sincronizarComNuvem(upsertAgendamentosCloud(userId, [atualizado]));
    }
    if (agendamentoDetalhe && agendamentoDetalhe.id === id) {
      setAgendamentoDetalhe({ ...agendamentoDetalhe, status: novoStatus });
    }
    mostrarNotificacao(`Status alterado para "${novoStatus.toUpperCase()}".`);
  };

  const handleExcluirAgendamento = (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este agendamento?')) {
      setAgendamentos((prev) => prev.filter((a) => a.id !== id));
      if (userId) {
        sincronizarComNuvem(deleteAgendamentoCloud(userId, id));
      }
      setAgendamentoDetalhe(null);
      mostrarNotificacao('Sessão excluída da agenda.');
    }
  };

  const handleCadastrarNovoPaciente = (novo: Omit<Paciente, 'id' | 'dataCadastro'>) => {
    const novoPac: Paciente = {
      ...novo,
      id: `pac_${Date.now()}`,
      dataCadastro: new Date().toISOString().split('T')[0],
    };
    setPacientes((prev) => [novoPac, ...prev]);
    if (userId) {
      sincronizarComNuvem(upsertPacientesCloud(userId, [novoPac]));
    }
    mostrarNotificacao(`Paciente ${novo.nome} cadastrado com sucesso!`);
  };

  const handleAgendarParaPaciente = (paciente: Paciente) => {
    setAgendamentoParaEditar(null);
    setDataPredefinida(dataSelecionada);
    setHorarioPredefinido('09:00');
    setIsModalNovoAgendamentoOpen(true);
  };

  const abrirNovoAgendamentoNoHorario = (horario: string) => {
    setAgendamentoParaEditar(null);
    setDataPredefinida(dataSelecionada);
    setHorarioPredefinido(horario);
    setIsModalNovoAgendamentoOpen(true);
  };

  const abrirNovoAgendamentoNoDia = (dia: string) => {
    setAgendamentoParaEditar(null);
    setDataPredefinida(dia);
    setHorarioPredefinido('09:00');
    setIsModalNovoAgendamentoOpen(true);
  };

  const handleEditarAgendamento = (ag: Agendamento) => {
    setAgendamentoDetalhe(null);
    setAgendamentoParaEditar(ag);
    setDataPredefinida(ag.data);
    setHorarioPredefinido(ag.horario);
    setIsModalNovoAgendamentoOpen(true);
  };

  const handleZerarBanco = () => {
    setPacientes([]);
    setAgendamentos([]);
    setRecorrencias([]);
    localStorage.removeItem(STORAGE_PACIENTES);
    localStorage.removeItem(STORAGE_AGENDAMENTOS);
    if (userId) {
      sincronizarComNuvem(clearAllCloudData(userId));
    }
    setIsModalDatabaseOpen(false);
    mostrarNotificacao('Banco de dados zerado com sucesso! Sistema limpo e pronto.');
  };

  const handleCarregarExemplo = () => {
    setPacientes(PACIENTES_INICIAIS);
    setAgendamentos(AGENDAMENTOS_INICIAIS);
    if (userId) {
      sincronizarComNuvem(
        Promise.all([
          upsertPacientesCloud(userId, PACIENTES_INICIAIS),
          upsertAgendamentosCloud(userId, AGENDAMENTOS_INICIAIS),
        ]).then(() => undefined)
      );
    }
    setIsModalDatabaseOpen(false);
    mostrarNotificacao('Dados de demonstração carregados na agenda.');
  };

  const handleImportarDados = (dados: { pacientes: Paciente[]; agendamentos: Agendamento[]; configPrecos?: ConfiguracaoPrecos }) => {
    setPacientes(dados.pacientes);
    setAgendamentos(dados.agendamentos);
    if (dados.configPrecos) {
      setConfigPrecos(dados.configPrecos);
      salvarConfiguracaoPrecos(dados.configPrecos);
    }
    if (userId) {
      sincronizarComNuvem(
        Promise.all([
          upsertPacientesCloud(userId, dados.pacientes),
          upsertAgendamentosCloud(userId, dados.agendamentos),
          dados.configPrecos ? upsertConfigPrecosCloud(userId, dados.configPrecos) : Promise.resolve(),
        ]).then(() => undefined)
      );
    }
    mostrarNotificacao(`Backup importado: ${dados.pacientes.length} pacientes e ${dados.agendamentos.length} agendamentos.`);
  };

  const handleResetarDados = () => {
    setIsModalDatabaseOpen(true);
  };

  const isBancoZerado = pacientes.length === 0 && agendamentos.length === 0;

  // Tela de carregamento de sessão / login quando Supabase estiver configurado
  if (supabaseConfigured && authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white px-6 py-5 rounded-2xl border border-stone-200 shadow-sm text-center space-y-2">
          <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-stone-600">Conectando ao consultório na nuvem...</p>
        </div>
      </div>
    );
  }

  if (supabaseConfigured && !session) {
    return <AuthGate />;
  }

  if (!supabaseConfigured && !localUserLogin) {
    return (
      <AuthGate
        onLocalAuthSuccess={(loginDisplay) => setLocalUserLogin(loginDisplay)}
        onResetLocalAllData={handleResetLocalAllData}
      />
    );
  }

  const activeUserEmail = supabaseConfigured ? session?.user?.email : localUserLogin;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-teal-200">
      {/* Indicador de Status Offline / PWA */}
      <OfflineIndicator />

      {/* Top Header with Navigation Tabs */}
      <Header
        abaAtiva={abaAtiva}
        onAbaChange={setAbaAtiva}
        onNovoAgendamento={() => {
          setAgendamentoParaEditar(null);
          setDataPredefinida(dataSelecionada);
          setHorarioPredefinido('09:00');
          setIsModalNovoAgendamentoOpen(true);
        }}
        userEmail={activeUserEmail}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 space-y-5">
        {/* Banner de sincronização inicial ou migração local -> Supabase */}
        {cloudLoading && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs font-semibold text-teal-900 flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
            <span>Sincronizando registros com o Supabase...</span>
          </div>
        )}

        {migracaoLocalPendente && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="text-xs text-amber-950 space-y-0.5">
              <p className="font-bold">
                Dados locais encontrados neste dispositivo ({migracaoLocalPendente.pacientes.length} pacientes e {migracaoLocalPendente.agendamentos.length} agendamentos)
              </p>
              <p className="text-amber-800">
                Deseja enviar esses registros para a sua conta na nuvem Supabase?
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMigracaoLocalPendente(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-amber-100 transition-colors"
              >
                Dispensar
              </button>
              <button
                type="button"
                onClick={handleMigrarDadosLocaisParaNuvem}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors"
              >
                Importar para Nuvem
              </button>
            </div>
          </div>
        )}
        {/* Toast Notification */}
        {notificacao && (
          <div className={`fixed bottom-5 right-5 z-50 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 max-w-md ${
            notificacao.tipo === 'alerta'
              ? 'bg-amber-600 border-amber-400 text-white animate-bounce'
              : 'bg-stone-900 border-stone-700 text-white'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              notificacao.tipo === 'alerta' ? 'bg-white' : 'bg-teal-400'
            }`}></span>
            <span>{notificacao.mensagem}</span>
          </div>
        )}

        {/* Quick Clinical Metrics - Oculto na aba de configurações para manter tela limpa */}
        {abaAtiva !== 'configuracoes' && (
          <>
            <QuickStats
              agendamentos={agendamentos}
              dataHoje={dataSelecionada}
            />

            {/* 🔔 Alerta Persistente e Agendamento Automático de Lembretes para o Dia Seguinte */}
            <NextDayRemindersAlert
              agendamentos={agendamentos}
              dataReferencia={dataSelecionada}
              onVerDetalhesAgendamento={(id) => {
                const ag = agendamentos.find((a) => a.id === id);
                if (ag) setAgendamentoDetalhe(ag);
              }}
              onNotificar={mostrarNotificacao}
            />
          </>
        )}

        {/* Global Appointment Filters */}
        {abaAtiva !== 'pacientes' && abaAtiva !== 'configuracoes' && (
          <AppointmentFilters
            filtros={filtros}
            onChange={setFiltros}
            onLimpar={() =>
              setFiltros({
                status: 'todos',
                tipoTerapia: 'todos',
                buscaPaciente: '',
              })
            }
          />
        )}

        {/* View Switching */}
        {abaAtiva === 'diaria' && (
          <DailyTimelineView
            dataSelecionada={dataSelecionada}
            onDataChange={setDataSelecionada}
            agendamentos={agendamentosFiltrados}
            onSelectAgendamento={setAgendamentoDetalhe}
            onNovoAgendamentoNoHorario={abrirNovoAgendamentoNoHorario}
            onQuickStatusChange={handleStatusChange}
          />
        )}

        {abaAtiva === 'semanal' && (
          <WeeklyView
            dataReferencia={dataSelecionada}
            onDataChange={setDataSelecionada}
            agendamentos={agendamentosFiltrados}
            onSelectAgendamento={setAgendamentoDetalhe}
            onNovoAgendamentoNoDia={abrirNovoAgendamentoNoDia}
          />
        )}

        {abaAtiva === 'mensal' && (
          <MonthlyView
            agendamentos={agendamentosFiltrados}
            onSelectData={(data) => {
              setDataSelecionada(data);
              setAbaAtiva('diaria');
            }}
            onNovoAgendamentoNoDia={abrirNovoAgendamentoNoDia}
            dataAtiva={dataSelecionada}
            onMudarMes={handleMudarMesMonthlyView}
            onAbrirGestaoRecorrentes={() => setIsModalRecurringSchedulesOpen(true)}
            onPuxarRecorrentesParaMes={handleAbrirPuxarManual}
            totalRecorrentesAtivos={recorrencias.filter((r) => r.ativo).length}
          />
        )}

        {abaAtiva === 'pacientes' && (
          <PatientsView
            pacientes={pacientes}
            agendamentos={agendamentos}
            onNovoPaciente={handleCadastrarNovoPaciente}
            onAgendarParaPaciente={handleAgendarParaPaciente}
            onSelectAgendamento={setAgendamentoDetalhe}
            onRenovarPacote={handleRenovarPacote}
            configPrecos={configPrecos}
            onAbrirConfigPrecos={() => setIsModalPricingOpen(true)}
          />
        )}

        {abaAtiva === 'configuracoes' && (
          <SettingsView
            configPrecos={configPrecos}
            onSalvarConfigPrecos={handleSalvarConfigPrecos}
            pacientes={pacientes}
            agendamentos={agendamentos}
            onZerarBanco={handleZerarBanco}
            onCarregarExemplo={handleCarregarExemplo}
            onImportarDados={handleImportarDados}
            onAbrirModalInstalar={() => setIsModalInstallOpen(true)}
            isInstalled={isInstalled}
            isInstallable={isInstallable}
            onTriggerInstall={install}
            onAbrirGestaoRecorrentes={() => setIsModalRecurringSchedulesOpen(true)}
            totalRecorrentes={recorrencias.filter((r) => r.ativo).length}
            supabaseConfigured={supabaseConfigured}
            userEmail={activeUserEmail}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Modal Criar / Editar Agendamento */}
      <AppointmentModal
        isOpen={isModalNovoAgendamentoOpen}
        onClose={() => {
          setIsModalNovoAgendamentoOpen(false);
          setAgendamentoParaEditar(null);
        }}
        onSave={handleSalvarAgendamento}
        agendamentoParaEditar={agendamentoParaEditar}
        pacientes={pacientes}
        dataInicial={dataPredefinida}
        horarioInicial={horarioPredefinido}
        configPrecos={configPrecos}
      />

      {/* Modal Detalhes da Sessão & Evolução */}
      <AppointmentDetailModal
        agendamento={agendamentoDetalhe}
        isOpen={!!agendamentoDetalhe}
        onClose={() => setAgendamentoDetalhe(null)}
        onEdit={handleEditarAgendamento}
        onDelete={handleExcluirAgendamento}
        onStatusChange={handleStatusChange}
        onRenovarPacote={handleRenovarPacote}
      />

      {/* Modal de Confirmação para Puxar Recorrências do Mês */}
      <RecurrencePullModal
        isOpen={isModalRecurrencePullOpen}
        onClose={() => setIsModalRecurrencePullOpen(false)}
        ano={mesParaPuxar.ano}
        mes={mesParaPuxar.mes}
        recorrencias={recorrencias}
        agendamentosExistentes={agendamentos}
        onConfirmarPuxar={handleConfirmarPuxarRecorrencias}
        onNaoPuxar={() => setIsModalRecurrencePullOpen(false)}
      />

      {/* Modal de Gestão de Agendamentos Recorrentes & Horários Fixos */}
      <RecurringSchedulesModal
        isOpen={isModalRecurringSchedulesOpen}
        onClose={() => setIsModalRecurringSchedulesOpen(false)}
        recorrencias={recorrencias}
        pacientes={pacientes}
        configPrecos={configPrecos}
        onSalvarRecorrencia={handleSalvarRecorrencia}
        onExcluirRecorrencia={handleExcluirRecorrencia}
        onToggleAtivo={handleToggleRecorrenciaAtivo}
        onAbrirPuxarParaMes={() => {
          setIsModalRecurringSchedulesOpen(false);
          handleAbrirPuxarManual(mesParaPuxar.ano, mesParaPuxar.mes);
        }}
      />

      {/* Modal de Configuração de Preços & Pacotes (Sessão Avulsa vs Pacote com Quantidade de Sessões) */}
      <PricingConfigModal
        isOpen={isModalPricingOpen}
        onClose={() => setIsModalPricingOpen(false)}
        configAtual={configPrecos}
        onSalvar={handleSalvarConfigPrecos}
      />

      {/* Barra de Navegação Inferior Nativa para Android APK */}
      <AndroidBottomNav
        abaAtiva={abaAtiva}
        onAbaChange={setAbaAtiva}
        totalPacientes={pacientes.length}
      />

      {/* Modal Instalação APK Android */}
      <AndroidInstallModal
        isOpen={isModalInstallOpen}
        onClose={() => setIsModalInstallOpen(false)}
        isInstalled={isInstalled}
        isInstallable={isInstallable}
        onTriggerInstall={install}
      />

      {/* Modal Gerenciador do Banco de Dados (Zerar / Backup / Restaurar) */}
      <DatabaseManagerModal
        isOpen={isModalDatabaseOpen}
        onClose={() => setIsModalDatabaseOpen(false)}
        pacientes={pacientes}
        agendamentos={agendamentos}
        configPrecos={configPrecos}
        onZerarBanco={handleZerarBanco}
        onCarregarExemplo={handleCarregarExemplo}
        onImportarDados={handleImportarDados}
      />
    </div>
  );
}
