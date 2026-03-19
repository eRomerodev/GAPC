import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const SPEECH_CONFIG = {
  language: 'es-MX',
  rate: 0.85,
  pitch: 1.0,
};

/**
 * Speak text aloud in Spanish.
 */
export function speak(text) {
  Speech.stop();
  Speech.speak(text, SPEECH_CONFIG);
}

/**
 * Stop any currently playing speech.
 */
export function stopSpeaking() {
  Speech.stop();
}

/**
 * Speak a label when an icon/button is pressed + light haptic.
 */
export function speakOnPress(label) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  speak(label);
}

/**
 * Success haptic vibration (savings confirmed, sync complete, etc.)
 */
export function confirmHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Error haptic vibration (failed action, debt warning, etc.)
 */
export function errorHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Warning haptic vibration
 */
export function warningHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/**
 * Speak the savings total in a friendly way.
 */
export function speakSaldo(totalAhorro, totalPrestamo, totalPago = 0) {
  const netSavings = totalAhorro - totalPrestamo + totalPago;
  const abs = Math.abs(netSavings);
  const dollars = Math.floor(abs);
  const cents = Math.round((abs - dollars) * 100);

  let amountText = `${dollars} dólares`;
  if (cents > 0) amountText += ` con ${cents} centavos`;

  if (netSavings > 0) {
    speak(`Tu ahorro total es de ${amountText}. Muy bien, sigue ahorrando.`);
  } else if (netSavings === 0) {
    speak('Tu saldo está en cero. Comienza a ahorrar hoy.');
  } else {
    speak(`Tus retiros superan tus depósitos por ${amountText}.`);
  }
}

/**
 * Dashboard guidance speech
 */
export function speakDashboardGuide() {
  speak('Bienvenida a tu grupo de ahorro. Toca los iconos para escuchar más información.');
}

/**
 * Voice record guidance
 */
export function speakRecordGuide() {
  speak('Mantén presionado el botón del micrófono para grabar tu ahorro.');
}

/**
 * Map guidance
 */
export function speakMapGuide() {
  speak('Este es el mapa de comunidades. Toca un grupo para escuchar su información.');
}

/**
 * Sync guidance
 */
export function speakSyncGuide() {
  speak('Desde aquí puedes sincronizar tus datos con otros dispositivos cercanos.');
}
