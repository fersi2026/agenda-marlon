import { supabase } from '../lib/supabaseClient';
import {
  Agendamento,
  AgendamentoRecorrenteConfig,
  ConfiguracaoPrecos,
  Paciente,
} from '../types';
import { CONFIG_PRECOS_PADRAO } from '../utils/pricingUtils';

// ============================================================================
// Mapeadores entre TypeScript (camelCase) e PostgreSQL (snake_case)
// ============================================================================

function pacienteToRow(userId: string, p: Paciente) {
  return {
    user_id: userId,
    id: p.id,
    nome: p.nome,
    telefone: p.telefone,
    email: p.email ?? null,
    data_nascimento: p.dataNascimento ?? null,
    profissao: p.profissao ?? null,
    queixa_principal: p.queixaPrincipal || '',
    observacoes_clinicas: p.observacoesClinicas ?? null,
    data_cadastro: p.dataCadastro,
    pacote_ativo: p.pacoteAtivo ?? null,
    historico_pacotes: p.historicoPacotes ?? [],
    updated_at: new Date().toISOString(),
  };
}

function rowToPaciente(row: Record<string, any>): Paciente {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email ?? undefined,
    dataNascimento: row.data_nascimento ?? undefined,
    profissao: row.profissao ?? undefined,
    queixaPrincipal: row.queixa_principal ?? '',
    observacoesClinicas: row.observacoes_clinicas ?? undefined,
    dataCadastro: row.data_cadastro,
    pacoteAtivo: row.pacote_ativo ?? undefined,
    historicoPacotes: Array.isArray(row.historico_pacotes) ? row.historico_pacotes : [],
  };
}

function agendamentoToRow(userId: string, a: Agendamento) {
  return {
    user_id: userId,
    id: a.id,
    paciente_id: a.pacienteId,
    paciente_nome: a.pacienteNome,
    paciente_telefone: a.pacienteTelefone,
    data: a.data,
    horario: a.horario,
    duracao_minutos: Number(a.duracaoMinutos) || 50,
    tipo_terapia: a.tipoTerapia,
    zonas_tratadas: a.zonasTratadas ?? [],
    nivel_dor_inicial: Number(a.nivelDorInicial) || 0,
    nivel_dor_final: a.nivelDorFinal !== undefined ? Number(a.nivelDorFinal) : null,
    status: a.status,
    modalidade_cobranca: a.modalidadeCobranca,
    numero_sessao_pacote: a.numeroSessaoPacote ?? null,
    is_ultima_sessao_pacote: Boolean(a.isUltimaSessaoPacote),
    valor: Number(a.valor) || 0,
    pago: Boolean(a.pago),
    metodo_pagamento: a.metodoPagamento ?? null,
    recorrente: Boolean(a.recorrente),
    recorrencia_id: a.recorrenciaId ?? null,
    dia_semana: a.diaSemana ?? null,
    observacoes: a.observacoes ?? null,
    conduta_terapeutica: a.condutaTerapeutica ?? null,
    recomendacoes_home_care: a.recomendacoesHomeCare ?? null,
    criado_em: a.criadoEm,
    updated_at: new Date().toISOString(),
  };
}

function rowToAgendamento(row: Record<string, any>): Agendamento {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    pacienteNome: row.paciente_nome,
    pacienteTelefone: row.paciente_telefone,
    data: row.data,
    horario: row.horario,
    duracaoMinutos: Number(row.duracao_minutos) || 50,
    tipoTerapia: row.tipo_terapia,
    zonasTratadas: Array.isArray(row.zonas_tratadas) ? row.zonas_tratadas : [],
    nivelDorInicial: Number(row.nivel_dor_inicial) || 0,
    nivelDorFinal: row.nivel_dor_final !== null && row.nivel_dor_final !== undefined
      ? Number(row.nivel_dor_final)
      : undefined,
    status: row.status,
    modalidadeCobranca: row.modalidade_cobranca,
    numeroSessaoPacote: row.numero_sessao_pacote ?? undefined,
    isUltimaSessaoPacote: Boolean(row.is_ultima_sessao_pacote),
    valor: Number(row.valor) || 0,
    pago: Boolean(row.pago),
    metodoPagamento: row.metodo_pagamento ?? undefined,
    recorrente: Boolean(row.recorrente),
    recorrenciaId: row.recorrencia_id ?? undefined,
    diaSemana: row.dia_semana !== null && row.dia_semana !== undefined ? Number(row.dia_semana) : undefined,
    observacoes: row.observacoes ?? undefined,
    condutaTerapeutica: row.conduta_terapeutica ?? undefined,
    recomendacoesHomeCare: row.recomendacoes_home_care ?? undefined,
    criadoEm: row.criado_em,
  };
}

function recorrenciaToRow(userId: string, r: AgendamentoRecorrenteConfig) {
  return {
    user_id: userId,
    id: r.id,
    paciente_id: r.pacienteId,
    paciente_nome: r.pacienteNome,
    paciente_telefone: r.pacienteTelefone,
    dia_semana: Number(r.diaSemana),
    horario: r.horario,
    duracao_minutos: Number(r.duracaoMinutos) || 50,
    tipo_terapia: r.tipoTerapia,
    modalidade_cobranca: r.modalidadeCobranca,
    zonas_tratadas: r.zonasTratadas ?? [],
    valor: Number(r.valor) || 0,
    ativo: Boolean(r.ativo),
    criado_em: r.criadoEm,
    atualizado_em: r.atualizadoEm ?? null,
    updated_at: new Date().toISOString(),
  };
}

