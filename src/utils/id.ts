/**
 * Geradores de IDs para o sistema de agenda psicológica.
 * Todos os IDs são gerados como strings UUID v4 formatadas.
 */

export const idPaciente = (): string => {
  return 'patient_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const idAgendamento = (): string => {
  return 'agenda_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const idPacote = (): string => {
  return 'pacote_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const idRecorrencia = (): string => {
  return 'recorrencia_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

/**
 * Gerar um ID único para sessão de criptografia
 */
export const idChaveSessao = (userId?: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `sessao_${userId ?? 'local'}_${timestamp}_${random}`;
};