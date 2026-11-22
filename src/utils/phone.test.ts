import { validarTelefone, formatarTelefone, validarDDD, linkWhatsApp, extrairTelefoneDeTexto } from '../phone';

describe('phone', () => {
  describe('validarTelefone', () => {
    it('deve validar número de telefone fixo', () => {
      expect(validarTelefone('(11) 98765-4321')).toBe(true);
      expect(validarTelefone('(11) 2222-2222')).toBe(true);
    });

    it('deve validar número de celular', () => {
      expect(validarTelefone('(11) 98765-4321')).toBe(true);
      expect(validarTelefone('(11) 91234-5678')).toBe(true);
    });

    it('deve rejeitar número inválido', () => {
      expect(validarTelefone('12345678')).toBe(false);
      expect(validarTelefone('')).toBe(false);
    });
  });

  describe('formatarTelefone', () => {
    it('deve formatar número com DDD', () => {
      const resultado = formatarTelefone('11987654321');
      expect(resultado.formatado).toContain('(');
      expect(resultado.formatado).toContain(')');
      expect(resultado.whatsapp).toContain('wa.me');
    });

    it('deve formatar número sem DDD', () => {
      const resultado = formatarTelefone('987654321');
      expect(resultado.formatado.length).toBeGreaterThan(0);
    });

    it('deve retornar link WhatsApp válido', () => {
      const link = formatarTelefone('11987654321').whatsapp;
      expect(link).toContain('https://wa.me/55');
    });
  });

  describe('validarDDD', () => {
    it('deve validar DDDs conhecidos', () => {
      expect(validarDDD('11')).toBe(true);
      expect(validarDDD('21')).toBe(true);
      expect(validarDDD('31')).toBe(true);
      expect(validarDDD('55')).toBe(true);
    });

    it('deve rejeitar DDD inválido', () => {
      expect(validarDDD('99')).toBe(false);
      expect(validarDDD('00')).toBe(false);
    });
  });

  describe('linkWhatsApp', () => {
    it('deve gerar link WhatsApp com mensagem', () => {
      const link = linkWhatsApp('1198765-4321', 'Olá, tudo bem?');
      expect(link).toContain('https://wa.me/55');
      expect(link).toContain('text=');
    });

    it('deve retornar null para número inválido', () => {
      const link = linkWhatsApp('invalid', 'teste');
      expect(link).toBeNull();
    });
  });

  describe('extrairTelefoneDeTexto', () => {
    it('deve extrair telefone de texto', () => {
      const resultado = extrairTelefoneDeTexto('Agende pelo (11) 98765-4321');
      expect(resultado).toBeTruthy();
      if (resultado) {
        expect(resultado.ddd).toBe('11');
      }
    });

    it('deve retornar null quando não houver telefone', () => {
      const resultado = extrairTelefoneDeTexto('Nenhum telefone aqui');
      expect(resultado).toBeNull();
    });
  });
});