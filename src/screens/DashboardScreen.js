import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {
  Home,
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Volume2,
} from 'lucide-react-native';
import { getTotalAhorro, getAllSocias, getAllGrupos } from '../database';
import { speakOnPress, speakSaldo, speakDashboardGuide, confirmHaptic } from '../utils/audioGuide';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ grupoId, sociaId, sociaName }) {
  const [totals, setTotals] = useState({ total_ahorro: 0, total_prestamo: 0, total_pago: 0 });
  const [socias, setSocias] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mountainAnim] = useState(new Animated.Value(0));
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
    speakDashboardGuide();

    // Animate money mountain
    Animated.timing(mountainAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Pulse animation for main icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const netSavings = totals.total_ahorro - totals.total_prestamo + totals.total_pago;
  const isPositive = netSavings >= 0;
  const billCount = Math.min(Math.abs(netSavings), 20); // Cap visual bills at 20

  // Generate bill icons based on savings level
  const renderBills = () => {
    const bills = [];
    for (let i = 0; i < billCount; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      bills.push(
        <Animated.View
          key={i}
          style={[
            styles.billIcon,
            {
              opacity: mountainAnim,
              transform: [
                {
                  translateY: mountainAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                { scale: mountainAnim },
              ],
              left: col * 52 + 10,
              bottom: row * 36 + 10,
            },
          ]}
        >
          <Banknote
            size={40}
            color={isPositive ? '#43a047' : '#e53935'}
            strokeWidth={2}
          />
        </Animated.View>
      );
    }
    return bills;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Main Savings Visual */}
      <TouchableOpacity
        style={[
          styles.mainCard,
          { backgroundColor: isPositive ? '#1b5e20' : '#b71c1c' },
        ]}
        onPress={() => {
          speakSaldo(totals.total_ahorro, totals.total_prestamo, totals.total_pago);
          confirmHaptic();
        }}
        activeOpacity={0.8}
        accessibilityLabel="Tu ahorro total"
        accessibilityHint="Toca para escuchar tu saldo"
      >
        {/* Audio indicator */}
        <View style={styles.audioIndicator}>
          <Volume2 size={24} color="#ffd54f" />
        </View>

        {/* Money Mountain */}
        <View style={styles.mountainContainer}>
          {renderBills()}
        </View>

        {/* Trend Icon */}
        <Animated.View
          style={[
            styles.trendContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {isPositive ? (
            <TrendingUp size={64} color="#a5d6a7" strokeWidth={3} />
          ) : (
            <TrendingDown size={64} color="#ef9a9a" strokeWidth={3} />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        {/* Savings */}
        <TouchableOpacity
          style={[styles.statCard, styles.savingsCard]}
          onPress={() => speakOnPress(`Ahorro total: ${totals.total_ahorro} billetes`)}
          activeOpacity={0.7}
        >
          <View style={styles.statIconCircle}>
            <TrendingUp size={32} color="#fff" strokeWidth={2.5} />
          </View>
          {/* Visual bill stack */}
          <View style={styles.miniStack}>
            {Array.from({ length: Math.min(totals.total_ahorro, 5) }).map((_, i) => (
              <Banknote
                key={i}
                size={20}
                color="#c8e6c9"
                style={{ marginTop: i > 0 ? -8 : 0 }}
              />
            ))}
          </View>
        </TouchableOpacity>

        {/* Debts */}
        <TouchableOpacity
          style={[styles.statCard, styles.debtCard]}
          onPress={() => speakOnPress(`Préstamos: ${totals.total_prestamo} billetes`)}
          activeOpacity={0.7}
        >
          <View style={[styles.statIconCircle, { backgroundColor: '#c62828' }]}>
            <TrendingDown size={32} color="#fff" strokeWidth={2.5} />
          </View>
          <View style={styles.miniStack}>
            {Array.from({ length: Math.min(totals.total_prestamo, 5) }).map((_, i) => (
              <Banknote
                key={i}
                size={20}
                color="#ffcdd2"
                style={{ marginTop: i > 0 ? -8 : 0 }}
              />
            ))}
          </View>
        </TouchableOpacity>
      </View>

      {/* Members Section */}
      <TouchableOpacity
        style={styles.membersCard}
        onPress={() => speakOnPress(`Hay ${socias.length} socias en tus grupos`)}
        activeOpacity={0.7}
      >
        <View style={styles.membersHeader}>
          <Users size={36} color="#ffd54f" strokeWidth={2} />
        </View>
        <View style={styles.avatarRow}>
          {socias.slice(0, 8).map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.avatar,
                { backgroundColor: s.avatar_color, marginLeft: i > 0 ? -12 : 0 },
              ]}
            />
          ))}
          {socias.length > 8 && (
            <View style={[styles.avatar, styles.moreAvatar]}>
              <Users size={16} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Groups with Stars */}
      {grupos.map((g) => (
        <TouchableOpacity
          key={g.id}
          style={styles.groupCard}
          onPress={() =>
            speakOnPress(
              `${g.nombre_audio}. ${g.miembros} miembros. Calificación: ${g.rating} estrellas.`
            )
          }
          activeOpacity={0.7}
        >
          <View style={styles.groupIcon}>
            <Users size={28} color="#ffd54f" />
          </View>
          <View style={styles.groupStars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                color={i < Math.round(g.rating) ? '#ffd54f' : '#333'}
                fill={i < Math.round(g.rating) ? '#ffd54f' : 'transparent'}
              />
            ))}
          </View>
          <View style={styles.groupMembers}>
            {Array.from({ length: Math.min(g.miembros, 6) }).map((_, i) => (
              <View key={i} style={styles.miniDot} />
            ))}
          </View>
        </TouchableOpacity>
      ))}

      {/* Bottom Spacer */}
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
  mainCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 260,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  audioIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  mountainContainer: {
    height: 180,
    position: 'relative',
  },
  billIcon: {
    position: 'absolute',
  },
  trendContainer: {
    alignItems: 'center',
    marginTop: -20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  savingsCard: {
    backgroundColor: '#2e7d32',
  },
  debtCard: {
    backgroundColor: '#c62828',
  },
  statIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#388e3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniStack: {
    alignItems: 'center',
    minHeight: 40,
  },
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
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#161b22',
  },
  moreAvatar: {
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
  },
  groupCard: {
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#21253b',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupStars: {
    flexDirection: 'row',
    flex: 1,
    gap: 2,
  },
  groupMembers: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#66bb6a',
  },
});
