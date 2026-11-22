import { Paciente, Agendamento, TipoTerapia, StatusAgendamento, DemandaPsicologica } from '../types';
import { obterHojeString, somarDias } from '../utils/dateUtils';

export const PRECO_AVULSO = 150;
export const PRECO_PACOTE = 500;
export const SESSOES_POR_PACOTE = 4;
export const NOME_PROFISSIONAL = 'Psicólogo Marlon Figueiredo';

export const DEMANDAS_PSICOLOGICAS: DemandaPsicologica[] = [
  // Eixo 1: Emoções & Humor
  { id: 'ansiedade_panico', nome: 'Ansiedade & Crises de Pânico', eixo: 'emocoes_humor', descricao: 'Sintomas ansiosos, taquicardia, hipervigilância e crises agudas de angústia' },
  { id: 'depressao_desanimo', nome: 'Depressão & Desânimo', eixo: 'emocoes_humor', descricao: 'Tristeza persistente, desânimo, perda de interesse e anedonia' },
  { id: 'regulacao_emocional', nome: 'Regulação Emocional & Impulsividade', eixo: 'emocoes_humor', descricao: 'Labilidade afetiva, explosões de raiva e baixa tolerância à frustração' },
  { id: 'autoestima_inseguranca', nome: 'Autoestima & Autocrítica Severa', eixo: 'emocoes_humor', descricao: 'Sentimentos de insuficiência, síndrome do impostor e autocrítica' },
  { id: 'luto_perdas', nome: 'Luto, Perdas & Separações', eixo: 'emocoes_humor', descricao: 'Processamento de perdas afetivas, rupturas de vínculos e mudanças drásticas' },

  // Eixo 2: Relacionamentos & Vínculos
  { id: 'conflitos_afetivos', nome: 'Conflitos Conjugais & Afetivos', eixo: 'relacionamentos', descricao: 'Dificuldades de convivência, ciúmes, alinhamento conjugal e apego' },
  { id: 'dinamica_familiar', nome: 'Dinâmica Familiar & Parentalidade', eixo: 'relacionamentos', descricao: 'Conflitos familiares transgeracionais, limites e desafios com filhos' },
  { id: 'limites_comunicacao', nome: 'Comunicação Assertiva & Limites', eixo: 'relacionamentos', descricao: 'Dificuldade de posicionamento, passividade e medo de desagradar' },
  { id: 'habilidades_sociais', nome: 'Fobia Social & Timidez', eixo: 'relacionamentos', descricao: 'Ansiedade em interações sociais, medo de julgamento e evitação' },

  // Eixo 3: Cognição, Carreira & Desempenho
  { id: 'estresse_burnout', nome: 'Estresse Ocupacional & Burnout', eixo: 'cognicao_trabalho', descricao: 'Sobrecarga crônica de trabalho, exaustão emocional e despersonalização' },
  { id: 'foco_tdah', nome: 'Atenção, Foco & Sintomas de TDAH', eixo: 'cognicao_trabalho', descricao: 'Desorganização executiva, impulsividade e gerenciamento de tarefas' },
  { id: 'procrastinacao', nome: 'Procrastinação & Autossabotagem', eixo: 'cognicao_trabalho', descricao: 'Esquiva sistemática de tarefas, perfeccionismo e paralisia de ação' },
  { id: 'transicao_carreira', nome: 'Transição Profissional & Decisões', eixo: 'cognicao_trabalho', descricao: 'Dilemas vocacionais, planejamento de carreira e propósito de vida' },

  // Eixo 4: Comportamento & Psicossomática
  { id: 'sono_insonia', nome: 'Insônia & Distúrbios do Sono', eixo: 'comportamento_psicossomatica', descricao: 'Dificuldade para adormecer, despertares noturnos e ruminação' },
  { id: 'compulsoes', nome: 'Compulsões & Hábitos Disfuncionais', eixo: 'comportamento_psicossomatica', descricao: 'Compulsão alimentar, uso excessivo de telas e dependências' },
  { id: 'psicossomatica', nome: 'Sintomas Psicossomáticos & Tensão', eixo: 'comportamento_psicossomatica', descricao: 'Cefaleia tensional, bruxismo, gastrite nervosa e tensão corporal' },
  { id: 'trauma_tept', nome: 'Traumas, Abusos & TEPT', eixo: 'comportamento_psicossomatica', descricao: 'Memórias traumáticas intrusivas, esquiva e hipervigilância' },
  { id: 'fobias', nome: 'Fobias Específicas & Medos', eixo: 'comportamento_psicossomatica', descricao: 'Medo de falar em público, agulhas, voar, dirigir ou espaços fechados' },
];

