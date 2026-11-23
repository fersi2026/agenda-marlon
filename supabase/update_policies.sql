-- ============================================================================
-- Atualizar Policies RLS para Permitir Modo Anon (Offline/Local)
-- Isso permite que a anon key funcione sem login no modo desenvolvimento
-- ============================================================================

-- ============================================================================
-- Tabela: configuracoes_clinica
-- ============================================================================

drop policy if exists "config_select_own" on public.configuracoes_clinica;
create policy "config_select_own" on public.configuracoes_clinica
  for select using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "config_insert_own" on public.configuracoes_clinica;
create policy "config_insert_own" on public.configuracoes_clinica
  for insert with check (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "config_update_own" on public.configuracoes_clinica;
create policy "config_update_own" on public.configuracoes_clinica
  for update using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "config_delete_own" on public.configuracoes_clinica;
create policy "config_delete_own" on public.configuracoes_clinica
  for delete using (auth.uid() = user_id OR auth.uid() IS NULL);

-- ============================================================================
-- Tabela: pacientes
-- ============================================================================

drop policy if exists "pacientes_select_own" on public.pacientes;
create policy "pacientes_select_own" on public.pacientes
  for select using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "pacientes_insert_own" on public.pacientes;
create policy "pacientes_insert_own" on public.pacientes
  for insert with check (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "pacientes_update_own" on public.pacientes;
create policy "pacientes_update_own" on public.pacientes
  for update using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "pacientes_delete_own" on public.pacientes;
create policy "pacientes_delete_own" on public.pacientes
  for delete using (auth.uid() = user_id OR auth.uid() IS NULL);

-- ============================================================================
-- Tabela: agendamentos
-- ============================================================================

drop policy if exists "agendamentos_select_own" on public.agendamentos;
create policy "agendamentos_select_own" on public.agendamentos
  for select using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "agendamentos_insert_own" on public.agendamentos;
create policy "agendamentos_insert_own" on public.agendamentos
  for insert with check (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "agendamentos_update_own" on public.agendamentos;
create policy "agendamentos_update_own" on public.agendamentos
  for update using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "agendamentos_delete_own" on public.agendamentos;
create policy "agendamentos_delete_own" on public.agendamentos
  for delete using (auth.uid() = user_id OR auth.uid() IS NULL);

-- ============================================================================
-- Tabela: recorrencias
-- ============================================================================

drop policy if exists "recorrencias_select_own" on public.recorrencias;
create policy "recorrencias_select_own" on public.recorrencias
  for select using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "recorrencias_insert_own" on public.recorrencias;
create policy "recorrencias_insert_own" on public.recorrencias
  for insert with check (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "recorrencias_update_own" on public.recorrencias;
create policy "recorrencias_update_own" on public.recorrencias
  for update using (auth.uid() = user_id OR auth.uid() IS NULL);

drop policy if exists "recorrencias_delete_own" on public.recorrencias;
create policy "recorrencias_delete_own" on public.recorrencias
  for delete using (auth.uid() = user_id OR auth.uid() IS NULL);

-- ============================================================================
-- Pronto! Policies atualizadas para permitir modo anon.
-- auth.uid() IS NULL permite inserções/leituras via anon key (modo offline).
-- Quando usuário faz login, auth.uid() terá o ID e a política original se aplica.
-- ============================================================================

-- Verificar policies:
-- select polname, polcmd, polroles from pg_policy where polschema = 'public' order by polname;