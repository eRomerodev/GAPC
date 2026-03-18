/**
 * Simulated NLP service.
 * In production, this would connect to a real speech-to-text + NLP backend.
 * For now, it parses simple Spanish phrases about savings.
 * 
 * Supported patterns:
 * - "Ahorré X billetes" → { action: 'ahorro', monto: X }
 * - "Presté X billetes" → { action: 'prestamo', monto: X }
 * - "Pagué X billetes" → { action: 'pago', monto: X }
 * - Any number mention → { action: 'ahorro', monto: X }
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
  'treinta': 30,
  'cincuenta': 50,
  'cien': 100,
};

/**
 * Parse a transcribed voice note into a savings action.
 * @param {string} text - The transcribed text
 * @returns {{ action: string, monto: number, confidence: number } | null}
 */
export function parseVoiceCommand(text) {
  if (!text || typeof text !== 'string') return null;

  const lower = text.toLowerCase().trim();

  // Detect action type
  let action = 'ahorro'; // default
  if (lower.includes('presté') || lower.includes('preste') || lower.includes('préstamo') || lower.includes('prestamo')) {
    action = 'prestamo';
  } else if (lower.includes('pagué') || lower.includes('pague') || lower.includes('pago')) {
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
 * Simulate transcription from audio (demo purposes).
 * In production, this would send the audio file to a speech-to-text API.
 * Returns a random simulated phrase.
 */
export function simulateTranscription() {
  const phrases = [
    'Ahorré 3 billetes',
    'Ahorré 5 billetes',
    'Ahorré 2 billetes',
    'Pagué un billete',
    'Ahorré diez billetes',
    'Ahorré 7 billetes',
    'Presté dos billetes',
    'Ahorré cuatro billetes',
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Get a human-readable summary of a parsed command.
 */
export function getCommandSummary(parsed) {
  if (!parsed) return 'No se entendió el comando';

  const actionNames = {
    ahorro: 'Ahorro',
    prestamo: 'Préstamo',
    pago: 'Pago',
  };

  return `${actionNames[parsed.action]}: ${parsed.monto} billete${parsed.monto > 1 ? 's' : ''}`;
}