// Compatibilidade de interface com componentes legados
export const ZONAS_FASCIAIS = DEMANDAS_PSICOLOGICAS as any;

export const TIPOS_TERAPIA_CONFIG: Record<string, { 
  nome: string; 
  badgeClass: string; 
  iconBg: string; 
  duracaoPadrao: number;
  descricao: string;
}> = {
  psicoterapia_individual: {
    nome: 'Psicoterapia Individual',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBg: 'bg-teal-100 text-teal-700',
    duracaoPadrao: 50,
    descricao: 'Atendimento clínico individual para adultos focado em autoconhecimento, queixas emocionais e elaboração de conflitos.'
  },
  tcc: {
    nome: 'Terapia Cognitivo-Comportamental (TCC)',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    duracaoPadrao: 50,
    descricao: 'Abordagem estruturada com identificação de pensamentos automáticos, reestruturação cognitiva e treino comportamental.'
  },
  psicanalise: {
    nome: 'Psicanálise Clínica',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700',
    duracaoPadrao: 50,
    descricao: 'Investigação do inconsciente, livre associação de ideias e elaboração de conteúdos reprimidos e defesas psíquicas.'
  },
  terapia_casal_familia: {
    nome: 'Terapia de Casal & Família',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    duracaoPadrao: 60,
    descricao: 'Mediação de conflitos relacionais, fortalecimento da comunicação assertiva e alinhamento de vínculos familiares.'
  },
  psicoterapia_infantojuvenil: {
    nome: 'Psicoterapia Infantojuvenil',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    iconBg: 'bg-cyan-100 text-cyan-700',
    duracaoPadrao: 50,
    descricao: 'Acolhimento com ludoterapia para crianças e adolescentes, com sessões de devolutiva e orientação parental periódica.'
  },
  avaliacao_psicologica: {
    nome: 'Avaliação Psicológica / Anamnese',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    duracaoPadrao: 60,
    descricao: 'Sessão inicial de anamnese detalhada, mapeamento de queixas, alinhamento de contrato terapêutico e plano de intervenção.'
  },
  // Retrocompatibilidade para dados legados
  manual: {
    nome: 'Psicoterapia Clínica Geral',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    iconBg: 'bg-teal-100 text-teal-700',
    duracaoPadrao: 50,
    descricao: 'Atendimento psicoterapêutico clínico individual.'
  },
  instrumental: {
    nome: 'Intervenção Estruturada (TCC)',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    duracaoPadrao: 50,
    descricao: 'Protocolos estruturados de reestruturação cognitiva.'
  },
  ventosa: {
    nome: 'Regulação Emocional & Mindfulness',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    duracaoPadrao: 50,
    descricao: 'Técnicas de regulação afetiva e atenção plena.'
  },
  dry_needling: {
    nome: 'Intervenção Focada em Trauma',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700',
    duracaoPadrao: 50,
    descricao: 'Processamento de memórias traumáticas e estresse agudo.'
  },
  esportiva: {
    nome: 'Psicologia do Esporte & Performance',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    duracaoPadrao: 50,
    descricao: 'Foco em rendimento mental, foco e ansiedade de desempenho.'
  },
  postural: {
    nome: 'Psicossomática & Bioenergética',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    duracaoPadrao: 50,
    descricao: 'Compreensão de manifestações somáticas de sofrimento psíquico.'
  }
};

export const STATUS_CONFIG: Record<StatusAgendamento, { 
  rotulo: string; 
  badgeClass: string; 
  dotColor: string; 
}> = {
  agendado: {
    rotulo: 'Agendado',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    dotColor: 'bg-stone-400'
  },
  confirmado: {
    rotulo: 'Confirmado',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
    dotColor: 'bg-teal-500'
  },
  em_andamento: {
    rotulo: 'Em Sessão',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse',
    dotColor: 'bg-amber-500'
  },
  realizado: {
    rotulo: 'Sessão Concluída',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotColor: 'bg-emerald-500'
  },
  cancelado: {
    rotulo: 'Cancelado',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    dotColor: 'bg-rose-400'
  }
};

