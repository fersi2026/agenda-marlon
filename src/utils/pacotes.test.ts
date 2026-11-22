import { CONFIG_PRECOS_PADRAO, calcularInfoPacote } from '../pacotes';

describe('pacotes', () => {
  describe('CONFIG_PRECOS_PADRAO', () => {
    it('deve ter preço avulso padrão', () => {
      expect(CONFIG_PRECOS_PADRAO.precoAvulso).toBe(150);
    });

    it('deve ter preço pacote padrão', () => {
      expect(CONFIG_PRECOS_PADRAO.precoPacote).toBe(500);
    });

    it('deve ter sessões por pacote padrão', () => {
      expect(CONFIG_PRECOS_PADRAO.sessoesPorPacote).toBe(4);
    });
  });

  describe('calcularInfoPacote', () => {
    it('deve calcular sessões usadas corretamente', () => {
      const pacote = { totalSessoes: 4 };
      const agendamentos = [
        { data: '2024-06-01', horario: '10:00', pacienteId: '1', excluidoEm: undefined },
        { data: '2024-06-08', horario: '10:00', pacienteId: '1', excluidoEm: undefined },
      ];
      const config = { validadeDiasPacote: 30 };
      
      const info = calcularInfoPacote(pacote, agendamentos, config.validadeDiasPacote);
      expect(info.totalSessoes).toBe(4);
      expect(info.sessoesUsadas).toBe(2);
    });

    it('deve limitar sessões usadas ao total do pacote', () => {
      const pacote = { totalSessoes: 4 };
      const agendamentos = [
        { data: '2024-06-01', horario: '10:00', pacienteId: '1', excluidoEm: undefined },
        { data: '2024-06-08', horario: '10:00', pacienteId: '1', excluidoEm: undefined },
        { data: '2024-06-15', horario: '10:00', pacienteId: '1', excluidoEm: undefined },
        { data: '2024-06-22', horario: '10:00', pacienteId: '1', excluidoEm: undefined },
        { data: '2024-06-29', horario: '10:00', pacienteId: '1', excluidoEm: undefined }, // 5º, deve ser limitado
      ];
      const config = { validadeDiasPacote: 30 };
      
      const info = calcularInfoPacote(pacote, agendamentos, config.validadeDiasPacote);
      expect(info.sessoesUsadas).toBe(4); // Limitado a 4
    });

    it('deve considerar validade do pacote', () => {
      const pacote = { totalSessoes: 4 };
      const agendamentosAntigos = [
        { data: '2023-01-01', horario: '10:00', pacienteId: '1', excluidoEm: undefined },
      ];
      const config = { validadeDiasPacote: 30 };
      
      const info = calcularInfoPacote(pacote, agendamentosAntigos, config.validadeDiasPacote);
      expect(info.sessoesUsadas).toBe(0); // Fora da validade
    });
  });
});