import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Check, X, CircleDollarSign, Coins, TrendingUp, TrendingDown, Mic, Volume2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { speak, confirmHaptic, errorHaptic, speakOnPress, stopSpeaking } from '../utils/audioGuide';
import { parseVoiceCommand, simulateTranscription } from '../utils/nlpService';
import { addAhorro } from '../database';

const BILLS = [1, 5, 10, 20, 50, 100];
const COINS = [
  { value: 0.01, label: '1¢', speakAs: '1 centavo' },
  { value: 0.05, label: '5¢', speakAs: '5 centavos' },
  { value: 0.10, label: '10¢', speakAs: '10 centavos' },
  { value: 0.25, label: '25¢', speakAs: '25 centavos' },
];

export default function TransactionScreen({ grupoId, sociaId, sociaName }) {
  const [total, setTotal] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [txType, setTxType] = useState('ahorro');
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(null);

  // Voice guidance on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(
        'Aquí puedes registrar tus ahorros y retiros. ' +
        'Selecciona la cantidad que ahorraste o retiraste usando los botones de billetes y monedas. ' +
        'Luego dale al botón verde grande para efectuar la operación. ' +
        'También puedes mantener presionado el botón del micrófono para decir la cantidad por voz.'
      );
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const animateTotal = () => {
    scaleAnim.setValue(1.2);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const addAmount = (amount, isCoin = false, coinSpeech = '') => {
    const newTotal = total + amount;
    const fixedTotal = Math.round(newTotal * 100) / 100;
    setTotal(fixedTotal);
    animateTotal();

    if (isCoin) {
      speakOnPress(`Más ${coinSpeech}`);
    } else {
      speakOnPress(`Más ${amount} ${amount === 1 ? 'dólar' : 'dólares'}`);
    }
  };

  const playTotalAudio = () => {
    const dollars = Math.floor(total);
    const cents = Math.round((total - dollars) * 100);
    
    let text = txType === 'ahorro' ? 'Total a depositar: ' : 'Total a retirar: ';
    if (dollars > 0) text += `${dollars} ${dollars === 1 ? 'dólar' : 'dólares'} `;
    if (cents > 0) text += `con ${cents} centavos`;
    if (dollars === 0 && cents === 0) text = 'Total en cero.';
    
    speakOnPress(text);
  };

  const startVoice = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        speak('Permiso denegado para el micrófono');
        return;
      }

      stopSpeaking();
      await new Promise(resolve => setTimeout(resolve, 300));

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      confirmHaptic();
    } catch (err) {
      console.error('[Transaction] Record error:', err);
    }
  };

  const stopVoice = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsRecording(false);
      confirmHaptic();

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      // Use simulated NLP for now
      setTimeout(() => {
        const textStr = simulateTranscription();
        const parsed = parseVoiceCommand(textStr);
        if (parsed) {
          addAmount(parsed.monto);
          if (parsed.action === 'prestamo' || parsed.action === 'retiro') {
            setTxType('prestamo');
          } else {
            setTxType('ahorro');
          }
          const actionWord = (parsed.action === 'prestamo') ? 'Retiro' : 'Depósito';
          speakOnPress(`Entendido. ${actionWord} de ${parsed.monto} dólares.`);
        } else {
          errorHaptic();
          speak('No entendí. Usa los botones para seleccionar la cantidad.');
        }
      }, 800);
    } catch (err) {
      console.error('[Transaction] Stop record error:', err);
      setIsRecording(false);
    }
  };

  const handleSave = async () => {
    if (total <= 0) {
      errorHaptic();
      speak('Agrega una cantidad antes de guardar.');
      return;
    }

    try {
      const gId = grupoId || 1;
      const sId = sociaId || 1;
      await addAhorro(sId, gId, total, txType);
      confirmHaptic();
      const actionWord = txType === 'ahorro' ? 'Depósito' : 'Retiro';
      const dollars = Math.floor(total);
      const cents = Math.round((total - dollars) * 100);
      let amountText = `${dollars} dólares`;
      if (cents > 0) amountText += ` con ${cents} centavos`;
      speak(`${actionWord} de ${amountText} guardado correctamente.`);
      setTotal(0);
    } catch (err) {
      console.error('[Transaction] Save error:', err);
      errorHaptic();
      speak('Error al guardar. Intenta de nuevo.');
    }
  };

  const handleClear = () => {
    if (total === 0) {
      speakOnPress('Ya está en cero');
      return;
    }
    setTotal(0);
    errorHaptic();
    speak('Borrando total. Empieza de nuevo.');
  };

  return (
    <View style={styles.container}>
      {/* Total Display */}
      <TouchableOpacity 
        style={styles.totalContainer} 
        onPress={playTotalAudio}
      >
        <Text style={styles.totalLabel}>
          {txType === 'ahorro' ? 'Total a depositar' : 'Total a retirar'}
        </Text>
        <Animated.Text style={[styles.totalAmount, { transform: [{ scale: scaleAnim }] }]}>
          $ {total.toFixed(2)}
        </Animated.Text>
        <Volume2 size={20} color="#ffd54f" style={{ position: 'absolute', top: 16, right: 16 }} />
      </TouchableOpacity>

      {/* Transaction Type Toggle */}
      <View style={styles.typeSelector}>
        <TouchableOpacity 
          style={[styles.typeBtn, txType === 'ahorro' && styles.typeBtnActiveAhorro]}
          onPress={() => { setTxType('ahorro'); speakOnPress('Modo depósito. Selecciona la cantidad.'); }}
        >
          <TrendingUp color={txType === 'ahorro' ? '#fff' : '#66bb6a'} size={32} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.typeBtn, txType === 'prestamo' && styles.typeBtnActiveRetiro]}
          onPress={() => { setTxType('prestamo'); speakOnPress('Modo retiro. Selecciona la cantidad.'); }}
        >
          <TrendingDown color={txType === 'prestamo' ? '#fff' : '#ef5350'} size={32} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bills */}
        <View style={styles.grid}>
          {BILLS.map((bill) => (
            <TouchableOpacity
              key={`bill-${bill}`}
              style={[styles.moneyButton, styles.billButton]}
              onPress={() => addAmount(bill)}
              activeOpacity={0.7}
            >
              <Text style={styles.billText}>$ {bill}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coins */}
        <View style={styles.coinGrid}>
          {COINS.map((coin) => (
            <TouchableOpacity
              key={`coin-${coin.value}`}
              style={[styles.moneyButton, styles.coinButton]}
              onPress={() => addAmount(coin.value, true, coin.speakAs)}
              activeOpacity={0.7}
            >
              <Text style={styles.coinText}>{coin.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* RED - Clear */}
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <X color="#fff" size={36} strokeWidth={3} />
          </TouchableOpacity>

          {/* BLUE - Mic */}
          <TouchableOpacity 
            style={[styles.micBtn, isRecording && styles.micBtnRecording]} 
            onPressIn={startVoice}
            onPressOut={stopVoice}
          >
            <Mic color="#fff" size={36} strokeWidth={3} />
          </TouchableOpacity>

          {/* GREEN - Save (BIG) */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Check color="#fff" size={48} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingTop: 60,
  },
  totalContainer: {
    backgroundColor: '#161b22',
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    elevation: 8,
  },
  totalLabel: {
    color: '#8b949e',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  totalAmount: {
    color: '#66bb6a',
    fontSize: 48,
    fontWeight: 'bold',
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
  },
  typeBtnActiveAhorro: {
    backgroundColor: '#2e7d32',
    borderColor: '#43a047',
  },
  typeBtnActiveRetiro: {
    backgroundColor: '#c62828',
    borderColor: '#e53935',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  coinGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moneyButton: {
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  billButton: {
    width: '48%',
    backgroundColor: '#1b5e20',
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  coinButton: {
    flex: 1,
    backgroundColor: '#b8860b',
    borderWidth: 2,
    borderColor: '#ffd54f',
    borderRadius: 35,
  },
  billText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  coinText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearBtn: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  micBtn: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#1e88e5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  micBtnRecording: {
    backgroundColor: '#ef5350',
    transform: [{ scale: 1.1 }],
  },
  saveBtn: {
    flex: 1,
    height: 70,
    borderRadius: 20,
    backgroundColor: '#43a047',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
});
