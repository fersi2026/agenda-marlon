import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

/**
 * Hook para tornar modais acessíveis.
 * Gerencia foco, fechamento por ESC e detecção de clique fora.
 */
export function useModalA11y(
  options: {
    /** Elemento de referência do modal aberto */
    modalRef: React.RefObject<HTMLElement>;
    /** Elemento de referência do botão que abriu o modal */
    triggerRef?: React.RefObject<HTMLElement>;
    /** Função chamada quando o modal for fechado */
    onClose: () => void;
    /** Permitir fechamento clicando fora do modal */
    allowOutsideClick?: boolean;
    /** Permitir fechamento pressionando ESC */
    allowEscKey?: boolean;
  },
): {
  /** Ref para o overlay (fundo escuro atrás do modal) */
  overlayRef: React.RefObject<HTMLDivElement>;
  /** Handler para keydown (deve ser anexado ao documento ou elemento pai) */
  handleKeyDown: (e: KeyboardEvent) => void;
  /** Handler para mouse down (deve ser anexado ao documento) */
  handleMouseDown: (e: MouseEvent) => void;
  /** Tornar o conteúdo do modal focável */
  makeFocusable: (element: HTMLElement) => void;
  /** Restaurar foco ao elemento trigger após fechar */
  restoreFocus: () => void;
} {
  const {
    modalRef,
    triggerRef,
    onClose,
    allowOutsideClick = true,
    allowEscKey = true,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const focusedElementRef = useRef<HTMLElement>(null);

  // Efeito para abrir/fechar modal
  useEffect(() => {
    if (isOpen) {
      // Salvar elemento focado antes de abrir o modal
      focusedElementRef.current = document.activeElement as HTMLElement;
      setIsOpen(true);
      // Movimentar foco para o modal
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector(
          '[autofocus], button, [href], input, select, textarea,[tabindex]:not([tabindex="-1"])',
        );
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    } else {
      setIsOpen(false);
      // Restaurar foco ao elemento que abriu o modal
      if (triggerRef?.current && focusedElementRef.current) {
        focusedElementRef.current.focus();
      }
    }
  }, [isOpen, modalRef, triggerRef]);

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen || !allowEscKey) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, allowEscKey, onClose]);

  // Fechar com clique fora
  useEffect(() => {
    if (!isOpen || !allowOutsideClick) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, allowOutsideClick, modalRef, onClose]);

  // Tornar elemento focável (remover tabindex -1)
  const makeFocusable = useCallback((element: HTMLElement) => {
    if (element) {
      element.tabIndex = 0;
      element.setAttribute('role', 'button');
    }
  }, []);

  // Restaurar foco
  const restoreFocus = useCallback(() => {
    if (focusedElementRef.current) {
      focusedElementRef.current.focus();
    }
  }, []);

  return {
    overlayRef: modalRef ? modalRef : undefined,
    handleKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowEscKey) {
        setIsOpen(false);
        onClose();
      }
    },
    handleMouseDown: (e: MouseEvent) => {
      if (allowOutsideClick && modalRef?.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
        onClose();
      }
    },
    makeFocusable,
    restoreFocus,
  };
}

/**
 * Hook auxiliar para modais simples
 * Retorna estado e handlers de abrir/fechar
 */
export function useModalSimple(
  initialOpen = false,
): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const [open, setOpen] = useState(initialOpen);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);
  const openModal = () => setOpen(true);

  return { isOpen: open, open: openModal, close, toggle };
}