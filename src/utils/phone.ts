/**
 * Utilitário centralizado para validação e formatação de telefones.
 * Garante que links WhatsApp e dados de contato sejam sempre válidos.
 * 
 * Todas as funções seguem o padrão BR (DDD + DDD + número).
 * O DDI Brasil é +55.
 */

export type DDD = '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' |
                  '21' | '22' | '24' | '27' | '28' | '31' | '32' | '33' | '34' |
                  '35' | '37' | '38' | '41' | '42' | '43' | '44' | '45' | '46' |
                  '47' | '48' | '49' | '51' | '53' | '54' | '55' | '61' | '62' |
                  '63' | '64' | '65' | '66' | '67' | '68' | '69' | '71' | '73' |
                  '74' | '75' | '76' | '77' | '78' | '79' | '81' | '82' | '83' |
                  '84' | '85' | '86' | '87' | '88' | '89' | '91' | '92' | '93' |
                  '94' | '95' | '96' | '97' | '98' | '99';

export interface TelefoneFormatado {
  ddd: string;
  numero: string;
  formatado: string;
  internacional: string;
  whatsapp: string;
}

/**
 * Valida se um DDD é válido.
 */
export function validarDDD(ddd: string): boolean {
  const dddsValidos: DDD[] = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '24', '27', '28',
    '31', '32', '33', '34', '35', '37', '38',
    '41', '42', '43', '44', '45', '46',
    '47', '48', '49',
    '51', '53', '54',
    '61', '62', '63', '64', '65', '66', '67', '68', '69',
    '71', '73', '74', '75', '76', '77', '78', '79',
    '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '91', '92', '93', '94', '95', '96', '97', '98', '99',
  ];
  return ddsValidos.includes(ddd);
}

/**
 * Formata um número de telefone para o padrão brasileiro.
 * Aceita números com ou sem DDD, com ou país.
 */
export function formatarTelefone(telefone: string): TelefoneFormatado {
  // Remover todos os caracteres não numéricos exceto +
  const limpo = telefone.replace(/\D/g, '').replace(/^55/, '');
  
  // Extrair DDD (primeiros 2 dígitos se tiverem 10 ou 11 dígitos no total)
  let ddd = '';
  let numero = limpo;
  
  if (limpo.length >= 10 && limpo.length <= 11) {
    ddd = limpo.substring(0, 2);
    numero = limpo.substring(2);
  }
  
  // Validar DDD
  const dddValido = validarDDD(ddd) || ddd === '';
  
  // Formatar número com máscara
  let numeroFormatado = numero;
  if (numeroFormatado.length > 0) {
    // Celular: XX9 XXXX-XXXX (9 dígitos após DDD)
    // Fixo: XX XXX-XXXX (8 dígitos após DDD)
    if (numeroFormatado.length === 8) {
      // Fixo: XXXX-XXXX
      numeroFormatado = `${numeroFormatado.substring(0, 4)}-${numeroFormatado.substring(4)}`;
    } else if (numeroFormatado.length === 9) {
      // Celular: 9XXXXXXXX
      numeroFormatado = `${numeroFormatado.substring(0, 5)}-${numeroFormatado.substring(5)}`;
    }
  }
  
  const dddFormatado = ddd ? `(${ddd})` : '';
  
  return {
    ddd,
    numero: limpo,
    formatado: dddFormatado + numeroFormatado,
    internacional: `+55 ${dddFormatado} ${numeroFormatado}`.trim(),
    whatsapp: `https://wa.me/55${limpo.replace(/\D/g, '')}`,
  };
}

/**
 * Validar se um número de telefone tem formato válido.
 */
export function validarTelefone(telefone: string): boolean {
  const formatado = formatarTelefone(telefone);
  return formatado.formatado.length >= 8; // Padrão mínimo: (XX) XXXX-XXXX
}

/**
 * Gerar link WhatsApp com mensagem codificada.
 * @param telefone Número de telefone (com ou sem DDD, com ou sem código do país)
 * @param mensagem Mensagem a ser enviada (será codificada para URL)
 * @returns Link WhatsApp pronto para uso
 */
export function linkWhatsApp(telefone: string, mensagem: string): string | null {
  const formatado = formatarTelefone(telefone);
  
  if (formatado.formatado.length < 8) {
    console.warn('Número de telefone inválido para link WhatsApp');
    return null;
  }
  
  const mensagemCodificada = encodeURIComponent(mensagem);
  return `https://wa.me/55${formatado.numero.replace(/\D/g, '')}?text=${mensagemCodificada}`;
}

/**
 * Extrair DDD e número de uma string que possa conter texto adicional.
 * Útil para parsing de entradas de usuário.
 */
export function extrairTelefoneDeTexto(texto: string): { ddd: string; numero: string } | null {
  // Buscar padrões de telefone no texto
  const matches = texto.match(/(?:\(?(\d{2})\)?\s?)?(\d{4,5})-?\d{4}/);
  
  if (!matches) return null;
  
  const ddd = matches[1] || '';
  const numero = matches[2] || '';
  
  return { ddd, numero };
}