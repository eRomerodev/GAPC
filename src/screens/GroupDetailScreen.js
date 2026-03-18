import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  Users,
  Star,
  Plus,
  ArrowLeft,
  UserPlus,
  X,
  Camera,
} from 'lucide-react-native';
import { getSociasByGrupo, getAllGrupos, addSocia } from '../database';
import { speakOnPress, confirmHaptic } from '../utils/audioGuide';

const AVATAR_COLORS = [
  '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043',
  '#ffa726', '#26c6da', '#ec407a', '#7e57c2',
  '#5c6bc0', '#29b6f6',
];

export default function GroupDetailScreen({ navigation, route }) {
  const { grupoId } = route.params;
  const [grupo, setGrupo] = useState(null);
  const [socias, setSocias] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const grupos = await getAllGrupos();
      const g = grupos.find((gr) => gr.id === grupoId);
      setGrupo(g);
      const s = await getSociasByGrupo(grupoId);
      setSocias(s);
    } catch (e) {
      console.log('[GroupDetail] Error loading data:', e);
    }
  }, [grupoId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      Alert.alert('Error', 'Por favor escribe el nombre del miembro.');
      return;
    }
    try {
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      await addSocia(newMemberName.trim(), grupoId, randomColor);
      confirmHaptic();
      setNewMemberName('');
      setShowAddModal(false);
      await loadData();
      speakOnPress(`${newMemberName.trim()} ha sido agregada al grupo.`);
    } catch (e) {
      console.log('[GroupDetail] Error adding member:', e);
      Alert.alert('Error', 'No se pudo agregar el miembro.');
    }
  };

  const handleMemberPress = (socia) => {
    confirmHaptic();
    navigation.navigate('FaceVerify', {
      grupoId,
      sociaId: socia.id,
      sociaName: socia.nombre_audio,
      sociaFotoUri: socia.foto_uri,
    });
  };

  const renderStars = (rating = 5) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={18}
        color={i < Math.round(rating) ? '#ffd54f' : '#333'}
        fill={i < Math.round(rating) ? '#ffd54f' : 'transparent'}
      />
    ));
  };

  if (!grupo) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#e6edf3" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {grupo.nombre_audio}
          </Text>
          <View style={styles.headerStars}>
            {renderStars(grupo.rating)}
            <Text style={styles.headerRating}>{grupo.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Toca tu foto para identificarte, o agrega un nuevo miembro.
          </Text>
        </View>

        {/* Members Grid */}
        <View style={styles.membersGrid}>
          {socias.map((socia) => (
            <TouchableOpacity
              key={socia.id}
              style={styles.memberCard}
              onPress={() => handleMemberPress(socia)}
              activeOpacity={0.7}
            >
              <View style={styles.memberAvatarContainer}>
                {socia.foto_uri ? (
                  <Image
                    source={{ uri: socia.foto_uri }}
                    style={styles.memberPhoto}
                  />
                ) : (
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: socia.avatar_color },
                    ]}
                  >
                    <Text style={styles.memberInitial}>
                      {socia.nombre_audio.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.memberName} numberOfLines={1}>
                {socia.nombre_audio}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Add Member Button */}
          <TouchableOpacity
            style={styles.addMemberCard}
            onPress={() => {
              confirmHaptic();
              setShowAddModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.addMemberIcon}>
              <UserPlus size={32} color="#66bb6a" strokeWidth={1.5} />
            </View>
            <Text style={styles.addMemberText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <UserPlus size={24} color="#66bb6a" />
              </View>
              <Text style={styles.modalTitle}>Nuevo Miembro</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowAddModal(false)}
              >
                <X size={22} color="#8b949e" />
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <Text style={styles.inputLabel}>Nombre del miembro</Text>
            <TextInput
              style={styles.textInput}
              value={newMemberName}
              onChangeText={setNewMemberName}
              placeholder="Escribe el nombre..."
              placeholderTextColor="#555"
              autoFocus
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddMember}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.confirmButtonText}>Agregar</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21253b',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#161b22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#21253b',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e6edf3',
    marginBottom: 4,
  },
  headerStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerRating: {
    fontSize: 14,
    color: '#8b949e',
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  instructions: {
    backgroundColor: '#161b22',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#21253b',
  },
  instructionText: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'flex-start',
  },
  memberCard: {
    width: '29%',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21253b',
  },
  memberAvatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#21253b',
  },
  memberPhoto: {
    width: '100%',
    height: '100%',
  },
  memberAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  memberName: {
    color: '#e6edf3',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  addMemberCard: {
    width: '29%',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#66bb6a33',
    borderStyle: 'dashed',
  },
  addMemberIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#66bb6a15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#66bb6a33',
    borderStyle: 'dashed',
  },
  addMemberText: {
    color: '#66bb6a',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#21253b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#66bb6a22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e6edf3',
    flex: 1,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0d1117',
    borderRadius: 14,
    padding: 16,
    color: '#e6edf3',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#21253b',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#21253b',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8b949e',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#66bb6a',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
