import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  clearLocalAuthCredentials,
  getLocalAuthRecord,
  setupLocalAuthCredentials,
  verifyLocalAuthCredentials,
} from '../utils/localAuth';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

interface AuthGateProps {
  onLocalAuthSuccess?: (loginDisplay: string) => void;
  onResetLocalAllData?: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onLocalAuthSuccess,
  onResetLocalAllData,
}) => {
  const supabaseConfigured = isSupabaseConfigured();
  const [localRecord, setLocalRecord] = useState(() =>
    supabaseConfigured ? null : getLocalAuthRecord()
  );

  const [modo, setModo] = useState<'login' | 'cadastro' | 'recuperar' | 'reset_local'>(() => {
    if (supabaseConfigured) return 'login';
    return getLocalAuthRecord() ? 'login' : 'cadastro';
  });

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      const rec = getLocalAuthRecord();
      setLocalRecord(rec);
      if (!rec) {
        setModo('cadastro');
      }
    }
  }, [supabaseConfigured]);

  const traduzirErro = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'Login ou senha incorretos. Verifique seus dados e tente novamente.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Confirme seu e-mail através do link enviado antes de acessar.';
    }
    if (lower.includes('user already registered')) {
      return 'Este e-mail já está cadastrado. Faça login para entrar.';
    }
    if (lower.includes('password should be at least')) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    // =========================================================================
    // MODO NUVEM (SUPABASE AUTH)
    // =========================================================================
    if (supabaseConfigured && supabase) {
      const emailLimpo = loginInput.trim();
      if (!emailLimpo || !emailLimpo.includes('@')) {
        setErro('Informe um endereço de e-mail válido.');
        return;
      }

      if (modo !== 'recuperar' && password.length < 6) {
        setErro('A senha precisa ter pelo menos 6 caracteres.');
        return;
      }

      if (modo === 'cadastro' && password !== confirmPassword) {
        setErro('A confirmação de senha não confere.');
        return;
      }

      setCarregando(true);
      try {
        if (modo === 'login') {
          const { error } = await supabase.auth.signInWithPassword({
            email: emailLimpo,
            password,
          });
          if (error) throw error;
        } else if (modo === 'cadastro') {
          const { data, error } = await supabase.auth.signUp({
            email: emailLimpo,
            password,
          });
          if (error) throw error;
          if (!data.session) {
            setSucesso(
              'Conta criada! Verifique sua caixa de entrada para confirmar o e-mail e depois faça login.'
            );
            setModo('login');
          }
        } else {
          const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
            redirectTo: window.location.origin,
          });
          if (error) throw error;
          setSucesso('Enviamos um link de redefinição de senha para o seu e-mail.');
          setModo('login');
        }
      } catch (err: any) {
        setErro(traduzirErro(err?.message || 'Não foi possível autenticar.'));
      } finally {
        setCarregando(false);
      }
      return;
    }

    // =========================================================================
    // MODO LOCAL (PROTEÇÃO DE ACESSO NO APARELHO COM PBKDF2)
    // =========================================================================
    const loginLimpo = loginInput.trim();
    if (modo === 'cadastro') {
      if (loginLimpo.length < 3) {
        setErro('Informe um login ou e-mail com pelo menos 3 caracteres.');
        return;
      }
      if (password.length < 6) {
        setErro('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErro('As senhas digitadas não conferem.');
        return;
      }

      setCarregando(true);
      try {
        const rec = await setupLocalAuthCredentials(loginLimpo, password);
        setLocalRecord(rec);
        onLocalAuthSuccess?.(rec.loginDisplay);
      } catch (err: any) {
        setErro(err?.message || 'Erro ao configurar login e senha.');
      } finally {
        setCarregando(false);
      }
      return;
    }

    if (modo === 'login') {
      if (!loginLimpo || !password) {
        setErro('Preencha o login e a senha.');
        return;
      }

      setCarregando(true);
      try {
        const verified = await verifyLocalAuthCredentials(loginLimpo, password);
        if (!verified) {
          setErro('Login ou senha incorretos.');
          return;
        }
        onLocalAuthSuccess?.(verified.loginDisplay);
      } catch (err: any) {
        setErro(err?.message || 'Não foi possível validar suas credenciais.');
      } finally {
        setCarregando(false);
      }
    }
  };

  const handleConfirmarResetLocal = () => {
    clearLocalAuthCredentials();
    onResetLocalAllData?.();
    setLocalRecord(null);
    setLoginInput('');
    setPassword('');
    setConfirmPassword('');
    setErro(null);
    setSucesso('Acesso e dados locais redefinidos. Crie seu novo login e senha abaixo.');
    setModo('cadastro');
  };

  const isLocalSetup = !supabaseConfigured && modo === 'cadastro';

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        {/* Cabeçalho Clínico */}
        <div className="bg-stone-900 text-white px-6 py-6 flex items-center gap-3.5 border-b border-stone-800">
          <div className="w-12 h-12 rounded-xl bg-teal-950/60 border border-teal-500/40 shrink-0 overflow-hidden shadow-sm">
            <img
              src="/icon.svg"
              alt="Logo Psicólogo Marlon Figueiredo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-white truncate">
              Marlon Figueiredo • Psicologia Clínica
            </h1>
            <p className="text-xs text-teal-300 truncate">
              Acesso Restrito ao Consultório & Prontuários
            </p>
          </div>
        </div>

        {/* Tela de confirmação para redefinir acesso local */}
        {!supabaseConfigured && modo === 'reset_local' ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-800">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
              <h2 className="text-base font-bold text-stone-900">Redefinir Acesso Local</h2>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Para proteger o sigilo dos prontuários armazenados neste dispositivo, a redefinição de senha no modo local remove os dados locais salvos neste navegador e permite criar um novo login e senha.
            </p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              Se você possui pacientes salvos e exportou um backup JSON anteriormente, poderá restaurá-lo após entrar.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setErro(null);
                  setModo('login');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarResetLocal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-xs transition-colors cursor-pointer"
              >
                Redefinir Acesso e Criar Novo Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-stone-900">
                  {modo === 'login'
                    ? 'Entrar no Sistema'
                    : isLocalSetup
                    ? 'Configurar Login e Senha'
                    : modo === 'cadastro'
                    ? 'Criar Conta Profissional'
                    : 'Recuperar Senha'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    supabaseConfigured
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-teal-50 text-teal-800 border-teal-200'
                  }`}
                >
                  {supabaseConfigured ? 'Nuvem Supabase' : 'Acesso Local'}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {modo === 'login'
                  ? supabaseConfigured
                    ? 'Digite seu e-mail e senha para acessar sua agenda e prontuários.'
                    : `Informe o login (${localRecord?.loginDisplay || 'cadastrado'}) e a senha para desbloquear.`
                  : isLocalSetup
                  ? 'Defina um login e uma senha para proteger o acesso aos dados clínicos neste dispositivo.'
                  : modo === 'cadastro'
                  ? 'Cadastre seu e-mail profissional para sincronizar sua clínica na nuvem.'
                  : 'Informe seu e-mail para receber o link de redefinição.'}
              </p>
            </div>

            {erro && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            {sucesso && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{sucesso}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {supabaseConfigured ? 'E-mail Profissional' : 'Login ou E-mail'}
              </label>
              <div className="relative">
                {supabaseConfigured ? (
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                ) : (
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                )}
                <input
                  type={supabaseConfigured ? 'email' : 'text'}
                  required
                  autoComplete="username"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder={
                    supabaseConfigured
                      ? 'marlon@consultorio.com.br'
                      : 'Ex: marlon.figueiredo ou seu e-mail'
                  }
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
            </div>

            {modo !== 'recuperar' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-2.5 top-2.5 p-0.5 text-stone-400 hover:text-stone-700"
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {modo === 'cadastro' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : modo === 'login' ? (
                <span>Entrar no Sistema</span>
              ) : isLocalSetup ? (
                <span>Salvar Login e Entrar</span>
              ) : modo === 'cadastro' ? (
                <span>Criar Conta Segura</span>
              ) : (
                <span>Enviar Link de Recuperação</span>
              )}
            </button>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              {supabaseConfigured ? (
                modo === 'login' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setErro(null);
                        setSucesso(null);
                        setModo('cadastro');
                      }}
                      className="text-teal-700 hover:underline font-semibold cursor-pointer"
                    >
                      Criar primeira conta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErro(null);
                        setSucesso(null);
                        setModo('recuperar');
                      }}
                      className="text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
                    >
                      Esqueci a senha
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setErro(null);
                      setSucesso(null);
                      setModo('login');
                    }}
                    className="text-teal-700 hover:underline font-semibold cursor-pointer"
                  >
                    ← Voltar para o login
                  </button>
                )
              ) : modo === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setErro(null);
                    setSucesso(null);
                    setModo('reset_local');
                  }}
                  className="text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
                >
                  Esqueci minha senha / Redefinir acesso
                </button>
              ) : (
                <span className="text-[11px] text-stone-400">
                  Primeiro acesso: defina seu login e senha de proteção.
                </span>
              )}
            </div>
          </form>
        )}

        {/* Rodapé de Sigilo */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex items-center gap-2 text-[11px] text-stone-500">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            {supabaseConfigured
              ? 'Protegido por autenticação e Row Level Security (Supabase).'
              : 'Senha protegida por hash criptográfico PBKDF2 no dispositivo.'}
          </span>
        </div>
      </div>
    </div>
  );
};
