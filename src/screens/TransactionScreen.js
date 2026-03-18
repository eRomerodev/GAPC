import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Check, X, CircleDollarSign, Coins, TrendingUp, TrendingDown } from 'lucide-react-native';
import { speak, confirmHaptic, errorHaptic, speakOnPress } from '../utils/audioGuide';
import { addAhorro } from '../database';

const BILLS = [1, 5, 10, 20, 50, 100];
const COINS = [
  { value: 0.01, label: '1¢', speakAs: '1 centavo' },
  { value: 0.05, label: '5¢', speakAs: '5 centavos' },
  { value: 0.10, label: '10¢', speakAs: '10 centavos' },
  { value: 0.25, label: '25¢', speakAs: '25 centavos' },
];

export default function TransactionScreen() {
  const [total, setTotal] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [txType, setTxType] = useState('ahorro');

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
    // Fix floating point math issues
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
    
    let text = txType === 'ahorro' ? `Total a guardar: ` : `Total a retirar: `;
    if (dollars > 0) text += `${dollars} ${dollars === 1 ? 'dólar' : 'dólares'} `;
    if (cents > 0) text += `con ${cents} centavos`;
    if (dollars === 0 && cents === 0) text = 'Total en cero.';
    
    speakOnPress(text);
  };

  const handleSave = async () => {
    if (total <= 0) {
      errorHaptic();
      speak('Agrega dinero antes de guardar.');
      return;
    }

    try {
      // Default to Socia 1, Grupo 1 for the demo
      await addAhorro(1, 1, total, txType);
      confirmHaptic();
      speak(`${txType === 'ahorro' ? 'Ahorro' : 'Retiro'} de ${total} guardado correctamente.`);
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
    speak('Borrando total. Empezar de nuevo.');
  };

  return (
    <View style={styles.container}>
      {/* Total Display */}
      <TouchableOpacity 
        style={styles.totalContainer} 
        onPress={playTotalAudio}
        accessibilityLabel="Total acumulado"
      >
        <Text style={styles.totalLabel}>
          {txType === 'ahorro' ? 'Total a guardar' : 'Total a retirar'}
        </Text>
        <Animated.Text style={[styles.totalAmount, { transform: [{ scale: scaleAnim }] }]}>
          $ {total.toFixed(2)}
        </Animated.Text>
      </TouchableOpacity>

      {/* Transaction Type Toggle */}
      <View style={styles.typeSelector}>
        <TouchableOpacity 
          style={[styles.typeBtn, txType === 'ahorro' && styles.typeBtnActiveAhorro]}
          onPress={() => { setTxType('ahorro'); speakOnPress('Modo Ahorrar dinero'); }}
        >
          <TrendingUp color={txType === 'ahorro' ? '#fff' : '#66bb6a'} size={32} />
          <Text style={[styles.typeText, txType === 'ahorro' && {color: '#fff'}]}>Ahorrar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.typeBtn, txType === 'retiro' && styles.typeBtnActiveRetiro]}
          onPress={() => { setTxType('retiro'); speakOnPress('Modo Retirar dinero'); }}
        >
          <TrendingDown color={txType === 'retiro' ? '#fff' : '#ef5350'} size={32} />
          <Text style={[styles.typeText, txType === 'retiro' && {color: '#fff'}]}>Retirar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CircleDollarSign color="#66bb6a" size={24} />
            <Text style={styles.sectionTitle}>Billetes</Text>
          </View>
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
        </View>

        {/* Coins Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Coins color="#ffd54f" size={24} />
            <Text style={styles.sectionTitle}>Monedas</Text>
          </View>
          <View style={styles.grid}>
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
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={handleClear}>
            <X color="#fff" size={40} strokeWidth={3} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSave}>
            <Check color="#fff" size={48} strokeWidth={3} />
          </TouchableOpacity>
        </View>
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
    padding: 24,
    marginHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#30363d',
    elevation: 8,
  },
  totalLabel: {
    color: '#8b949e',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#30363d',
    backgroundColor: '#161b22',
  },
  typeBtnActiveAhorro: {
    backgroundColor: '#1b5e20',
    borderColor: '#2e7d32',
  },
  typeBtnActiveRetiro: {
    backgroundColor: '#b71c1c',
    borderColor: '#e53935',
  },
  typeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8b949e',
    marginLeft: 8,
  },
  totalAmount: {
    color: '#66bb6a',
    fontSize: 56,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#c9d1d9',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  moneyButton: {
    width: '48%',
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  billButton: {
    backgroundColor: '#1b5e20',
    borderWidth: 2,
    borderColor: '#2e7d32',
  },
  coinButton: {
    backgroundColor: '#b8860b',
    borderWidth: 2,
    borderColor: '#ffd54f',
    borderRadius: 40, // Make them circular
  },
  billText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  coinText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  actionBtn: {
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  clearBtn: {
    backgroundColor: '#d32f2f',
    width: 80,
  },
  saveBtn: {
    backgroundColor: '#2e7d32',
    flex: 1,
    marginLeft: 20,
  },
});
