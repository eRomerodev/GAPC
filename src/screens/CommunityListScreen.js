import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
} from 'react-native';
import { Users, Star, Plus, ChevronRight, DollarSign, Check, X } from 'lucide-react-native';
import { getAllGrupos, getSociasByGrupo, getTotalAhorro } from '../database';
import { speakOnPress, confirmHaptic, speak } from '../utils/audioGuide';

// Distinct colors for each group - no repeats, easily distinguishable
const GROUP_COLORS = [
  '#e53935', // rojo fuerte
  '#1e88e5', // azul
  '#43a047', // verde
  '#fb8c00', // naranja
  '#8e24aa', // morado
  '#00acc1', // cyan
  '#f4511e', // rojo-naranja
  '#3949ab', // indigo
  '#c0ca33', // lima
  '#e91e63', // rosa
];

export default function CommunityListScreen({ navigation }) {
  const [grupos, setGrupos] = useState([]);
  const [grupoSocias, setGrupoSocias] = useState({});
  const [grupoTotals, setGrupoTotals] = useState({});
  const [confirmModal, setConfirmModal] = useState(null); // { grupo, color }

  const loadData = useCallback(async () => {
    try {
      const g = await getAllGrupos();
      setGrupos(g);
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

  const handleGroupPress = (grupo, color) => {
    confirmHaptic();
    setConfirmModal({ grupo, color });
    setTimeout(() => {
      speak(`Grupo ${grupo.nombre_audio}. ¿Quieres acceder a este grupo? Selecciona el botón azul si es así, o el botón rojo si no.`);
    }, 300);
  };

  const confirmGroup = () => {
    const { grupo } = confirmModal;
    setConfirmModal(null);
    confirmHaptic();
    navigation.navigate('GroupDetail', { grupoId: grupo.id });
  };

  const cancelGroup = () => {
    setConfirmModal(null);
    confirmHaptic();
    speak('Selecciona otro grupo.');
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        color={i < Math.round(rating) ? '#ffd54f' : '#333'}
        fill={i < Math.round(rating) ? '#ffd54f' : 'transparent'}
      />
    ));
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
        {grupos.map((grupo, index) => {
          const socias = grupoSocias[grupo.id] || [];
          const totals = grupoTotals[grupo.id] || { total_ahorro: 0, total_prestamo: 0, total_pago: 0 };
          const totalNeto = totals.total_ahorro - totals.total_prestamo + totals.total_pago;
          const groupColor = GROUP_COLORS[index % GROUP_COLORS.length];

          return (
            <TouchableOpacity
              key={grupo.id}
              style={[styles.groupCard, { borderLeftColor: groupColor, borderLeftWidth: 6 }]}
              onPress={() => handleGroupPress(grupo, groupColor)}
              activeOpacity={0.7}
            >
              {/* Color band at top */}
              <View style={[styles.colorBand, { backgroundColor: groupColor }]}>
                <Users size={22} color="#fff" strokeWidth={2.5} />
                <Text style={styles.groupNameBand} numberOfLines={1}>
                  {grupo.nombre_audio}
                </Text>
              </View>

              {/* Info row */}
              <View style={styles.infoRow}>
                <View style={styles.starsRow}>
                  {renderStars(grupo.rating)}
                </View>
                <View style={styles.totalBadge}>
                  <DollarSign size={14} color="#66bb6a" />
                  <Text style={styles.totalText}>${totalNeto.toFixed(0)}</Text>
                </View>
              </View>

              {/* Members row */}
              <View style={styles.membersRow}>
                {socias.slice(0, 5).map((s, i) => (
                  <View
                    key={s.id}
                    style={[styles.avatar, { marginLeft: i > 0 ? -8 : 0 }]}
                  >
                    {s.foto_uri ? (
                      <Image source={{ uri: s.foto_uri }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarColor, { backgroundColor: s.avatar_color }]} />
                    )}
                  </View>
                ))}
                {socias.length > 5 && (
                  <View style={[styles.avatar, styles.moreAvatar, { marginLeft: -8 }]}>
                    <Text style={styles.moreText}>+{socias.length - 5}</Text>
                  </View>
                )}
                <Text style={styles.memberCountText}>
                  {socias.length} miembro{socias.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <ChevronRight size={20} color="#555" style={styles.chevron} />
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

      {/* Confirmation Modal */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={cancelGroup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Group color indicator */}
            {confirmModal && (
              <View style={[styles.modalColorBar, { backgroundColor: confirmModal.color }]}>
                <Users size={40} color="#fff" strokeWidth={2} />
              </View>
            )}

            <Text style={styles.modalTitle}>
              {confirmModal?.grupo.nombre_audio}
            </Text>

            <Text style={styles.modalSubtitle}>
              ¿Quieres acceder a este grupo?
            </Text>

            {/* Big colored buttons */}
            <View style={styles.modalButtons}>
              {/* Blue = YES */}
              <TouchableOpacity
                style={[styles.bigButton, styles.bigButtonBlue]}
                onPress={confirmGroup}
                activeOpacity={0.7}
              >
                <Check size={48} color="#fff" strokeWidth={3} />
              </TouchableOpacity>

              {/* Red = NO */}
              <TouchableOpacity
                style={[styles.bigButton, styles.bigButtonRed]}
                onPress={cancelGroup}
                activeOpacity={0.7}
              >
                <X size={48} color="#fff" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#21253b',
    overflow: 'hidden',
    elevation: 4,
    position: 'relative',
  },
  colorBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  groupNameBand: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    justifyContent: 'space-between',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#66bb6a18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  totalText: {
    color: '#66bb6a',
    fontSize: 16,
    fontWeight: '700',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 18,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: '#161b22',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  avatarColor: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
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
  memberCountText: {
    color: '#8b949e',
    fontSize: 12,
    marginLeft: 10,
  },
  chevron: {
    position: 'absolute',
    right: 18,
    top: '50%',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderRadius: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#21253b',
  },
  modalColorBar: {
    width: '100%',
    paddingVertical: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#e6edf3',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    color: '#8b949e',
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },
  bigButton: {
    flex: 1,
    height: 90,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  bigButtonBlue: {
    backgroundColor: '#1e88e5',
  },
  bigButtonRed: {
    backgroundColor: '#e53935',
  },
});
