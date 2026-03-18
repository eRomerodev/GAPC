import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { Users, Star, Plus, ChevronRight, DollarSign } from 'lucide-react-native';
import { getAllGrupos, getSociasByGrupo, getTotalAhorro } from '../database';
import { speakOnPress, confirmHaptic } from '../utils/audioGuide';

export default function CommunityListScreen({ navigation }) {
  const [grupos, setGrupos] = useState([]);
  const [grupoSocias, setGrupoSocias] = useState({});
  const [grupoTotals, setGrupoTotals] = useState({});

  const loadData = useCallback(async () => {
    try {
      const g = await getAllGrupos();
      setGrupos(g);
      // Load socias and totals for each group
      const sociaMap = {};
      const totalsMap = {};
      for (const grupo of g) {
        const socias = await getSociasByGrupo(grupo.id);
        sociaMap[grupo.id] = socias;
        const totals = await getTotalAhorro(grupo.id);
        totalsMap[grupo.id] = totals;
      }
      setGrupoSocias(sociaMap);
      setGrupoTotals(totalsMap);
    } catch (e) {
      console.log('[CommunityList] Error loading data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        color={i < Math.round(rating) ? '#ffd54f' : '#333'}
        fill={i < Math.round(rating) ? '#ffd54f' : 'transparent'}
      />
    ));
  };

  const renderMemberAvatars = (socias, grupoId) => {
    const displayed = (socias || []).slice(0, 6);
    return (
      <View style={styles.avatarRow}>
        {displayed.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.avatar,
              { marginLeft: i > 0 ? -10 : 0 },
            ]}
          >
            {s.foto_uri ? (
              <Image source={{ uri: s.foto_uri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarColor, { backgroundColor: s.avatar_color }]} />
            )}
          </View>
        ))}
        {(socias || []).length > 6 && (
          <View style={[styles.avatar, styles.moreAvatar, { marginLeft: -10 }]}>
            <Text style={styles.moreText}>+{socias.length - 6}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.avatar, styles.addAvatar, { marginLeft: displayed.length > 0 ? -10 : 0 }]}
          onPress={() => {
            confirmHaptic();
            navigation.navigate('GroupDetail', { grupoId });
          }}
        >
          <Plus size={18} color="#66bb6a" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Users size={28} color="#66bb6a" strokeWidth={2} />
        </View>
        <Text style={styles.headerTitle}>Comunidades</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {grupos.map((grupo) => {
          const socias = grupoSocias[grupo.id] || [];
          const totals = grupoTotals[grupo.id] || { total_ahorro: 0, total_prestamo: 0, total_pago: 0 };
          const totalNeto = totals.total_ahorro - totals.total_prestamo + totals.total_pago;
          return (
            <TouchableOpacity
              key={grupo.id}
              style={styles.groupCard}
              onPress={() => {
                confirmHaptic();
                speakOnPress(`${grupo.nombre_audio}. ${grupo.miembros} miembros. Total ahorrado: ${Math.floor(totalNeto)} dólares.`);
                navigation.navigate('GroupDetail', { grupoId: grupo.id });
              }}
              activeOpacity={0.7}
            >
              {/* Group Header */}
              <View style={styles.cardHeader}>
                <View style={styles.groupIconContainer}>
                  <Users size={24} color="#ffd54f" strokeWidth={2} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {grupo.nombre_audio}
                  </Text>
                  <View style={styles.starsRow}>
                    {renderStars(grupo.rating)}
                    <Text style={styles.ratingText}>{grupo.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <ChevronRight size={22} color="#555" />
              </View>

              {/* Total Savings */}
              <View style={styles.totalRow}>
                <View style={styles.totalIcon}>
                  <DollarSign size={18} color="#66bb6a" strokeWidth={2.5} />
                </View>
                <Text style={styles.totalLabel}>Total comunidad:</Text>
                <Text style={styles.totalAmount}>${totalNeto.toFixed(2)}</Text>
              </View>

              {/* Members Row */}
              <View style={styles.cardFooter}>
                <Text style={styles.membersLabel}>
                  {socias.length} miembro{socias.length !== 1 ? 's' : ''}
                </Text>
                {renderMemberAvatars(socias, grupo.id)}
              </View>
            </TouchableOpacity>
          );
        })}
        {grupos.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={64} color="#333" strokeWidth={1} />
            <Text style={styles.emptyText}>No hay comunidades aún</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21253b',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#66bb6a22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e6edf3',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#21253b',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e6edf3',
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#8b949e',
    marginLeft: 6,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#21253b',
    paddingTop: 14,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#66bb6a12',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  totalIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#66bb6a22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  totalLabel: {
    color: '#8b949e',
    fontSize: 13,
    flex: 1,
  },
  totalAmount: {
    color: '#66bb6a',
    fontSize: 20,
    fontWeight: '700',
  },
  membersLabel: {
    fontSize: 13,
    color: '#8b949e',
    marginBottom: 10,
    fontWeight: '500',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: '#161b22',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  avatarColor: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  moreAvatar: {
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 11,
    color: '#8b949e',
    fontWeight: '700',
  },
  addAvatar: {
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#66bb6a44',
    borderStyle: 'dashed',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
    marginTop: 16,
  },
});
