import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  Animated,
} from 'react-native';
import {
  Users,
  UserPlus,
  X,
  Mic,
  Play,
  RotateCcw,
  DollarSign,
  Volume2,
  ArrowLeft,
  Check,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { getSociasByGrupo, getAllGrupos, addSocia, getTotalAhorro, getAhorrosByGrupo } from '../database';
import { speakOnPress, confirmHaptic, speak, stopSpeaking } from '../utils/audioGuide';

const AVATAR_COLORS = [
  '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043',
  '#ffa726', '#26c6da', '#ec407a', '#7e57c2',
  '#5c6bc0', '#29b6f6',
];

export default function GroupDetailScreen({ navigation, route }) {
  const { grupoId } = route.params;
  const [grupo, setGrupo] = useState(null);
  const [socias, setSocias] = useState([]);
  const [totals, setTotals] = useState({ total_ahorro: 0, total_prestamo: 0, total_pago: 0 });
  const [movimientos, setMovimientos] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const pulseRef = useRef(null);
  const playerRef = useRef(null);
  const autoStopRef = useRef(null);
  const recordingRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const grupos = await getAllGrupos();
      const g = grupos.find((gr) => gr.id === grupoId);
      setGrupo(g);
      const s = await getSociasByGrupo(grupoId);
      setSocias(s);
      const t = await getTotalAhorro(grupoId);
      setTotals(t);
      const m = await getAhorrosByGrupo(grupoId);
      setMovimientos(m);
    } catch (e) {
      console.log('[GroupDetail] Error loading data:', e);
    }
  }, [grupoId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Voice guidance on mount
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(async () => {
        if (!grupo) return;
        speak(
          `Grupo ${grupo.nombre_audio}. ` +
          `Si eres parte del grupo, selecciona tu foto. ` +
          `Si eres miembro nuevo y no aparece tu foto, haz click en el icono verde. ` +
          `Si no eres miembro de este grupo, haz click en el botón azul. ` +
          `Si quieres saber el total, oprime el botón amarillo. ` +
          `Si quieres escuchar el historial de movimientos, selecciona los botones aqua. Los que están más arriba son los más recientes.`
        );
      }, 800);
      return () => clearTimeout(timer);
    }, [grupo])
  );

  const handleMemberPress = (socia) => {
    confirmHaptic();
    speakOnPress(`${socia.nombre_audio}. Verificando identidad.`);
    navigation.navigate('FaceVerify', {
      sociaId: socia.id,
      sociaName: socia.nombre_audio,
      fotoUri: socia.foto_uri,
      grupoId: grupoId,
    });
  };

  const handleTotalPress = () => {
    confirmHaptic();
    const neto = totals.total_ahorro - totals.total_prestamo + totals.total_pago;
    speak(`El total de la comunidad ${grupo?.nombre_audio || ''} es ${Math.floor(neto)} dólares.`);
  };

  const handleMovementPress = (mov, index) => {
    confirmHaptic();
    const tipoVoz = mov.tipo === 'ahorro' ? 'depósito' : 'retiro';
    const fecha = mov.created_at ? new Date(mov.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : 'fecha desconocida';
    speak(`Movimiento número ${index + 1}. ${mov.socia_nombre || 'Miembro'}. ${tipoVoz} de ${Math.floor(mov.monto)} dólares. El día ${fecha}.`);
  };

  const handleGoBack = () => {
    confirmHaptic();
    speak('Regresando a la lista de grupos.');
    navigation.goBack();
  };

  // === RECORDING FUNCTIONS using expo-av ===
  const startRecording = async () => {
    try {
      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        speak('Se necesita permiso del micrófono.');
        return;
      }

      // Stop any speech first
      stopSpeaking();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setRecordedUri(null);
      setIsRecording(true);
      confirmHaptic();

      // Pulse animation
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseRef.current.start();

      // Create and start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      console.log('[GroupDetail] Recording started with expo-av');

      // Auto-stop after 4 seconds
      autoStopRef.current = setTimeout(() => {
        doStopRecording();
      }, 4000);
    } catch (e) {
      console.log('[GroupDetail] Error starting recording:', e);
      setIsRecording(false);
      speak('Error al iniciar grabación.');
    }
  };

  const doStopRecording = async () => {
    try {
      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }

      const recording = recordingRef.current;
      if (!recording) {
        console.log('[GroupDetail] No recording object');
        setIsRecording(false);
        return;
      }

      console.log('[GroupDetail] Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('[GroupDetail] Recording URI:', uri);

      recordingRef.current = null;
      setIsRecording(false);
      confirmHaptic();
      setTimeout(() => confirmHaptic(), 200);

      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseAnim.setValue(1);
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        setTimeout(() => speak('No se grabó. Intenta de nuevo.'), 500);
        return;
      }

      // Save to permanent location
      const fileName = `nombre_${Date.now()}.m4a`;
      const permanentUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: permanentUri });

      console.log('[GroupDetail] Recording saved to:', permanentUri);
      setRecordedUri(permanentUri);
      setTimeout(() => speak('Nombre grabado.'), 300);
    } catch (e) {
      console.log('[GroupDetail] Error stopping recording:', e);
      setIsRecording(false);
      recordingRef.current = null;
      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseAnim.setValue(1);
      }
      setTimeout(() => speak('Error al grabar. Intenta de nuevo.'), 300);
    }
  };

  const stopRecording = () => { doStopRecording(); };

  const playRecording = async () => {
    if (!recordedUri) return;
    try {
      setIsPlaying(true);
      const { sound } = await Audio.Sound.createAsync({ uri: recordedUri });
      playerRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log('[GroupDetail] Error playing:', e);
      setIsPlaying(false);
    }
  };

  const confirmAddMember = async () => {
    if (!recordedUri) return;
    try {
      confirmHaptic();
      const color = AVATAR_COLORS[socias.length % AVATAR_COLORS.length];
      const name = `Miembro ${socias.length + 1}`;
      await addSocia(name, grupoId, color, null, recordedUri);
      speak('Miembro agregado exitosamente.');
      setShowAddModal(false);
      setRecordedUri(null);
      loadData();
    } catch (e) {
      console.log('[GroupDetail] Error adding member:', e);
      speak('Error al agregar miembro.');
    }
  };

  const openAddModal = () => {
    confirmHaptic();
    setRecordedUri(null);
    setShowAddModal(true);
    setTimeout(() => {
      speak('Presiona el botón del micrófono para grabar el nombre del nuevo miembro.');
    }, 500);
  };

  if (!grupo) return <View style={styles.container} />;

  const totalNeto = totals.total_ahorro - totals.total_prestamo + totals.total_pago;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#e6edf3" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {grupo.nombre_audio}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                  <Image source={{ uri: socia.foto_uri }} style={styles.memberPhoto} />
                ) : (
                  <View style={[styles.memberAvatar, { backgroundColor: socia.avatar_color }]}>
                    <Text style={styles.memberInitial}>
                      {socia.nombre_audio.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* GREEN Add Member Button */}
          <TouchableOpacity
            style={styles.addMemberCard}
            onPress={openAddModal}
            activeOpacity={0.7}
          >
            <View style={styles.addMemberIcon}>
              <UserPlus size={36} color="#fff" strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>

        {/* BLUE "Not my group" button */}
        <TouchableOpacity
          style={styles.notMyGroupBtn}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#fff" />
          <Text style={styles.notMyGroupText}>No soy miembro</Text>
        </TouchableOpacity>

        {/* YELLOW Total Button */}
        <TouchableOpacity
          style={styles.totalButton}
          onPress={handleTotalPress}
          activeOpacity={0.7}
        >
          <DollarSign size={28} color="#000" strokeWidth={2.5} />
          <Text style={styles.totalButtonText}>
            ${totalNeto.toFixed(2)}
          </Text>
          <Volume2 size={22} color="#000" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* AQUA Numbered Movement Buttons */}
        <View style={styles.movSection}>
          <Text style={styles.movSectionTitle}>Movimientos</Text>
          {movimientos.length === 0 ? (
            <View style={styles.movEmpty}>
              <Text style={styles.movEmptyText}>Sin movimientos aún</Text>
            </View>
          ) : (
            movimientos.map((mov, idx) => (
              <TouchableOpacity
                key={mov.id || idx}
                style={styles.movButton}
                onPress={() => handleMovementPress(mov, idx)}
                activeOpacity={0.7}
              >
                <View style={styles.movNumber}>
                  <Text style={styles.movNumberText}>{idx + 1}</Text>
                </View>
                <View style={styles.movInfo}>
                  <Text style={styles.movName} numberOfLines={1}>
                    {mov.socia_nombre || 'Miembro'}
                  </Text>
                  <Text style={styles.movDetail}>
                    {mov.tipo === 'ahorro' ? 'Depósito' : 'Retiro'} · ${mov.monto.toFixed(2)}
                  </Text>
                </View>
                <Volume2 size={18} color="#00838f" />
              </TouchableOpacity>
            ))
          )}
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
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => { setShowAddModal(false); stopSpeaking(); }}
            >
              <X size={24} color="#e6edf3" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Grabar Nombre</Text>

            {!recordedUri ? (
              <>
                {/* Record button */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    style={[styles.micButton, isRecording && styles.micButtonRecording]}
                    onPress={isRecording ? stopRecording : startRecording}
                    activeOpacity={0.7}
                  >
                    <Mic size={40} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
                <Text style={styles.micHint}>
                  {isRecording ? 'Habla ahora... se detiene solo' : 'Toca para grabar el nombre'}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.recordedActions}>
                  {/* Play */}
                  <TouchableOpacity style={styles.actionBtn} onPress={playRecording}>
                    <Play size={26} color="#42a5f5" />
                  </TouchableOpacity>
                  {/* Retry */}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { setRecordedUri(null); speak('Graba de nuevo.'); }}>
                    <RotateCcw size={26} color="#ffa726" />
                  </TouchableOpacity>
                  {/* Confirm */}
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={confirmAddMember}>
                    <Check size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.micHint}>Escuchar · Repetir · Confirmar</Text>
              </>
            )}
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
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0d1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21253b',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e6edf3',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  // Members grid
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  memberCard: {
    width: '29%',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#21253b',
  },
  memberAvatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#21253b',
  },
  memberPhoto: { width: '100%', height: '100%' },
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

  // GREEN add member
  addMemberCard: {
    width: '29%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#43a047',
    borderRadius: 20,
    padding: 12,
    minHeight: 96,
    elevation: 4,
  },
  addMemberIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // BLUE "not my group" button
  notMyGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e88e5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    elevation: 4,
  },
  notMyGroupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // YELLOW total button
  totalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd54f',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    gap: 10,
    elevation: 4,
  },
  totalButtonText: {
    color: '#000',
    fontSize: 26,
    fontWeight: '800',
  },

  // Movements section
  movSection: {
    marginBottom: 16,
  },
  movSectionTitle: {
    color: '#e6edf3',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  movEmpty: {
    backgroundColor: '#161b22',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#21253b',
  },
  movEmptyText: {
    color: '#555',
    fontSize: 14,
  },
  // AQUA movement buttons
  movButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00838f',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    elevation: 3,
  },
  movNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  movInfo: {
    flex: 1,
  },
  movName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  movDetail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },

  // Modal
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
    padding: 30,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#21253b',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  modalTitle: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#43a047',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  micButtonRecording: {
    backgroundColor: '#e53935',
  },
  micHint: {
    color: '#8b949e',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  recordedActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnGreen: {
    backgroundColor: '#43a047',
  },
});
