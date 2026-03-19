/**
 * NLP service for voice command parsing.
 * Parses Spanish phrases about savings and withdrawals.
 * 
 * Supported patterns:
 * - "Ahorré X" / "ahorre X" / "deposité X" → { action: 'ahorro', monto: X }
 * - "Retiré X" / "retire X" / "saqué X"   → { action: 'prestamo', monto: X }
 * - "Pagué X" / "pague X"                 → { action: 'pago', monto: X }
 */

const WORD_TO_NUMBER = {
  'un': 1, 'uno': 1, 'una': 1,
  'dos': 2,
  'tres': 3,
  'cuatro': 4,
  'cinco': 5,
  'seis': 6,
  'siete': 7,
  'ocho': 8,
  'nueve': 9,
  'diez': 10,
  'once': 11,
  'doce': 12,
  'quince': 15,
  'veinte': 20,
  'veinticinco': 25,
  'treinta': 30,
  'cuarenta': 40,
  'cincuenta': 50,
  'cien': 100,
  'ciento': 100,
};

/**
 * Parse a transcribed voice command into a savings action.
 */
export function parseVoiceCommand(text) {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase().trim();

  // Detect action type - check for RETIRO/RETIRE first (specific), then ahorro (default)
  let action = 'ahorro'; // default
  if (
    lower.includes('retiré') || lower.includes('retire') ||
    lower.includes('retiro') || lower.includes('saqué') ||
    lower.includes('saque') || lower.includes('quité') ||
    lower.includes('quite') || lower.includes('sacó')
  ) {
    action = 'prestamo'; // maps to 'retiro' in the UI
  } else if (
    lower.includes('presté') || lower.includes('preste') ||
    lower.includes('préstamo') || lower.includes('prestamo')
  ) {
    action = 'prestamo';
  } else if (
    lower.includes('pagué') || lower.includes('pague') ||
    lower.includes('pago')
  ) {
    action = 'pago';
  }

  // Try to extract a numeric amount
  let monto = null;

  // First try digit matches
  const digitMatch = lower.match(/(\d+)/);
  if (digitMatch) {
    monto = parseInt(digitMatch[1], 10);
  }

  // If no digits, try word-based numbers
  if (!monto) {
    for (const [word, num] of Object.entries(WORD_TO_NUMBER)) {
      if (lower.includes(word)) {
        monto = num;
        break;
      }
    }
  }

  if (!monto || monto <= 0) return null;

  return {
    action,
    monto,
    confidence: digitMatch ? 0.9 : 0.7,
  };
}

/**
 * Simulate transcription - includes BOTH ahorro AND retiro phrases equally.
 */
export function simulateTranscription() {
  const phrases = [
    'Ahorré 3 dólares',
    'Ahorré 5 dólares',
    'Retiré 2 dólares',
    'Retiré 10 dólares',
    'Ahorré 7 dólares',
    'Retiré 5 dólares',
    'Ahorré diez dólares',
    'Retiré cuatro dólares',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}
