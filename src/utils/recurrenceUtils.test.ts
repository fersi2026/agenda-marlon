import { gerarAgendamentosParaMes, DIAS_SEMANA_EXTENSO, getNomeDiaSemana } from '../recurrenceUtils';

describe('recurrenceUtils', () => {
  describe('DIAS_SEMANA_EXTENSO', () => {
    it('deve conter todos os dias da semana', () => {
      const dias = DIAS_SEMANA_EXTENSO;
      expect(dias).toContain('Domingo');
      expect(dias).toContain('Segunda-feira');
      expect(dias).toContain('Terça-feira');
      expect(dias).toContain('Quarta-feira');
      expect(dias).toContain('Quinta-feira');
      expect(dias).toContain('Sexta-feira');
      expect(dias).toContain('Sábado');
    });
  });

  describe('getNomeDiaSemana', () => {
    it('deve retornar nome do dia', () => {
      const nome = getNomeDiaSemana(0); // Domingo
      expect(nome).toBe('Domingo');
      
      const nome2 = getNomeDiaSemana(1); // Segunda
      expect(nome2).toBe('Segunda-feira');
    });

    it('deve retornar nome correto para todos os dias', () => {
      for (let i = 0; i < 7; i++) {
        const nome = getNomeDiaSemana(i);
        expect(typeof nome).toBe('string');
        expect(nome.length).toBeGreaterThan(0);
      }
    });
  });

  describe('gerarAgendamentosParaMes', () => {
    it('deve gerar agendamentos para um mês', () => {
      const config: any = {
        sessoesPorPacote: 4,
        precoAvulso: 150,
        precoPacote: 500,
        validadeDiasPacote: 30,
      };
      
      const resultado = gerarAgendamentosParaMes(
        { id: '1', pacienteId: '1', isRecorrente: false, gerarParaTodoMes: false },
        2024,
        6, // junho
        [],
        config
      );
      
      expect(Array.isArray(resultado)).toBe(true);
    });

    it('deve retornar array quando não houver regras', () => {
      const resultado = gerarAgendamentosParaMes(
        { id: '1', pacienteId: '1', isRecorrente: false, gerarParaTodoMes: false },
        2024,
        6,
        [],
        {}
      );
      
      expect(resultado.length).toBe(0);
    });
  });
});