function rowToRecorrencia(row: Record<string, any>): AgendamentoRecorrenteConfig {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    pacienteNome: row.paciente_nome,
    pacienteTelefone: row.paciente_telefone,
    diaSemana: Number(row.dia_semana),
    horario: row.horario,
    duracaoMinutos: Number(row.duracao_minutos) || 50,
    tipoTerapia: row.tipo_terapia,
    modalidadeCobranca: row.modalidade_cobranca,
    zonasTratadas: Array.isArray(row.zonas_tratadas) ? row.zonas_tratadas : [],
    valor: Number(row.valor) || 0,
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em ?? undefined,
  };
}

// ============================================================================
// Operações de Leitura e Escrita no Supabase (protegidas por RLS + user_id)
// ============================================================================

export async function fetchAllCloudData(userId: string): Promise<{
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  recorrencias: AgendamentoRecorrenteConfig[];
  configPrecos: ConfiguracaoPrecos | null;
}> {
  if (!supabase) {
    return { pacientes: [], agendamentos: [], recorrencias: [], configPrecos: null };
  }

  const [pacRes, agRes, recRes, cfgRes] = await Promise.all([
    supabase
      .from('pacientes')
      .select('*')
      .eq('user_id', userId)
      .order('data_cadastro', { ascending: false }),
    supabase
      .from('agendamentos')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false }),
    supabase
      .from('recorrencias')
      .select('*')
      .eq('user_id', userId)
      .order('criado_em', { ascending: false }),
    supabase
      .from('configuracoes_clinica')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (pacRes.error) throw pacRes.error;
  if (agRes.error) throw agRes.error;
  if (recRes.error) throw recRes.error;
  if (cfgRes.error) throw cfgRes.error;

  const configPrecos: ConfiguracaoPrecos | null = cfgRes.data
    ? {
        precoAvulso: Number(cfgRes.data.preco_avulso) || CONFIG_PRECOS_PADRAO.precoAvulso,
        precoPacote: Number(cfgRes.data.preco_pacote) || CONFIG_PRECOS_PADRAO.precoPacote,
        sessoesPorPacote: Number(cfgRes.data.sessoes_por_pacote) || CONFIG_PRECOS_PADRAO.sessoesPorPacote,
        validadeDiasPacote: Number(cfgRes.data.validade_dias_pacote) || CONFIG_PRECOS_PADRAO.validadeDiasPacote,
      }
    : null;

  return {
    pacientes: (pacRes.data || []).map(rowToPaciente),
    agendamentos: (agRes.data || []).map(rowToAgendamento),
    recorrencias: (recRes.data || []).map(rowToRecorrencia),
    configPrecos,
  };
}

export async function upsertPacientesCloud(userId: string, lista: Paciente[]): Promise<void> {
  if (!supabase || lista.length === 0) return;
  const rows = lista.map((p) => pacienteToRow(userId, p));
  const { error } = await supabase.from('pacientes').upsert(rows, { onConflict: 'user_id,id' });
  if (error) throw error;
}

export async function upsertAgendamentosCloud(userId: string, lista: Agendamento[]): Promise<void> {
  if (!supabase || lista.length === 0) return;
  const rows = lista.map((a) => agendamentoToRow(userId, a));
  const { error } = await supabase.from('agendamentos').upsert(rows, { onConflict: 'user_id,id' });
  if (error) throw error;
}

export async function deleteAgendamentoCloud(userId: string, agendamentoId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('agendamentos')
    .delete()
    .eq('user_id', userId)
    .eq('id', agendamentoId);
  if (error) throw error;
}

export async function upsertRecorrenciasCloud(
  userId: string,
  lista: AgendamentoRecorrenteConfig[]
): Promise<void> {
  if (!supabase || lista.length === 0) return;
  const rows = lista.map((r) => recorrenciaToRow(userId, r));
  const { error } = await supabase.from('recorrencias').upsert(rows, { onConflict: 'user_id,id' });
  if (error) throw error;
}

export async function deleteRecorrenciaCloud(userId: string, recorrenciaId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('recorrencias')
    .delete()
    .eq('user_id', userId)
    .eq('id', recorrenciaId);
  if (error) throw error;
}

export async function upsertConfigPrecosCloud(
  userId: string,
  config: ConfiguracaoPrecos
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('configuracoes_clinica').upsert(
    {
      user_id: userId,
      preco_avulso: Number(config.precoAvulso),
      preco_pacote: Number(config.precoPacote),
      sessoes_por_pacote: Number(config.sessoesPorPacote),
      validade_dias_pacote: Number(config.validadeDiasPacote || 90),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function clearAllCloudData(userId: string): Promise<void> {
  if (!supabase) return;
  const [agDel, recDel, pacDel] = await Promise.all([
    supabase.from('agendamentos').delete().eq('user_id', userId),
    supabase.from('recorrencias').delete().eq('user_id', userId),
    supabase.from('pacientes').delete().eq('user_id', userId),
  ]);
  if (agDel.error) throw agDel.error;
  if (recDel.error) throw recDel.error;
  if (pacDel.error) throw pacDel.error;
}
