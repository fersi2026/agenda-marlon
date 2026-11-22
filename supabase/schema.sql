-- ============================================================================
-- Schema SQL para Supabase (PostgreSQL + Row Level Security)
-- Sistema: Psicólogo Marlon Figueiredo • Psicologia Clínica
-- Cole e execute este script no SQL Editor do seu projeto Supabase.
-- ============================================================================

-- 1. Tabela de Configurações da Clínica (Preços e Pacotes)
create table if not exists public.configuracoes_clinica (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preco_avulso numeric not null default 150,
  preco_pacote numeric not null default 500,
  sessoes_por_pacote integer not null default 4,
  validade_dias_pacote integer not null default 90,
  updated_at timestamptz not null default now()
);

-- 2. Tabela de Pacientes & Pacotes
create table if not exists public.pacientes (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  nome text not null,
  telefone text not null,
  email text,
  data_nascimento text,
  profissao text,
  queixa_principal text not null default '',
  observacoes_clinicas text,
  data_cadastro text not null,
  pacote_ativo jsonb,
  historico_pacotes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 3. Tabela de Agendamentos & Prontuário / Evolução Clínica
create table if not exists public.agendamentos (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  paciente_id text not null,
  paciente_nome text not null,
  paciente_telefone text not null,
  data text not null,
  horario text not null,
  duracao_minutos integer not null default 50,
  tipo_terapia text not null,
  zonas_tratadas jsonb not null default '[]'::jsonb,
  nivel_dor_inicial integer not null default 5,
  nivel_dor_final integer,
  status text not null default 'agendado',
  modalidade_cobranca text not null default 'avulso',
  numero_sessao_pacote integer,
  is_ultima_sessao_pacote boolean not null default false,
  valor numeric not null default 150,
  pago boolean not null default false,
  metodo_pagamento text,
  recorrente boolean not null default false,
  recorrencia_id text,
  dia_semana integer,
  observacoes text,
  conduta_terapeutica text,
  recomendacoes_home_care text,
  criado_em text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 4. Tabela de Horários Fixos / Recorrências Semanais
create table if not exists public.recorrencias (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  paciente_id text not null,
  paciente_nome text not null,
  paciente_telefone text not null,
  dia_semana integer not null,
  horario text not null,
  duracao_minutos integer not null default 50,
  tipo_terapia text not null,
  modalidade_cobranca text not null default 'pacote',
  zonas_tratadas jsonb not null default '[]'::jsonb,
  valor numeric not null default 125,
  ativo boolean not null default true,
  criado_em text not null,
  atualizado_em text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Índices para consultas rápidas por usuário e data
create index if not exists idx_pacientes_user on public.pacientes (user_id);
create index if not exists idx_agendamentos_user_data on public.agendamentos (user_id, data);
create index if not exists idx_recorrencias_user on public.recorrencias (user_id);

-- ============================================================================
-- Segurança: Row Level Security (RLS)
-- Garante que cada psicólogo autenticado acesse apenas seus próprios registros.
-- ============================================================================

alter table public.configuracoes_clinica enable row level security;
alter table public.pacientes enable row level security;
alter table public.agendamentos enable row level security;
alter table public.recorrencias enable row level security;

-- Políticas para configuracoes_clinica
drop policy if exists "config_select_own" on public.configuracoes_clinica;
create policy "config_select_own" on public.configuracoes_clinica
  for select using (auth.uid() = user_id);

drop policy if exists "config_insert_own" on public.configuracoes_clinica;
create policy "config_insert_own" on public.configuracoes_clinica
  for insert with check (auth.uid() = user_id);

drop policy if exists "config_update_own" on public.configuracoes_clinica;
create policy "config_update_own" on public.configuracoes_clinica
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "config_delete_own" on public.configuracoes_clinica;
create policy "config_delete_own" on public.configuracoes_clinica
  for delete using (auth.uid() = user_id);

-- Políticas para pacientes
drop policy if exists "pacientes_select_own" on public.pacientes;
create policy "pacientes_select_own" on public.pacientes
  for select using (auth.uid() = user_id);

drop policy if exists "pacientes_insert_own" on public.pacientes;
create policy "pacientes_insert_own" on public.pacientes
  for insert with check (auth.uid() = user_id);

drop policy if exists "pacientes_update_own" on public.pacientes;
create policy "pacientes_update_own" on public.pacientes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pacientes_delete_own" on public.pacientes;
create policy "pacientes_delete_own" on public.pacientes
  for delete using (auth.uid() = user_id);

-- Políticas para agendamentos
drop policy if exists "agendamentos_select_own" on public.agendamentos;
create policy "agendamentos_select_own" on public.agendamentos
  for select using (auth.uid() = user_id);

drop policy if exists "agendamentos_insert_own" on public.agendamentos;
create policy "agendamentos_insert_own" on public.agendamentos
  for insert with check (auth.uid() = user_id);

drop policy if exists "agendamentos_update_own" on public.agendamentos;
create policy "agendamentos_update_own" on public.agendamentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "agendamentos_delete_own" on public.agendamentos;
create policy "agendamentos_delete_own" on public.agendamentos
  for delete using (auth.uid() = user_id);

-- Políticas para recorrencias
drop policy if exists "recorrencias_select_own" on public.recorrencias;
create policy "recorrencias_select_own" on public.recorrencias
  for select using (auth.uid() = user_id);

drop policy if exists "recorrencias_insert_own" on public.recorrencias;
create policy "recorrencias_insert_own" on public.recorrencias
  for insert with check (auth.uid() = user_id);

drop policy if exists "recorrencias_update_own" on public.recorrencias;
create policy "recorrencias_update_own" on public.recorrencias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recorrencias_delete_own" on public.recorrencias;
create policy "recorrencias_delete_own" on public.recorrencias
  for delete using (auth.uid() = user_id);
