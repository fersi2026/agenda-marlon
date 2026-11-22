import { useCallback, useState } from 'react';

/**
 * Hook para gerenciar notificações (toasts) no sistema.
 * Fornece uma forma simples de exibir mensagens temporárias ao usuário.
 */
export function useNotificacao() {
  const [ ultimasNotificacoes, setUltimasNotificacoes ] = useState<
    Array<{ id: number; mensagem: string; tipo: 'sucesso' | 'erro' | 'aviso' }>
  >([]);

  const notificar = useCallback((mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'info') => {
    const id = Date.now();
    setUltimasNotificacoes((antigas) => {
      // Remover notificações antigas (manter apenas as 3 mais recentes)
      const filtradas = antigas.filter((n) => n.id < Date.now() - 5000);
      return [{ id, mensagem, tipo }, ...filtradas].slice(0, 3);
    });

    // Auto-remover após 5 segundos
    setTimeout(() => {
      setUltimasNotificacoes((antigas) => antigas.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const limparNotificacoes = useCallback(() => {
    setUltimasNotificacoes([]);
  }, []);

  return {
    ultimasNotificacoes,
    notificar,
    limparNotificacoes,
  };
}

/**
 * Componente de notificação (para ser usado no template)
 */
export type Notificacao = {
  id: number;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'aviso';
};

/**
 * Ordens de prioridade para tipos de notificação
 */
export const NOTIFICACAO_ORDENS: Record<'sucesso' | 'erro' | 'aviso', number> = {
  sucesso: 1,
  erro: 2,
  aviso: 3,
};