export const PACIENTES_INICIAIS: Paciente[] = [
  {
    id: 'pac_1',
    nome: 'Mariana Duarte Souza',
    telefone: '(11) 98765-4321',
    email: 'mariana.duarte@email.com',
    dataNascimento: '1991-04-18',
    profissao: 'Arquiteta (Home Office)',
    queixaPrincipal: 'Ansiedade generalizada, hipervigilância e crises de angústia ligadas à sobrecarga de trabalho.',
    observacoesClinicas: 'Apresenta esquema de perfeccionismo e autocobrança desadaptativa. Pacote mensal de 4 sessões ativo.',
    dataCadastro: '2026-08-10',
    pacoteAtivo: {
      id: 'pct_mariana_2',
      totalSessoes: 4,
      sessoesUtilizadas: 4, // 4ª e última sessão concluída -> Alerta de renovação!
      valorTotal: 500,
      dataCompra: '2026-08-15',
      ativo: true,
      formaPagamento: 'pix',
      observacoes: 'Ciclo com avanços expressivos em técnicas de respiração e manejo de prazos. Proposta de renovação pendente.'
    },
    historicoPacotes: [
      {
        id: 'pct_mariana_1',
        totalSessoes: 4,
        sessoesUtilizadas: 4,
        valorTotal: 500,
        dataCompra: '2026-07-10',
        dataRenovacao: '2026-08-15',
        ativo: false,
        formaPagamento: 'pix',
        observacoes: 'Primeiro ciclo de 4 sessões com foco em anamnese e psicoeducação da ansiedade.'
      }
    ]
  },
  {
    id: 'pac_2',
    nome: 'Lucas Albuquerque Mendes',
    telefone: '(11) 97123-8899',
    email: 'lucas.albuquerque@email.com',
    dataNascimento: '1988-11-25',
    profissao: 'Analista de Sistemas',
    queixaPrincipal: 'Dificuldade de concentração, dispersão frequente, desorganização e sintomas compatíveis com TDAH adulto.',
    observacoesClinicas: 'Trabalhando planejamento executivo e manejo da procrastinação. Pacote de 4 sessões em andamento.',
    dataCadastro: '2026-08-15',
    pacoteAtivo: {
      id: 'pct_lucas_1',
      totalSessoes: 4,
      sessoesUtilizadas: 2, // 2 de 4
      valorTotal: 500,
      dataCompra: '2026-09-01',
      ativo: true,
      formaPagamento: 'cartao_credito',
      observacoes: 'Pacote focado em reestruturação cognitiva e rotinas diárias.'
    },
    historicoPacotes: []
  },
  {
    id: 'pac_3',
    nome: 'Rodrigo Pires Sanches',
    telefone: '(11) 99455-1200',
    email: 'rodrigo.sanches@email.com',
    dataNascimento: '1984-03-02',
    profissao: 'Engenheiro Civil',
    queixaPrincipal: 'Conflitos conjugais recentes, dificuldade em expressar sentimentos e crises de estresse familiar.',
    observacoesClinicas: 'Modalidade avulsa sob demanda (R$ 150/sessão). Trabalhando comunicação não-violenta.',
    dataCadastro: '2026-08-20',
    historicoPacotes: []
  },
  {
    id: 'pac_4',
    nome: 'Camila Fernandes Vianna',
    telefone: '(11) 98341-9011',
    email: 'camila.vianna@email.com',
    dataNascimento: '1995-07-09',
    profissao: 'Designer Gráfica & Ilustradora',
    queixaPrincipal: 'Crises frequentes de autocrítica, sensação de vazio e síndrome do impostor em novos projetos.',
    observacoesClinicas: 'Abordagem TCC combinada com diário de pensamentos. Pacote renovado.',
    dataCadastro: '2026-08-28',
    pacoteAtivo: {
      id: 'pct_camila_2',
      totalSessoes: 4,
      sessoesUtilizadas: 1,
      valorTotal: 500,
      dataCompra: '2026-09-05',
      ativo: true,
      formaPagamento: 'pix',
      observacoes: 'Segundo ciclo de psicoterapia'
    },
    historicoPacotes: [
      {
        id: 'pct_camila_1',
        totalSessoes: 4,
        sessoesUtilizadas: 4,
        valorTotal: 500,
        dataCompra: '2026-08-01',
        dataRenovacao: '2026-09-05',
        ativo: false,
        formaPagamento: 'cartao_debito',
        observacoes: 'Ciclo inicial de acolhimento e fortalecimento da autoimagem.'
      }
    ]
  },
  {
    id: 'pac_5',
    nome: 'Gustavo Henrique Ramos',
    telefone: '(11) 97652-3344',
    email: 'gustavo.ramos@email.com',
    dataNascimento: '1979-12-14',
    profissao: 'Advogado Tributarista',
    queixaPrincipal: 'Insônia inicial grave, ruminação mental noturna e estresse ocupacional intenso.',
    observacoesClinicas: 'Atendimento avulso. Iniciada psicoeducação em higiene do sono e desfusão cognitiva.',
    dataCadastro: '2026-09-01',
    historicoPacotes: []
  },
  {
    id: 'pac_6',
    nome: 'Felipe Siqueira Lima',
    telefone: '(11) 98112-4455',
    email: 'felipe.siqueira@email.com',
    dataNascimento: '1986-06-12',
    profissao: 'Gerente Comercial',
    queixaPrincipal: 'Síndrome de Burnout pós-reestruturação corporativa e ansiedade de desempenho.',
    observacoesClinicas: 'Paciente em acompanhamento regular com pacote de 4 sessões (3ª sessão).',
    dataCadastro: '2026-05-02',
    pacoteAtivo: {
      id: 'pct_felipe_3',
      totalSessoes: 4,
      sessoesUtilizadas: 3,
      valorTotal: 500,
      dataCompra: '2026-08-22',
      ativo: true,
      formaPagamento: 'pix',
      observacoes: 'Terceiro pacote de acompanhamento'
    },
    historicoPacotes: [
      {
        id: 'pct_felipe_1',
        totalSessoes: 4,
        sessoesUtilizadas: 4,
        valorTotal: 500,
        dataCompra: '2026-05-05',
        dataRenovacao: '2026-06-15',
        ativo: false,
        formaPagamento: 'cartao_credito',
        observacoes: 'Acolhimento da crise aguda de estresse'
      },
      {
        id: 'pct_felipe_2',
        totalSessoes: 4,
        sessoesUtilizadas: 4,
        valorTotal: 500,
        dataCompra: '2026-06-15',
        dataRenovacao: '2026-08-22',
        ativo: false,
        formaPagamento: 'pix',
        observacoes: 'Trabalho de limites e transição de ritmo'
      }
    ]
  },
  {
    id: 'pac_7',
    nome: 'Juliana Macedo Prado',
    telefone: '(11) 99234-7711',
    email: 'juliana.macedo@email.com',
    dataNascimento: '1993-02-18',
    profissao: 'Cirurgiã-Dentista',
    queixaPrincipal: 'Dificuldade de impor limites no ambiente de trabalho, exaustão mental e medo de desapontar terceiros.',
    observacoesClinicas: 'Iniciou com consultas avulsas e migrou para pacote mensal continuado.',
    dataCadastro: '2026-04-10',
    pacoteAtivo: {
      id: 'pct_juliana_2',
      totalSessoes: 4,
      sessoesUtilizadas: 2,
      valorTotal: 500,
      dataCompra: '2026-07-28',
      ativo: true,
      formaPagamento: 'pix',
      observacoes: 'Trabalhando assertividade e autoafirmação'
    },
    historicoPacotes: [
      {
        id: 'pct_juliana_1',
        totalSessoes: 4,
        sessoesUtilizadas: 4,
        valorTotal: 500,
        dataCompra: '2026-05-18',
        dataRenovacao: '2026-07-28',
        ativo: false,
        formaPagamento: 'cartao_debito',
        observacoes: 'Ciclo inicial'
      }
    ]
  }
];

