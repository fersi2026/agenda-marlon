import { Agendamento, AgendamentoRecorrenteConfig } from '../types';

export const STORAGE_RECORRENCIAS = 'agenda_psicologia_recorrencias_v1';
export const STORAGE_MESES_RECORRENCIA_PRODUZIDOS = 'agenda_psicologia_meses_processados_v1';

export const DIAS_SEMANA_EXTENSO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Retorna o nome por extenso do dia da semana (0 = Domingo .. 6 = Sábado)
 */
export function getNomeDiaSemana(diaSemana: number): string {
  return DIAS_SEMANA_EXTENSO[diaSemana] || 'Dia';
}

/**
 * Retorna todas as datas (formato YYYY-MM-DD) de um dia da semana específico dentro de um determinado mês
 * @param ano Ano (ex: 2026)
 * @param mes Mês (0 = Janeiro, ..., 11 = Dezembro)
 * @param diaSemana 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
 */
export function obterDatasDoDiaSemanaNoMes(ano: number, mes: number, diaSemana: number): string[] {
  const datas: string[] = [];
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataObj = new Date(ano, mes, dia);
    if (dataObj.getDay() === diaSemana) {
      const anoStr = String(ano);
      const mesStr = String(mes + 1).padStart(2, '0');
      const diaStr = String(dia).padStart(2, '0');
      datas.push(`${anoStr}-${mesStr}-${diaStr}`);
    }
  }

  return datas;
}

/**
 * Gera os agendamentos recorrentes de uma configuração para um mês específico,
 * evitando duplicações se já existir agendamento para o mesmo paciente na mesma data e horário.
 */
export function gerarAgendamentosParaMes(
  config: AgendamentoRecorrenteConfig,
  ano: number,
  mes: number,
  agendamentosExistentes: Agendamento[],
  numeroSessaoInicial = 1
): Agendamento[] {
  const datas = obterDatasDoDiaSemanaNoMes(ano, mes, config.diaSemana);
  const novosAgendamentos: Agendamento[] = [];

  let contadorSessao = numeroSessaoInicial;

  datas.forEach((dataStr, index) => {
    // Evita duplicar se já houver sessão para o paciente nesta data e horário
    const jaExiste = agendamentosExistentes.some(
      (a) => a.pacienteId === config.pacienteId && a.data === dataStr && a.horario === config.horario && a.status !== 'cancelado'
    );

    if (!jaExiste) {
      const isPacote = config.modalidadeCobranca === 'pacote';
      const numSessao = isPacote ? ((contadorSessao - 1) % 4) + 1 : undefined;
      const isUltima = isPacote && numSessao === 4;

      const novoAgendamento: Agendamento = {
        id: `ag_rec_${config.id}_${dataStr.replace(/-/g, '')}_${Date.now()}_${index}`,
        pacienteId: config.pacienteId,
        pacienteNome: config.pacienteNome,
        pacienteTelefone: config.pacienteTelefone,
        data: dataStr,
        horario: config.horario,
        duracaoMinutos: config.duracaoMinutos,
        tipoTerapia: config.tipoTerapia,
        zonasTratadas: config.zonasTratadas || ['ansiedade_panico'],
        nivelDorInicial: 5,
        status: 'confirmado',
        modalidadeCobranca: config.modalidadeCobranca,
        numeroSessaoPacote: numSessao,
        isUltimaSessaoPacote: isUltima,
        valor: config.valor,
        pago: isPacote, // No pacote já é pago antecipadamente
        metodoPagamento: isPacote ? 'pacote_incluso' : 'pendente',
        recorrente: true,
        recorrenciaId: config.id,
        diaSemana: config.diaSemana,
        observacoes: `Atendimento recorrente semanal (${getNomeDiaSemana(config.diaSemana)} às ${config.horario})`,
        criadoEm: new Date().toISOString(),
      };

      novosAgendamentos.push(novoAgendamento);
      contadorSessao++;
    }
  });

  return novosAgendamentos;
}

/**
 * Salva a lista de regras de recorrência no localStorage
 */
export function salvarRecorrencias(configs: AgendamentoRecorrenteConfig[]): void {
  try {
    localStorage.setItem(STORAGE_RECORRENCIAS, JSON.stringify(configs));
  } catch (e) {
    console.error('Erro ao salvar recorrências:', e);
  }
}

/**
 * Cria uma nova configuração de recorrência semanal com ID e timestamp
 */
export function criarRecorrenciaConfig(
  dados: Omit<AgendamentoRecorrenteConfig, 'id' | 'criadoEm'>
): AgendamentoRecorrenteConfig {
  return {
    ...dados,
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    criadoEm: new Date().toISOString(),
  };
}

/**
 * Carrega as regras de recorrência do localStorage
 */
export function carregarRecorrencias(): AgendamentoRecorrenteConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECORRENCIAS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao carregar recorrências:', e);
  }
  return [];
}
