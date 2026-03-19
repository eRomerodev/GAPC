import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  Volume2,
  DollarSign,
} from 'lucide-react-native';
import { getTotalAhorro, getAllSocias, getAllGrupos } from '../database';
import { speakOnPress, speakSaldo, confirmHaptic, speak } from '../utils/audioGuide';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ grupoId, sociaId, sociaName }) {
  const [totals, setTotals] = useState({ total_ahorro: 0, total_prestamo: 0, total_pago: 0 });
  const [socias, setSocias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [pulseAnim] = useState(new Animated.Value(1));

  const loadData = useCallback(async () => {
    try {
      const t = await getTotalAhorro(grupoId || null);
      setTotals(t);
      const s = await getAllSocias();
      setSocias(grupoId ? s.filter(sc => sc.grupo_id === grupoId) : s);
      const g = await getAllGrupos();
      setGrupos(grupoId ? g.filter(gr => gr.id === grupoId) : g);
    } catch (e) {
      console.log('[Dashboard] Error loading data:', e);
    }
  }, [grupoId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    // Welcome message
    setTimeout(() => {
      speak('Bienvenida a tu grupo de ahorro. Toca los botones para escuchar más información.');
    }, 500);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const netSavings = totals.total_ahorro - totals.total_prestamo + totals.total_pago;
  const dollars = Math.floor(Math.abs(netSavings));
  const cents = Math.round((Math.abs(netSavings) - dollars) * 100);

  const formatDollars = (amount) => {
    const d = Math.floor(Math.abs(amount));
    const c = Math.round((Math.abs(amount) - d) * 100);
    if (c > 0) return `${d} dólares con ${c} centavos`;
    return `${d} dólares`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* GREEN - Total Savings Button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={styles.totalButton}
          onPress={() => {
            confirmHaptic();
            speakSaldo(totals.total_ahorro, totals.total_prestamo, totals.total_pago);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.totalIconCircle}>
            <DollarSign size={36} color="#fff" strokeWidth={2.5} />
          </View>
          <Text style={styles.totalAmountText}>
            ${netSavings.toFixed(2)}
          </Text>
          <Volume2 size={24} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', top: 18, right: 18 }} />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats Row - Deposits and Withdrawals */}
      <View style={styles.statsRow}>
        {/* GREEN - Deposits */}
        <TouchableOpacity
          style={styles.depositButton}
          onPress={() => {
            confirmHaptic();
            speakOnPress(`Depósitos totales: ${formatDollars(totals.total_ahorro)}.`);
          }}
          activeOpacity={0.7}
        >
          <TrendingUp size={30} color="#fff" strokeWidth={2.5} />
          <Text style={styles.statAmount}>${totals.total_ahorro.toFixed(2)}</Text>
          <Volume2 size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        {/* RED - Withdrawals (retiros, NOT prestamos) */}
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => {
            confirmHaptic();
            speakOnPress(`Retiros totales: ${formatDollars(totals.total_prestamo)}.`);
          }}
          activeOpacity={0.7}
        >
          <TrendingDown size={30} color="#fff" strokeWidth={2.5} />
          <Text style={styles.statAmount}>${totals.total_prestamo.toFixed(2)}</Text>
          <Volume2 size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      {/* Members Section - shows count and names */}
      <TouchableOpacity
        style={styles.membersCard}
        onPress={() => {
          const names = socias.map(s => s.nombre_audio).join(', ');
          speakOnPress(`Hay ${socias.length} participantes en tu grupo. Los participantes son: ${names || 'ninguno aún'}.`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.membersHeader}>
          <Users size={32} color="#ffd54f" strokeWidth={2} />
          <Text style={styles.membersCount}>{socias.length}</Text>
          <Volume2 size={18} color="#ffd54f" style={{ marginLeft: 'auto' }} />
        </View>
        <View style={styles.avatarRow}>
          {socias.slice(0, 8).map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.avatar,
                { backgroundColor: s.avatar_color, marginLeft: i > 0 ? -10 : 0 },
              ]}
            />
          ))}
          {socias.length > 8 && (
            <View style={[styles.avatar, styles.moreAvatar]}>
              <Text style={styles.moreText}>+{socias.length - 8}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 60,
  },
  // Total button (single green)
  totalButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#43a047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  totalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalAmountText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  depositButton: {
    flex: 1,
    backgroundColor: '#43a047',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: '#e53935',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },
  statAmount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  // Members
  membersCard: {
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#21253b',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  membersCount: {
    color: '#e6edf3',
    fontSize: 28,
    fontWeight: '800',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: '#161b22',
  },
  moreAvatar: {
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  moreText: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '700',
  },
});
