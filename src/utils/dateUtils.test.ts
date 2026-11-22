import { obterHojeString, somarDias, parseDataLocal, formatarDataExtenso, compararDataHora } from '../dateUtils';

describe('dateUtils', () => {
  describe('obterHojeString', () => {
    it('deve retornar data no formato YYYY-MM-DD', () => {
      const hoje = obterHojeString();
      expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('deve ser consistente dentro do mesmo dia', () => {
      const hoje1 = obterHojeString();
      const hoje2 = obterHojeString();
      expect(hoje1).toBe(hoje2);
    });
  });

  describe('somarDias', () => {
    it('deve somar um dia à data', () => {
      const resultado = somarDias('2024-01-15', 1);
      expect(resultado).toBe('2024-01-16');
    });

    it('deve subtrair dias (número negativo)', () => {
      const resultado = somarDias('2024-01-20', -3);
      expect(resultado).toBe('2024-01-17');
    });

    it('deve cruzar mês', () => {
      const resultado = somarDias('2024-01-31', 1);
      expect(resultado).toBe('2024-02-01');
    });

    it('deve cruzar ano', () => {
      const resultado = somarDias('2024-12-31', 1);
      expect(resultado).toBe('2025-01-01');
    });
  });

  describe('parseDataLocal', () => {
    it('deve parser data no formato YYYY-MM-DD', () => {
      const data = parseDataLocal('2024-06-15');
      expect(data).toBeInstanceof(Date);
      expect(data?.getFullYear()).toBe(2024);
      expect(data?.getMonth()).toBe(5); // Junho = 5
      expect(data?.getDate()).toBe(15);
    });

    it('deve manejar data inválida', () => {
      const data = parseDataLocal('invalid');
      expect(data).toBeNull();
    });
  });

  describe('formatarDataExtenso', () => {
    it('deve formatter data completa', () => {
      const resultado = formatarDataExtenso('2024-06-15');
      expect(typeof resultado).toBe('string');
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('deve formatter data com dia da semana', () => {
      const resultado = formatarDataExtenso('2024-06-15');
      // Should contain day name
      expect(resultado).toMatch(/((Dom|Seg|Ter|Qua|Qui|Sex|Sáb))/);
    });
  });

  describe('compararDataHora', () => {
    it('deve comparar datas iguais', () => {
      const resultado = compararDataHora('2024-06-15', '2024-06-15');
      expect(resultado).toBe(0);
    });

    it('deve comparar datas diferentes', () => {
      const resultado = compararDataHora('2024-06-15', '2024-06-16');
      expect(resultado).toBeLessThan(0);
    });

    it('deve comparar horas', () => {
      const resultado = compararDataHora('2024-06-15 10:00', '2024-06-15 14:00');
      expect(resultado).toBeLessThan(0);
    });
  });
});