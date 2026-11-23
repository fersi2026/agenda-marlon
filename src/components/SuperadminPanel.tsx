// ============================================================================
// Painel Superadmin — Gestão de usuários e senhas do consultório
//
// Visível apenas para usuários com role = 'superadmin' na tabela public.perfis.
// Todas as operações privilegiadas passam pela Edge Function "admin-users",
// que valida o JWT do chamador e usa a service_role key somente no servidor.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Power,
  RefreshCw,
  Crown,
  Mail,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface UsuarioGerenciado {
  id: string;
  email: string;
  nome: string | null;
  role: 'superadmin' | 'admin' | 'user';
  ativo: boolean;
  emailConfirmed: boolean;
  lastSignIn: string | null;
  createdAt: string;
}

const ROTULOS_PAPEL: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'Usuário',
};

const CORES_PAPEL: Record<string, string> = {
  superadmin: 'bg-amber-100 text-amber-900 border-amber-300',
  admin: 'bg-teal-100 text-teal-900 border-teal-300',
  user: 'bg-stone-100 text-stone-700 border-stone-300',
};

function formatarDataHora(iso: string | null): string {
  if (!iso) return 'Nunca';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

async function chamarAdminUsers<T = any>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // Tenta extrair a mensagem real devolvida pela função
    let mensagem = error.message;
    try {
      const contexto = (error as any)?.context;
      if (contexto && typeof contexto.json === 'function') {
        const payload = await contexto.json();
        if (payload?.error) mensagem = payload.error;
      }
    } catch {
      /* mantém a mensagem padrão */
    }
    throw new Error(mensagem || 'Falha ao chamar a função administrativa.');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const SuperadminPanel: React.FC = () => {
  const [verificando, setVerificando] = useState(true);
  const [ehSuperadmin, setEhSuperadmin] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioGerenciado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Formulário de criação
  const [mostrarCriacao, setMostrarCriacao] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoPapel, setNovoPapel] = useState<'user' | 'admin' | 'superadmin'>('user');
  const [criando, setCriando] = useState(false);

  // Reset de senha inline
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetSenha, setResetSenha] = useState('');
  const [resetSalvando, setResetSalvando] = useState(false);
  const [mostrarResetSenha, setMostrarResetSenha] = useState(false);

  // Confirmação de exclusão
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string | null>(null);
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState<string | null>(null);

  const exibirSucesso = useCallback((msg: string) => {
    setSucesso(msg);
    setTimeout(() => setSucesso(null), 3500);
  }, []);

  // Verifica o papel do usuário logado
  useEffect(() => {
    let ativo = true;

    async function verificarPapel() {
      if (!supabase) {
        if (ativo) setVerificando(false);
        return;
      }
      try {
        const { data: sessao } = await supabase.auth.getSession();
        const userId = sessao.session?.user?.id;
        if (!userId) {
          if (ativo) setVerificando(false);
          return;
        }
        const { data: perfil } = await supabase
          .from('perfis')
          .select('role, ativo')
          .eq('user_id', userId)
          .maybeSingle();

        if (!ativo) return;
        setEhSuperadmin(Boolean(perfil && perfil.role === 'superadmin' && perfil.ativo !== false));
      } catch {
        if (ativo) setEhSuperadmin(false);
      } finally {
        if (ativo) setVerificando(false);
      }
    }

    verificarPapel();
    return () => {
      ativo = false;
    };
  }, []);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await chamarAdminUsers<{ users: UsuarioGerenciado[] }>({ action: 'list' });
      setUsuarios(data.users ?? []);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar os usuários.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (ehSuperadmin) carregarUsuarios();
  }, [ehSuperadmin, carregarUsuarios]);

  if (verificando) return null;
  if (!ehSuperadmin) return null;

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!novoEmail.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setCriando(true);
    try {
      await chamarAdminUsers({
        action: 'create',
        email: novoEmail.trim().toLowerCase(),
        password: novaSenha,
        nome: novoNome.trim(),
        role: novoPapel,
      });
      setNovoEmail('');
      setNovoNome('');
      setNovaSenha('');
      setNovoPapel('user');
      setMostrarCriacao(false);
      exibirSucesso('Usuário criado com sucesso!');
      await carregarUsuarios();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível criar o usuário.');
    } finally {
      setCriando(false);
    }
  };

  const handleResetSenha = async (userId: string) => {
    setErro(null);
    if (resetSenha.length < 6) {
      setErro('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setResetSalvando(true);
    try {
      await chamarAdminUsers({ action: 'reset_password', userId, password: resetSenha });
      setResetUserId(null);
      setResetSenha('');
      setMostrarResetSenha(false);
      exibirSucesso('Senha redefinida com sucesso!');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível redefinir a senha.');
    } finally {
      setResetSalvando(false);
    }
  };

  const handleAlterarPapel = async (userId: string, role: string) => {
    setErro(null);
    setAcaoEmAndamentoId(userId);
    try {
      await chamarAdminUsers({ action: 'update_role', userId, role });
      exibirSucesso('Papel atualizado.');
      await carregarUsuarios();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível alterar o papel.');
    } finally {
      setAcaoEmAndamentoId(null);
    }
  };

  const handleAlternarAtivo = async (usuario: UsuarioGerenciado) => {
    setErro(null);
    setAcaoEmAndamentoId(usuario.id);
    try {
      await chamarAdminUsers({ action: 'toggle_active', userId: usuario.id, ativo: !usuario.ativo });
      exibirSucesso(usuario.ativo ? 'Usuário desativado.' : 'Usuário reativado.');
      await carregarUsuarios();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível alterar o status.');
    } finally {
      setAcaoEmAndamentoId(null);
    }
  };

  const handleExcluir = async (userId: string) => {
    setErro(null);
    setAcaoEmAndamentoId(userId);
    try {
      await chamarAdminUsers({ action: 'delete', userId });
      setConfirmarExclusaoId(null);
      exibirSucesso('Usuário excluído.');
      await carregarUsuarios();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível excluir o usuário.');
    } finally {
      setAcaoEmAndamentoId(null);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-amber-200 shadow-xs overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 sm:p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              Superadmin — Gestão de Usuários e Senhas
              <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                restrito
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              Crie acessos, redefina senhas, altere papéis e ative/desative contas do consultório
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={carregarUsuarios}
          disabled={carregando}
          className="px-3 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          title="Recarregar lista"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Feedback */}
        {sucesso && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}
        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <Users className="w-4 h-4 text-stone-400" />
            <span>
              <strong className="text-stone-900">{usuarios.length}</strong>{' '}
              {usuarios.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMostrarCriacao((v) => !v);
              setErro(null);
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            {mostrarCriacao ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>{mostrarCriacao ? 'Cancelar' : 'Novo Usuário'}</span>
          </button>
        </div>

        {/* Formulário de criação */}
        {mostrarCriacao && (
          <form
            onSubmit={handleCriarUsuario}
            className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3"
          >
            <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-amber-700" />
              Criar novo acesso
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Marlon Figueiredo"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Senha inicial *
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Papel
                </label>
                <select
                  value={novoPapel}
                  onChange={(e) => setNovoPapel(e.target.value as 'user' | 'admin' | 'superadmin')}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={criando}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {criando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>{criando ? 'Criando...' : 'Criar usuário'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Lista de usuários */}
        {carregando && usuarios.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-stone-500">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <span className="text-xs font-semibold">Carregando usuários...</span>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
            {usuarios.map((usuario) => {
              const emAndamento = acaoEmAndamentoId === usuario.id;
              const resetAberto = resetUserId === usuario.id;
              const excluindo = confirmarExclusaoId === usuario.id;

              return (
                <div key={usuario.id} className="bg-white">
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Identificação */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {usuario.nome || usuario.email.split('@')[0]}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${CORES_PAPEL[usuario.role] ?? CORES_PAPEL.user}`}
                        >
                          {ROTULOS_PAPEL[usuario.role] ?? usuario.role}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            usuario.ativo
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {usuario.ativo ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {usuario.email}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Último acesso: {formatarDataHora(usuario.lastSignIn)} · Criado em{' '}
                        {formatarDataHora(usuario.createdAt)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <select
                        value={usuario.role}
                        onChange={(e) => handleAlterarPapel(usuario.id, e.target.value)}
                        disabled={emAndamento}
                        className="px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-[11px] font-semibold text-stone-700 focus:ring-2 focus:ring-amber-600 focus:outline-hidden disabled:opacity-60"
                        title="Alterar papel"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setResetUserId(resetAberto ? null : usuario.id);
                          setResetSenha('');
                          setMostrarResetSenha(false);
                          setErro(null);
                        }}
                        className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Redefinir senha"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Senha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAlternarAtivo(usuario)}
                        disabled={emAndamento}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 border cursor-pointer disabled:opacity-60 ${
                          usuario.ativo
                            ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
                        }`}
                        title={usuario.ativo ? 'Desativar conta' : 'Reativar conta'}
                      >
                        {emAndamento ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        <span>{usuario.ativo ? 'Desativar' : 'Ativar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmarExclusaoId(excluindo ? null : usuario.id);
                          setErro(null);
                        }}
                        disabled={emAndamento}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Reset de senha inline */}
                  {resetAberto && (
                    <div className="px-3.5 pb-3.5">
                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            Nova senha para {usuario.email}
                          </label>
                          <div className="relative">
                            <input
                              type={mostrarResetSenha ? 'text' : 'password'}
                              minLength={6}
                              value={resetSenha}
                              onChange={(e) => setResetSenha(e.target.value)}
                              placeholder="Mínimo 6 caracteres"
                              className="w-full px-3 py-2 pr-9 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-700 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => setMostrarResetSenha((v) => !v)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                              tabIndex={-1}
                            >
                              {mostrarResetSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResetSenha(usuario.id)}
                          disabled={resetSalvando}
                          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                        >
                          {resetSalvando ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <KeyRound className="w-3.5 h-3.5" />
                          )}
                          <span>{resetSalvando ? 'Salvando...' : 'Redefinir'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirmação de exclusão */}
                  {excluindo && (
                    <div className="px-3.5 pb-3.5">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-rose-900">
                          Excluir permanentemente <strong>{usuario.email}</strong>? Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmarExclusaoId(null)}
                            className="px-3 py-1.5 bg-white border border-stone-300 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluir(usuario.id)}
                            disabled={emAndamento}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                          >
                            {emAndamento ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-stone-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          As senhas são gerenciadas com segurança pelo Supabase Auth. Você não pode alterar o seu próprio papel nem excluir a própria conta.
        </p>
      </div>
    </section>
  );
};
