import { limparDadosClinicos } from '../backup';

describe('backup', () => {
  describe('limparDadosClinicos', () => {
    it('deve remover chaves de localStorage relacionadas à agenda', () => {
      // Simular dados no localStorage
      const chaveTeste = 'agenda_psicologia_v2_dados_teste';
      localStorage.setItem(chaveTeste, JSON.stringify({ nome: 'Teste' }));
      
      // Outras chaves não relacionadas
      localStorage.setItem('outro_dado', 'valor');
      
      // Chamar a função
      limparDadosClinicos();
      
      // Verificar se a chave da agenda foi removida
      expect(localStorage.getItem(chaveTeste)).toBeNull();
      
      // Verificar se outras chaves foram preservadas
      expect(localStorage.getItem('outro_dado')).not.toBeNull();
      
      // Limpeza
      localStorage.removeItem('outro_dado');
    });

    it('deve funcionar sem erro quando não há chaves da agenda', () => {
      // Não fazer nada de especial, apenas garantir que não quebra
      expect(() => limparDadosClinicos()).not.toThrow();
    });
  });
});