// ============================================================================
// Painel Superadmin — CRUD completo de usuários do consultório
//
// Inserção: Nome Completo, e-mail, senha, status (Ativo/Desativado) e papel.
// Edição:   Nome Completo, e-mail, nova senha (opcional), status e papel.
// Exclusão: com confirmação.
//
// Visível apenas para usuários com role = 'superadmin' em public.perfis.
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
  RefreshCw,
  Crown,
  Mail,
  X,
  Pencil,
  Save,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type Papel = 'superadmin' | 'admin' | 'user';

interface UsuarioGerenciado {
  id: string;
  email: string;
  nome: string | null;
  role: Papel;
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

const campoClasse =
  'w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-600 focus:outline-hidden';
const rotuloClasse = 'block text-[11px] font-semibold text-stone-700 mb-1';

export const SuperadminPanel: React.FC = () => {
  const [verificando, setVerificando] = useState(true);
  const [ehSuperadmin, setEhSuperadmin] = useState(false);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioGerenciado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Inserção
  const [mostrarCriacao, setMostrarCriacao] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoAtivo, setNovoAtivo] = useState(true);
  const [novoPapel, setNovoPapel] = useState<Papel>('user');
  const [criando, setCriando] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);

  // Edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editPapel, setEditPapel] = useState<Papel>('user');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [mostrarEditSenha, setMostrarEditSenha] = useState(false);

  // Exclusão
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
        setMeuId(userId);
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

  const limparFormCriacao = () => {
    setNovoNome('');
    setNovoEmail('');
    setNovaSenha('');
    setNovoAtivo(true);
    setNovoPapel('user');
    setMostrarNovaSenha(false);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditSenha('');
    setMostrarEditSenha(false);
    setErro(null);
  };

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
        ativo: novoAtivo,
      });
      limparFormCriacao();
      setMostrarCriacao(false);
      exibirSucesso(`Usuário ${novoEmail.trim().toLowerCase()} criado com sucesso!`);
      await carregarUsuarios();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível criar o usuário.');
    } finally {
      setCriando(false);
    }
  };

  const abrirEdicao = (usuario: UsuarioGerenciado) => {
    setErro(null);
    setEditandoId(usuario.id);
    setEditNome(usuario.nome ?? '');
    setEditEmail(usuario.email);
    setEditSenha('');
    setEditAtivo(usuario.ativo);
    setEditPapel(usuario.role);
    setMostrarEditSenha(false);
  };

  const handleSalvarEdicao = async (usuario: UsuarioGerenciado) => {
    setErro(null);
    if (!editEmail.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (editSenha !== '' && editSenha.length < 6) {
      setErro('A nova senha deve ter no mínimo 6 caracteres (ou deixe em branco para manter).');
      return;
    }
    setSalvandoEdicao(true);
    try {
      await chamarAdminUsers({
        action: 'update_user',
        userId: usuario.id,
        nome: editNome.trim(),
        email: editEmail.trim().toLowerCase(),
        ativo: editAtivo,
        role: editPapel,
        ...(editSenha !== '' ? { password: editSenha } : {}),
      });
      cancelarEdicao();
      exibirSucesso('Usuário atualizado com sucesso!');
      await carregarUsuarios();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSalvandoEdicao(false);
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
              Superadmin — Gestão de Usuários
              <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                restrito
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              Crie, edite e exclua acessos do consultório (nome, e-mail, senha e status)
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
              if (mostrarCriacao) limparFormCriacao();
              setErro(null);
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            {mostrarCriacao ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>{mostrarCriacao ? 'Cancelar' : 'Novo Usuário'}</span>
          </button>
        </div>

        {/* Formulário de inserção */}
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
                <label className={rotuloClasse}>Nome Completo</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Marlon Figueiredo"
                  className={campoClasse}
                />
              </div>
              <div>
                <label className={rotuloClasse}>E-mail *</label>
                <input
                  type="email"
                  required
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className={campoClasse}
                />
              </div>
              <div>
                <label className={rotuloClasse}>Senha inicial *</label>
                <div className="relative">
                  <input
                    type={mostrarNovaSenha ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`${campoClasse} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNovaSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {mostrarNovaSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={rotuloClasse}>Status</label>
                <select
                  value={novoAtivo ? 'ativo' : 'desativado'}
                  onChange={(e) => setNovoAtivo(e.target.value === 'ativo')}
                  className={campoClasse}
                >
                  <option value="ativo">Ativo</option>
                  <option value="desativado">Desativado</option>
                </select>
              </div>
              <div>
                <label className={rotuloClasse}>Papel</label>
                <select
                  value={novoPapel}
                  onChange={(e) => setNovoPapel(e.target.value as Papel)}
                  className={campoClasse}
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
              const editando = editandoId === usuario.id;
              const excluindo = confirmarExclusaoId === usuario.id;
              const souEu = usuario.id === meuId;

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
                        {souEu && (
                          <span className="text-[10px] font-semibold text-stone-500">(você)</span>
                        )}
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
                      <button
                        type="button"
                        onClick={() => (editando ? cancelarEdicao() : abrirEdicao(usuario))}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 border cursor-pointer ${
                          editando
                            ? 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700'
                            : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-900'
                        }`}
                        title="Editar usuário"
                      >
                        {editando ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        <span>{editando ? 'Fechar' : 'Editar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmarExclusaoId(excluindo ? null : usuario.id);
                          setErro(null);
                        }}
                        disabled={emAndamento || souEu}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        title={souEu ? 'Você não pode excluir a própria conta' : 'Excluir usuário'}
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

                  {/* Formulário de edição */}
                  {editando && (
                    <div className="px-3.5 pb-3.5">
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5 text-teal-700" />
                          Editar usuário
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={rotuloClasse}>Nome Completo</label>
                            <input
                              type="text"
                              value={editNome}
                              onChange={(e) => setEditNome(e.target.value)}
                              placeholder="Nome completo"
                              className={campoClasse}
                            />
                          </div>
                          <div>
                            <label className={rotuloClasse}>E-mail</label>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="email@exemplo.com"
                              className={campoClasse}
                            />
                          </div>
                          <div>
                            <label className={rotuloClasse}>Nova senha (opcional)</label>
                            <div className="relative">
                              <input
                                type={mostrarEditSenha ? 'text' : 'password'}
                                value={editSenha}
                                onChange={(e) => setEditSenha(e.target.value)}
                                placeholder="Deixe em branco para manter"
                                className={`${campoClasse} pr-9`}
                              />
                              <button
                                type="button"
                                onClick={() => setMostrarEditSenha((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                                tabIndex={-1}
                              >
                                {mostrarEditSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className={rotuloClasse}>Status</label>
                            <select
                              value={editAtivo ? 'ativo' : 'desativado'}
                              onChange={(e) => setEditAtivo(e.target.value === 'ativo')}
                              disabled={souEu}
                              className={`${campoClasse} disabled:bg-stone-100 disabled:text-stone-500`}
                              title={souEu ? 'Você não pode desativar a própria conta' : undefined}
                            >
                              <option value="ativo">Ativo</option>
                              <option value="desativado">Desativado</option>
                            </select>
                          </div>
                          <div>
                            <label className={rotuloClasse}>Papel</label>
                            <select
                              value={editPapel}
                              onChange={(e) => setEditPapel(e.target.value as Papel)}
                              disabled={souEu}
                              className={`${campoClasse} disabled:bg-stone-100 disabled:text-stone-500`}
                              title={souEu ? 'Você não pode alterar o próprio papel' : undefined}
                            >
                              <option value="user">Usuário</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Superadmin</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelarEdicao}
                            className="px-3.5 py-2 bg-white border border-stone-300 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSalvarEdicao(usuario)}
                            disabled={salvandoEdicao}
                            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                          >
                            {salvandoEdicao ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>{salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}</span>
                          </button>
                        </div>
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
          As senhas são gerenciadas com segurança pelo Supabase Auth. Você não pode alterar o seu próprio papel, desativar ou excluir a própria conta.
        </p>
      </div>
    </section>
  );
};
