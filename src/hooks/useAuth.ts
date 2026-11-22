import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { definirChaveSessao } from '../lib/crypto';
import { encerrarSessaoLocal } from '../utils/localAuth';

export type ModoPersistencia = 'local' | 'nuvem';

export interface UseAuthRetorno {
  configurado: boolean;
  session: Session | null;
  usuarioId?: string;
  modo: ModoPersistencia;
  autenticado: boolean;
  email: string | null;
  authLoading: boolean;
  entrarLocal: (login: string) => void;
  sair: () => Promise<void>;
}

export function useAuth(): UseAuthRetorno {
  const configurado = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(configurado);
  const [localUserLogin, setLocalUserLogin] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoPersistencia>('local');

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    // Escutar mudanças de sessão
    const { data: { session } } = supabase.auth.getSession();
    setSession(session);
    setAuthLoading(false);

    if (session) {
      setModo('nuvem');
      setLocalUserLogin(session.user.email ?? null);
    } else {
      setModo('local');
    }
  }, [supabase]);

  // Efeito para persistir login local quando há mudança de sessão
  useEffect(() => {
    if (session?.user?.id) {
      definirChaveSessao(session.user.id);
      setLocalUserLogin(session.user.email ?? '');
    }
  }, [session]);

  const entrarLocal = useCallback(async (login: string) => {
    setLocalUserLogin(login);
    definirChaveSessao(login);
    setModo('local');
    // Salvar indicador de login local
    await salvar('local_user_login', login);
  }, []);

  const sair = useCallback(async () => {
    try {
      await encerrarSessaoLocal();
    } catch (e) {
      console.error('Erro ao encerrar sessão local:', e);
    }

    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }

    setSession(null);
    setLocalUserLogin(null);
    setModo('local');
    await salvar('local_user_login', null);
  }, [supabase]);

  // Determinar se há usuário autenticado
  const autenticado = useMemo(() => {
    if (modo === 'nuvem') return !!session?.access_token;
    if (modo === 'local') return !!localUserLogin;
    return false;
  }, [mode, session, localUserLogin]);

  return {
    configurado,
    session,
    usuarioId: session?.user?.id,
    modo,
    autenticado,
    email: session?.user?.email ?? localUserLogin ?? null,
    authLoading,
    entrarLocal,
    sair,
  };
}

// Helper: verificar se Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!supabase;
}