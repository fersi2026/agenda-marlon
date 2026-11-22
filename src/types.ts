export type StatusAgendamento = 
  | 'agendado' 
  | 'confirmado' 
  | 'em_andamento' 
  | 'realizado' 
  | 'cancelado';

export type TipoTerapia = 
  | 'psicoterapia_individual'
  | 'tcc'
  | 'psicanalise'
  | 'terapia_casal_familia'
  | 'psicoterapia_infantojuvenil'
  | 'avaliacao_psicologica'
  | 'manual'
  | 'instrumental'
  | 'ventosa'
  | 'dry_needling'
  | 'esportiva'
  | 'postural'
  | string;

export type EixoDemandaPsicologica = 
  | 'emocoes_humor' 
  | 'relacionamentos' 
  | 'cognicao_trabalho' 
  | 'comportamento_psicossomatica';

export interface DemandaPsicologica {
  id: string;
  nome: string;
  eixo: EixoDemandaPsicologica;
  descricao?: string;
  icone?: string;
}

// Alias de retrocompatibilidade para componentes existentes
export type ZonaFascial = DemandaPsicologica;

export type ModalidadeCobranca = 'avulso' | 'pacote';

export interface PacoteCliente {
  id: string;
  totalSessoes: number; // padrão 4
  sessoesUtilizadas: number; // 0 a 4
  valorTotal: number; // R$ 500.00
  dataCompra: string;
  ativo: boolean;
  formaPagamento?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  dataRenovacao?: string;
  observacoes?: string;
}

export interface Paciente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  dataNascimento?: string;
  profissao?: string;
  queixaPrincipal: string;
  observacoesClinicas?: string;
  dataCadastro: string;
  pacoteAtivo?: PacoteCliente;
  historicoPacotes?: PacoteCliente[];
}

export interface Agendamento {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteTelefone: string;
  data: string; // formato YYYY-MM-DD
  horario: string; // formato HH:mm (ex: "09:00")
  duracaoMinutos: number; // ex: 60
  tipoTerapia: TipoTerapia;
  zonasTratadas: string[]; // IDs das Zonas Fasciais
  nivelDorInicial: number; // 0 a 10 (EVA)
  nivelDorFinal?: number; // 0 a 10 (após a sessão)
  status: StatusAgendamento;
  
  // Modelo de Cobrança específico: Avulso R$ 150 ou Pacote 4x R$ 500
  modalidadeCobranca: ModalidadeCobranca;
  numeroSessaoPacote?: number; // Ex: 1, 2, 3 ou 4
  isUltimaSessaoPacote?: boolean; // True quando for a 4ª sessão do pacote
  valor: number; // Ex: 150.00 se avulso, ou valor correspondente
  pago: boolean;
  metodoPagamento?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pendente' | 'pacote_incluso';
  
  // Agenda Recorrente Semanal (mesmo dia e horário dentro do mês)
  recorrente?: boolean;
  recorrenciaId?: string;
  diaSemana?: number; // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado

  observacoes?: string;
  condutaTerapeutica?: string;
  recomendacoesHomeCare?: string;
  criadoEm: string;
}

export interface AgendamentoRecorrenteConfig {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteTelefone: string;
  diaSemana: number; // 0 a 6 (ex: 2 = Terça)
  horario: string; // "14:00"
  duracaoMinutos: number;
  tipoTerapia: TipoTerapia;
  modalidadeCobranca: ModalidadeCobranca;
  zonasTratadas: string[];
  valor: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface FiltrosAgenda {
  status?: StatusAgendamento | 'todos';
  tipoTerapia?: TipoTerapia | 'todos';
  buscaPaciente?: string;
}

export interface ConfiguracaoPrecos {
  precoAvulso: number; // Ex: 150
  precoPacote: number; // Ex: 500
  sessoesPorPacote: number; // Ex: 4
  validadeDiasPacote?: number; // Ex: 90 dias
}

export interface LembreteAutomatico {
  id: string; // Ex: lembrete_ag_1_2026-09-16
  agendamentoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteTelefone: string;
  data: string; // YYYY-MM-DD
  horario: string;
  duracaoMinutos: number;
  tipoTerapia: TipoTerapia;
  modalidadeCobranca: ModalidadeCobranca;
  numeroSessaoPacote?: number;
  totalSessoesPacote?: number;
  isUltimaSessaoPacote?: boolean;
  statusEnvio: 'pendente' | 'enviado' | 'dispensado';
  mensagem: string;
  atualizadoEm: string;
}

export interface EstadoLembretesStorage {
  ultimaVerificacao: string;
  dataAlvo: string;
  statusLembretes: Record<string, 'pendente' | 'enviado' | 'dispensado'>;
  minimizado?: boolean;
}
