-- ============================================================================
-- Schema SQL para Supabase (PostgreSQL + Row Level Security)
-- Sistema: Psicólogo Marlon Figueiredo • Psicologia Clínica
-- Versão: v2 - Clinical Psychology Agenda
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
-- 5. Tabela de Perfis (papéis de acesso: superadmin / admin / user)
-- Usada pelo painel Superadmin para gerenciar usuários e senhas.
-- ============================================================================
create table if not exists public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  role text not null default 'user' check (role in ('superadmin','admin','user')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "perfis_select_own" on public.perfis;
create policy "perfis_select_own" on public.perfis for select using (auth.uid() = user_id);

drop policy if exists "perfis_update_own" on public.perfis;
create policy "perfis_update_own" on public.perfis for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger: cria o perfil automaticamente para cada novo usuário do Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (user_id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    'user'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed: cria perfis para usuários já existentes (idempotente)
insert into public.perfis (user_id, email, nome, role)
select id, email, split_part(email,'@',1), 'user'
from auth.users
on conflict (user_id) do nothing;

-- Promova o seu usuário principal a superadmin (ajuste o e-mail):
-- update public.perfis set role = 'superadmin' where email = 'seu-email@exemplo.com';

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
create policy "config_select_own" on public.configuracoes_clinica for select using (auth.uid() = user_id);
drop policy if exists "config_insert_own" on public.configuracoes_clinica;
create policy "config_insert_own" on public.configuracoes_clinica for insert with check (auth.uid() = user_id);
drop policy if exists "config_update_own" on public.configuracoes_clinica;
create policy "config_update_own" on public.configuracoes_clinica for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "config_delete_own" on public.configuracoes_clinica;
create policy "config_delete_own" on public.configuracoes_clinica for delete using (auth.uid() = user_id);

-- Políticas para pacientes
drop policy if exists "pacientes_select_own" on public.pacientes;
create policy "pacientes_select_own" on public.pacientes for select using (auth.uid() = user_id);
drop policy if exists "pacientes_insert_own" on public.pacientes;
create policy "pacientes_insert_own" on public.pacientes for insert with check (auth.uid() = user_id);
drop policy if exists "pacientes_update_own" on public.pacientes;
create policy "pacientes_update_own" on public.pacientes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "pacientes_delete_own" on public.pacientes;
create policy "pacientes_delete_own" on public.pacientes for delete using (auth.uid() = user_id);

-- Políticas para agendamentos
drop policy if exists "agendamentos_select_own" on public.agendamentos;
create policy "agendamentos_select_own" on public.agendamentos for select using (auth.uid() = user_id);
drop policy if exists "agendamentos_insert_own" on public.agendamentos;
create policy "agendamentos_insert_own" on public.agendamentos for insert with check (auth.uid() = user_id);
drop policy if exists "agendamentos_update_own" on public.agendamentos;
create policy "agendamentos_update_own" on public.agendamentos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "agendamentos_delete_own" on public.agendamentos;
create policy "agendamentos_delete_own" on public.agendamentos for delete using (auth.uid() = user_id);

-- Políticas para recorrencias
drop policy if exists "recorrencias_select_own" on public.recorrencias;
create policy "recorrencias_select_own" on public.recorrencias for select using (auth.uid() = user_id);
drop policy if exists "recorrencias_insert_own" on public.recorrencias;
create policy "recorrencias_insert_own" on public.recorrencias for insert with check (auth.uid() = user_id);
drop policy if exists "recorrencias_update_own" on public.recorrencias;
create policy "recorrencias_update_own" on public.recorrencias for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "recorrencias_delete_own" on public.recorrencias;
create policy "recorrencias_delete_own" on public.recorrencias for delete using (auth.uid() = user_id);

-- ============================================================================
-- PRIVILÉGIOS DE TABELA (obrigatório!)
-- Sem estes GRANTs, os papéis "authenticated" e "anon" recebem
-- "permission denied for table ..." mesmo com as policies RLS corretas.
-- ============================================================================

-- Usuário logado (Supabase Auth) — modo nuvem
grant select, insert, update, delete on public.configuracoes_clinica to authenticated;
grant select, insert, update, delete on public.pacientes to authenticated;
grant select, insert, update, delete on public.agendamentos to authenticated;
grant select, insert, update, delete on public.recorrencias to authenticated;
grant select, insert, update, delete on public.perfis to authenticated;

-- Usuário anônimo (anon key) — modo local/offline
grant select, insert, update, delete on public.configuracoes_clinica to anon;
grant select, insert, update, delete on public.pacientes to anon;
grant select, insert, update, delete on public.agendamentos to anon;
grant select, insert, update, delete on public.recorrencias to anon;
grant select on public.perfis to anon;

-- Service role — usada apenas pela Edge Function admin-users no servidor
grant all on public.configuracoes_clinica to service_role;
grant all on public.pacientes to service_role;
grant all on public.agendamentos to service_role;
grant all on public.recorrencias to service_role;
grant all on public.perfis to service_role;

-- Recarregar o cache de schema do PostgREST
notify pgrst, 'reload schema';

-- ============================================================================
-- Schema v2 aplicado com sucesso.
-- Tabelas criadas: configuracoes_clinica, pacientes, agendamentos, recorrencias
-- Policies RLS: 16 policies ativas (select/insert/update/delete para cada tabela)
-- Privilégios: authenticated + anon com SELECT/INSERT/UPDATE/DELETE
-- ============================================================================

-- Tabelas verificadas:
-- select table_name from information_schema.tables where table_schema = 'public' order by table_name;