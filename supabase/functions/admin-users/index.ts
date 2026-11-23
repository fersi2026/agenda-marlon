// ============================================================================
// Edge Function: admin-users
// Gerenciamento de usuários e senhas do consultório (somente superadmin)
//
// Ações: list | create | update_user | reset_password | update_role | toggle_active | delete
//
// Segurança:
//  - Verifica o JWT do chamador (Authorization: Bearer <access_token>)
//  - Confere na tabela public.perfis se o chamador é superadmin
//  - Usa a service_role key (injetada pelo runtime) apenas no servidor
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Token ausente.' }, 401);

    // Cliente com o JWT do chamador (para identificar quem está chamando)
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Sessão inválida.' }, 401);

    // Cliente admin (service_role) — só usado no servidor
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verificar papel do chamador
    const { data: perfil, error: perfilErr } = await admin
      .from('perfis')
      .select('role, ativo')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (perfilErr) return json({ error: perfilErr.message }, 500);
    if (!perfil || perfil.role !== 'superadmin' || !perfil.ativo) {
      return json({ error: 'Acesso restrito ao superadmin.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    // ---------------------------------------------------------------- list
    if (action === 'list') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      if (error) throw error;

      const { data: perfis } = await admin.from('perfis').select('*');
      const mapa = new Map((perfis ?? []).map((p: any) => [p.user_id, p]));

      const users = data.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        nome: mapa.get(u.id)?.nome ?? null,
        role: mapa.get(u.id)?.role ?? 'user',
        ativo: mapa.get(u.id)?.ativo ?? true,
        emailConfirmed: Boolean(u.email_confirmed_at),
        lastSignIn: u.last_sign_in_at ?? null,
        createdAt: u.created_at,
      }));

      return json({ users });
    }

    // -------------------------------------------------------------- create
    if (action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const nome = String(body.nome ?? '').trim();
      const role = ['superadmin', 'admin', 'user'].includes(body.role) ? body.role : 'user';
      const ativo = body.ativo !== undefined ? Boolean(body.ativo) : true;

      if (!email.includes('@')) return json({ error: 'E-mail inválido.' }, 400);
      if (password.length < 6) return json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome: nome || email.split('@')[0] },
      });
      if (error) return json({ error: error.message }, 400);

      // Se já nascer desativado, aplica banimento de login
      if (!ativo) {
        await admin.auth.admin.updateUserById(data.user.id, { ban_duration: '876000h' });
      }

      await admin.from('perfis').upsert(
        {
          user_id: data.user.id,
          email,
          nome: nome || email.split('@')[0],
          role,
          ativo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      return json({ ok: true, user: { id: data.user.id, email: data.user.email } });
    }

    // --------------------------------------------------------- update_user
    // Edição completa: nome, e-mail, senha (opcional), status ativo e papel
    if (action === 'update_user') {
      const userId = String(body.userId ?? '');
      if (!userId) return json({ error: 'userId obrigatório.' }, 400);

      const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
      const nome = body.nome !== undefined ? String(body.nome).trim() : undefined;
      const password = body.password !== undefined ? String(body.password) : undefined;
      const ativo = body.ativo !== undefined ? Boolean(body.ativo) : undefined;
      const role = body.role !== undefined ? String(body.role) : undefined;

      if (email !== undefined && !email.includes('@')) return json({ error: 'E-mail inválido.' }, 400);
      if (password !== undefined && password !== '' && password.length < 6) {
        return json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, 400);
      }
      if (role !== undefined && !['superadmin', 'admin', 'user'].includes(role)) {
        return json({ error: 'Papel inválido.' }, 400);
      }

      if (userId === userData.user.id) {
        if (role !== undefined) return json({ error: 'Você não pode alterar o seu próprio papel.' }, 400);
        if (ativo === false) return json({ error: 'Você não pode desativar a própria conta.' }, 400);
      }

      // Atualiza dados do Auth (e-mail, senha, metadados e banimento)
      const authUpdate: Record<string, unknown> = {};
      if (email !== undefined && email) {
        authUpdate.email = email;
        authUpdate.email_confirm = true;
      }
      if (password !== undefined && password !== '') authUpdate.password = password;
      if (nome !== undefined) authUpdate.user_metadata = { nome: nome || email?.split('@')[0] || userId };
      if (ativo !== undefined) authUpdate.ban_duration = ativo ? 'none' : '876000h';

      if (Object.keys(authUpdate).length > 0) {
        const { error } = await admin.auth.admin.updateUserById(userId, authUpdate);
        if (error) return json({ error: error.message }, 400);
      }

      // Atualiza a tabela de perfis
      const perfilUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (email !== undefined && email) perfilUpdate.email = email;
      if (nome !== undefined) perfilUpdate.nome = nome || null;
      if (ativo !== undefined) perfilUpdate.ativo = ativo;
      if (role !== undefined) perfilUpdate.role = role;

      const { error: perfilError } = await admin
        .from('perfis')
        .update(perfilUpdate)
        .eq('user_id', userId);
      if (perfilError) return json({ error: perfilError.message }, 400);

      return json({ ok: true });
    }

    // ------------------------------------------------------ reset_password
    if (action === 'reset_password') {
      const userId = String(body.userId ?? '');
      const password = String(body.password ?? '');
      if (!userId) return json({ error: 'userId obrigatório.' }, 400);
      if (password.length < 6) return json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, 400);

      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);

      return json({ ok: true });
    }

    // -------------------------------------------------------- update_role
    if (action === 'update_role') {
      const userId = String(body.userId ?? '');
      const role = String(body.role ?? '');
      if (!userId) return json({ error: 'userId obrigatório.' }, 400);
      if (!['superadmin', 'admin', 'user'].includes(role)) return json({ error: 'Papel inválido.' }, 400);
      if (userId === userData.user.id) return json({ error: 'Você não pode alterar o seu próprio papel.' }, 400);

      const { error } = await admin
        .from('perfis')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) return json({ error: error.message }, 400);

      return json({ ok: true });
    }

    // -------------------------------------------------------- toggle_active
    if (action === 'toggle_active') {
      const userId = String(body.userId ?? '');
      const ativo = Boolean(body.ativo);
      if (!userId) return json({ error: 'userId obrigatório.' }, 400);
      if (userId === userData.user.id) return json({ error: 'Você não pode desativar a própria conta.' }, 400);

      // ban_duration: 'none' remove o banimento; valor longo desativa o login
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: ativo ? 'none' : '876000h',
      });
      if (error) return json({ error: error.message }, 400);

      await admin
        .from('perfis')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      return json({ ok: true });
    }

    // -------------------------------------------------------------- delete
    if (action === 'delete') {
      const userId = String(body.userId ?? '');
      if (!userId) return json({ error: 'userId obrigatório.' }, 400);
      if (userId === userData.user.id) return json({ error: 'Você não pode excluir a própria conta.' }, 400);

      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);

      return json({ ok: true });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Erro interno.' }, 500);
  }
});
