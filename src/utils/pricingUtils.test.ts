import { CONFIG_PRECOS_PADRAO, formatarMoeda } from '../pricingUtils';

describe('pricingUtils', () => {
  describe('CONFIG_PRECOS_PADRAO', () => {
    it('deve ter preço avulso padrão de R$ 150', () => {
      expect(CONFIG_PRECOS_PADRAO.precoAvulso).toBe(150);
    });

    it('deve ter preço pacote padrão de R$ 500', () => {
      expect(CONFIG_PRECOS_PADRAO.precoPacote).toBe(500);
    });

    it('deve ter sessões por pacote padrão de 4', () => {
      expect(CONFIG_PRECOS_PADRAO.sessoesPorPacote).toBe(4);
    });
  });

  describe('formatarMoeda', () => {
    it('deve formatar valor como moeda', () => {
      const resultado = formatarMoeda(150);
      expect(typeof resultado).toBe('string');
      expect(resultado).toContain('R$');
    });

    it('deve formatar valor zero', () => {
      const resultado = formatarMoeda(0);
      expect(typeof resultado).toBe('string');
    });

    it('deve formatar número decimal', () => {
      const resultado = formatarMoeda(199.90);
      expect(typeof resultado).toBe('string');
      expect(resultado).toContain('R$');
    });
  });
});