export const AGENDAMENTOS_INICIAIS: Agendamento[] = [
  // --- Histórico Passado ---
  {
    id: 'ag_hist_1',
    pacienteId: 'pac_7',
    pacienteNome: 'Juliana Macedo Prado',
    pacienteTelefone: '(11) 99234-7711',
    data: '2026-08-10',
    horario: '10:00',
    duracaoMinutos: 50,
    tipoTerapia: 'psicoterapia_individual',
    zonasTratadas: ['limites_comunicacao', 'autoestima_inseguranca'],
    nivelDorInicial: 8,
    nivelDorFinal: 3,
    status: 'realizado',
    modalidadeCobranca: 'pacote',
    numeroSessaoPacote: 1,
    valor: 125,
    pago: true,
    metodoPagamento: 'pacote_incluso',
    observacoes: 'Discussão sobre limites profissionais e assertividade na clínica.',
    condutaTerapeutica: 'Role-play de conversa difícil com sócio; reforço positivo das respostas assertivas.',
    recomendacoesHomeCare: 'Registrar situações onde sentiu impulso de dizer sim querendo dizer não.',
    criadoEm: '2026-08-08T10:00:00Z'
  },
  {
    id: 'ag_hist_2',
    pacienteId: 'pac_6',
    pacienteNome: 'Felipe Siqueira Lima',
    pacienteTelefone: '(11) 98112-4455',
    data: '2026-08-25',
    horario: '14:00',
    duracaoMinutos: 50,
    tipoTerapia: 'tcc',
    zonasTratadas: ['estresse_burnout', 'ansiedade_panico'],
    nivelDorInicial: 9,
    nivelDorFinal: 4,
    status: 'realizado',
    modalidadeCobranca: 'pacote',
    numeroSessaoPacote: 1,
    valor: 125,
    pago: true,
    metodoPagamento: 'pacote_incluso',
    observacoes: 'Evolução clínica do Burnout. Queixa de taquicardia ao checar e-mails.',
    condutaTerapeutica: 'Mapeamento de pensamentos automáticos de urgência; técnica de desaceleração.',
    criadoEm: '2026-08-22T14:00:00Z'
  },

  // --- Agendamentos de Hoje (15/09/2026) ---
  {
    id: 'ag_hoje_1',
    pacienteId: 'pac_1',
    pacienteNome: 'Mariana Duarte Souza',
    pacienteTelefone: '(11) 98765-4321',
    data: obterHojeString(),
    horario: '09:00',
    duracaoMinutos: 50,
    tipoTerapia: 'tcc',
    zonasTratadas: ['ansiedade_panico', 'estresse_burnout'],
    nivelDorInicial: 7,
    nivelDorFinal: 2,
    status: 'realizado',
    modalidadeCobranca: 'pacote',
    numeroSessaoPacote: 4,
    isUltimaSessaoPacote: true,
    valor: 125,
    pago: true,
    metodoPagamento: 'pacote_incluso',
    observacoes: '4ª e última sessão do pacote mensal! Paciente apresentou grande estabilidade no manejo das crises.',
    condutaTerapeutica: 'Revisão dos ganhos terapêuticos do ciclo. Apresentada proposta de renovação do pacote de 4 sessões (R$ 500,00).',
    recomendacoesHomeCare: 'Manter a prática matinal de respiração consciente e leitura dos cartões de enfrentamento.',
    criadoEm: '2026-09-10T09:00:00Z'
  },
  {
    id: 'ag_hoje_2',
    pacienteId: 'pac_2',
    pacienteNome: 'Lucas Albuquerque Mendes',
    pacienteTelefone: '(11) 97123-8899',
    data: obterHojeString(),
    horario: '10:30',
    duracaoMinutos: 50,
    tipoTerapia: 'psicoterapia_individual',
    zonasTratadas: ['foco_tdah', 'procrastinacao'],
    nivelDorInicial: 6,
    nivelDorFinal: 3,
    status: 'confirmado',
    modalidadeCobranca: 'pacote',
    numeroSessaoPacote: 2,
    isUltimaSessaoPacote: false,
    valor: 125,
    pago: true,
    metodoPagamento: 'pacote_incluso',
    observacoes: 'Sessão 2 de 4 do pacote. Alinhamento de metas de rotina e redução de distrações digitais.',
    condutaTerapeutica: 'Organização da técnica Pomodoro adaptada e delimitação de blocos de hiperfoco.',
    recomendacoesHomeCare: 'Aplicar a técnica dos 5 minutos para tarefas burocráticas pendentes.',
    criadoEm: '2026-09-12T11:00:00Z'
  },
  {
    id: 'ag_hoje_3',
    pacienteId: 'pac_3',
    pacienteNome: 'Rodrigo Pires Sanches',
    pacienteTelefone: '(11) 99455-1200',
    data: obterHojeString(),
    horario: '14:00',
    duracaoMinutos: 50,
    tipoTerapia: 'terapia_casal_familia',
    zonasTratadas: ['conflitos_afetivos', 'limites_comunicacao'],
    nivelDorInicial: 8,
    status: 'confirmado',
    modalidadeCobranca: 'avulso',
    valor: 150,
    pago: false,
    metodoPagamento: 'pix',
    observacoes: 'Atendimento Avulso (R$ 150,00). Foco em desentendimentos recentes e escuta afetiva.',
    criadoEm: '2026-09-13T14:30:00Z'
  },
  {
    id: 'ag_hoje_4',
    pacienteId: 'pac_5',
    pacienteNome: 'Gustavo Henrique Ramos',
    pacienteTelefone: '(11) 97652-3344',
    data: obterHojeString(),
    horario: '16:00',
    duracaoMinutos: 50,
    tipoTerapia: 'tcc',
    zonasTratadas: ['sono_insonia', 'estresse_burnout', 'psicossomatica'],
    nivelDorInicial: 9,
    status: 'agendado',
    modalidadeCobranca: 'avulso',
    valor: 150,
    pago: false,
    metodoPagamento: 'pix',
    observacoes: 'Consulta avulsa para intervenção em insônia severa associada a prazos jurídicos.',
    criadoEm: '2026-09-14T08:30:00Z'
  },

  // --- Agendamentos de Amanhã ---
  {
    id: 'ag_amanha_1',
    pacienteId: 'pac_4',
    pacienteNome: 'Camila Fernandes Vianna',
    pacienteTelefone: '(11) 98341-9011',
    data: somarDias(obterHojeString(), 1),
    horario: '09:00',
    duracaoMinutos: 50,
    tipoTerapia: 'psicanalise',
    zonasTratadas: ['autoestima_inseguranca', 'regulacao_emocional'],
    nivelDorInicial: 6,
    status: 'confirmado',
    modalidadeCobranca: 'pacote',
    numeroSessaoPacote: 2,
    isUltimaSessaoPacote: false,
    valor: 125,
    pago: true,
    metodoPagamento: 'pacote_incluso',
    observacoes: 'Sessão 2 de 4 do pacote. Aprofundamento sobre raízes da autocrítica.',
    criadoEm: '2026-09-14T10:00:00Z'
  },
  {
    id: 'ag_amanha_2',
    pacienteId: 'pac_6',
    pacienteNome: 'Felipe Siqueira Lima',
    pacienteTelefone: '(11) 98112-4455',
    data: somarDias(obterHojeString(), 1),
    horario: '11:00',
    duracaoMinutos: 50,
    tipoTerapia: 'tcc',
    zonasTratadas: ['estresse_burnout', 'transicao_carreira'],
    nivelDorInicial: 5,
    status: 'agendado',
    modalidadeCobranca: 'pacote',
    numeroSessaoPacote: 4,
    isUltimaSessaoPacote: true,
    valor: 125,
    pago: true,
    metodoPagamento: 'pacote_incluso',
    observacoes: 'Sessão 4 de 4 (ÚLTIMA SESSÃO DO PACOTE). Apresentar proposta de renovação de ciclo (R$ 500,00).',
    criadoEm: '2026-09-14T11:30:00Z'
  },
  {
    id: 'ag_amanha_3',
    pacienteId: 'pac_7',
    pacienteNome: 'Juliana Macedo Prado',
    pacienteTelefone: '(11) 99234-7711',
    data: somarDias(obterHojeString(), 1),
    horario: '15:00',
    duracaoMinutos: 50,
    tipoTerapia: 'psicoterapia_individual',
    zonasTratadas: ['limites_comunicacao', 'dinamica_familiar'],
    nivelDorInicial: 7,
    status: 'agendado',
    modalidadeCobranca: 'pacote',
    numeroSessaoPacote: 3,
    isUltimaSessaoPacote: false,
    valor: 125,
    pago: true,
    metodoPagamento: 'pacote_incluso',
    observacoes: 'Sessão 3 de 4. Evolução no estabelecimento de limites interpessoais.',
    criadoEm: '2026-09-15T09:15:00Z'
  }
];
