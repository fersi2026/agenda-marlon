import React from 'react';
import { 
  Calendar, 
  CalendarDays, 
  Users, 
  Plus, 
  Settings,
  LogOut
} from 'lucide-react';
import { ConfiguracaoPrecos } from '../types';

export type AbaNavegacao = 'diaria' | 'semanal' | 'mensal' | 'pacientes' | 'configuracoes';

interface HeaderProps {
  abaAtiva: AbaNavegacao;
  onAbaChange: (aba: AbaNavegacao) => void;
  onNovoAgendamento: () => void;
  onResetarDados?: () => void;
  configPrecos?: ConfiguracaoPrecos;
  onAbrirConfigPrecos?: () => void;
  onAbrirModalInstalar?: () => void;
  onAbrirModalBanco?: () => void;
  isBancoZerado?: boolean;
  isInstallable?: boolean;
  isInstalled?: boolean;
  userEmail?: string | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  abaAtiva,
  onAbaChange,
  onNovoAgendamento,
  userEmail,
  onLogout,
}) => {
  return (
    <header id="main-header" className="bg-stone-900 text-white shadow-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 sm:py-3.5 gap-2">
          {/* Logo & Clinical identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-950/60 flex items-center justify-center shadow-sm border border-teal-500/40 shrink-0 overflow-hidden">
              <img 
                src="/icon.svg" 
                alt="Logo Psicólogo Marlon Figueiredo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                Marlon Figueiredo • Psicologia Clínica
              </h1>
              <p className="text-[11px] sm:text-xs text-teal-300 truncate">
                Psicólogo • Agenda Clínica & Prontuários
              </p>
            </div>
          </div>

          {/* Action CTAs - Novo Agendamento + Sair (quando conectado ao Supabase) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-novo-agendamento-topo"
              type="button"
              onClick={onNovoAgendamento}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title={userEmail ? `Sair (${userEmail})` : 'Sair da conta'}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition-colors cursor-pointer min-h-[38px]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar (Desktop / Tablet) */}
        <div className="hidden md:flex items-center space-x-1 overflow-x-auto pt-1 pb-2.5 border-t border-stone-800">
          <button
            type="button"
            onClick={() => onAbaChange('diaria')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              abaAtiva === 'diaria'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Visão Diária</span>
          </button>

          <button
            type="button"
            onClick={() => onAbaChange('semanal')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              abaAtiva === 'semanal'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Visão Semanal</span>
          </button>

          <button
            type="button"
            onClick={() => onAbaChange('mensal')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              abaAtiva === 'mensal'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Visão Mensal</span>
          </button>

          <button
            type="button"
            onClick={() => onAbaChange('pacientes')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              abaAtiva === 'pacientes'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pacientes & Prontuários</span>
          </button>

          <button
            type="button"
            onClick={() => onAbaChange('configuracoes')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              abaAtiva === 'configuracoes'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>
        </div>
      </div>
    </header>
  );
};
