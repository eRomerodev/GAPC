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
  Alert,
  Animated,
} from 'react-native';
import {
  Users,
  Star,
  Plus,
  ArrowLeft,
  UserPlus,
  X,
  Mic,
  Square,
  Play,
  RotateCcw,
  DollarSign,
  Volume2,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
} from 'lucide-react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
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
  const isRecordingRef = useRef(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const pulseRef = useRef(null);
  const playerRef = useRef(null);
  const autoStopRef = useRef(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

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

  // Start recording - NO TTS HERE to avoid mic conflict
  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        speak('Se necesita permiso del micrófono.');
        return;
      }

      // CRITICAL: Stop any active speech before recording
      stopSpeaking();

      // Small delay to ensure TTS audio system is fully released
      await new Promise(resolve => setTimeout(resolve, 500));

      setRecordedUri(null);
      setIsRecording(true);
      isRecordingRef.current = true;
      confirmHaptic();

      // Pulse animation
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseRef.current.start();

      // Start recording
      recorder.record();
      console.log('[GroupDetail] Recording started, uri will be at recorder.uri');

      // Auto-stop after 4 seconds
      autoStopRef.current = setTimeout(() => {
        doStopRecording();
      }, 4000);

    } catch (e) {
      console.log('[GroupDetail] Error starting recording:', e);
      setIsRecording(false);
    }
  };

  // Internal stop function - NO TTS HERE
  const doStopRecording = async () => {
    try {
      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }

      // Always try to stop - don't check isRecording (stale closure)
      console.log('[GroupDetail] Calling recorder.stop()...');
      await recorder.stop();
      console.log('[GroupDetail] recorder.stop() completed');

      setIsRecording(false);
      isRecordingRef.current = false;

      // Double haptic to indicate recording stopped
      confirmHaptic();
      setTimeout(() => confirmHaptic(), 200);

      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseAnim.setValue(1);
      }

      const recordingUri = recorder.uri;
      console.log('[GroupDetail] Recording stopped, URI:', recordingUri);

      if (!recordingUri) {
        console.log('[GroupDetail] No recording URI available');
        // Still set a flag so user can retry
        setTimeout(() => speak('No se grabó. Intenta de nuevo.'), 500);
        return;
      }

      // Save recording permanently
      const fileName = `nombre_${Date.now()}.m4a`;
      const permanentUri = FileSystem.documentDirectory + fileName;

      await FileSystem.copyAsync({
        from: recordingUri,
        to: permanentUri,
      });

      console.log('[GroupDetail] Recording saved to:', permanentUri);
      setRecordedUri(permanentUri);

      // NOW it's safe to speak again (recording is done)
      setTimeout(() => speak('Nombre grabado.'), 300);
    } catch (e) {
      console.log('[GroupDetail] Error stopping recording:', e);
      setIsRecording(false);
      if (pulseRef.current) {
        pulseRef.current.stop();
        pulseAnim.setValue(1);
      }
      setTimeout(() => speak('Error al grabar. Intenta de nuevo.'), 300);
    }
  };

  // Stop recording (manual tap)
  const stopRecording = () => {
    doStopRecording();
  };

  // Play recording
  const playRecording = async () => {
    if (!recordedUri) return;
    try {
      // Use AudioModule to play the recorded file
      const { createAudioPlayer } = require('expo-audio');
      if (playerRef.current) {
        playerRef.current.remove();
      }
      const player = createAudioPlayer({ uri: recordedUri });
      playerRef.current = player;
      player.play();
      setIsPlaying(true);
      
      // Reset playing state after a reasonable duration
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
    } catch (e) {
      console.log('[GroupDetail] Error playing recording:', e);
      setIsPlaying(false);
    }
  };

  // Add member with voice name
  const handleAddMember = async () => {
    if (!recordedUri) {
      speak('Primero graba tu nombre con el micrófono.');
      return;
    }
    try {
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const memberLabel = `Miembro ${socias.length + 1}`;
      await addSocia(memberLabel, grupoId, randomColor, null, recordedUri);
      confirmHaptic();
      setRecordedUri(null);
      setShowAddModal(false);
      await loadData();
      speak('Nuevo miembro agregado al grupo.');
    } catch (e) {
      console.log('[GroupDetail] Error adding member:', e);
      Alert.alert('Error', 'No se pudo agregar el miembro.');
    }
  };

  const handleMemberPress = (socia) => {
    confirmHaptic();
    // Play the member's audio name if available
    if (socia.nombre_audio_uri) {
      try {
        const { createAudioPlayer } = require('expo-audio');
        const player = createAudioPlayer({ uri: socia.nombre_audio_uri });
        player.play();
      } catch (e) {
        // ignore
      }
    }
    navigation.navigate('FaceVerify', {
      grupoId,
      sociaId: socia.id,
      sociaName: socia.nombre_audio,
      sociaFotoUri: socia.foto_uri,
    });
  };

  const openAddModal = () => {
    confirmHaptic();
    setRecordedUri(null);
    setIsRecording(false);
    setShowAddModal(true);
    // Guide the user with voice
    setTimeout(() => {
      speak('Presiona el botón del micrófono para grabar el nombre del nuevo miembro.');
    }, 500);
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
        {/* Instructions - spoken aloud on mount */}
        <TouchableOpacity
          style={styles.instructions}
          onPress={() => speak('Toca tu foto para identificarte o presiona el botón de más para agregar un nuevo miembro.')}
          activeOpacity={0.7}
        >
          <Mic size={20} color="#66bb6a" />
          <Text style={styles.instructionText}>
            Toca tu foto para identificarte
          </Text>
        </TouchableOpacity>

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
              {socia.nombre_audio_uri && (
                <View style={styles.hasAudioBadge}>
                  <Mic size={10} color="#66bb6a" />
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Add Member Button */}
          <TouchableOpacity
            style={styles.addMemberCard}
            onPress={openAddModal}
            activeOpacity={0.7}
          >
            <View style={styles.addMemberIcon}>
              <UserPlus size={32} color="#66bb6a" strokeWidth={1.5} />
            </View>
            <Text style={styles.addMemberText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* Community Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalCard}>
            <View style={styles.totalIconWrap}>
              <DollarSign size={22} color="#66bb6a" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>Total de la comunidad</Text>
              <Text style={styles.totalAmount}>
                ${(totals.total_ahorro - totals.total_prestamo + totals.total_pago).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const neto = totals.total_ahorro - totals.total_prestamo + totals.total_pago;
                speak(`El total de la comunidad es ${Math.floor(neto)} dólares.`);
              }}
              style={styles.speakTotalBtn}
            >
              <Volume2 size={20} color="#ffd54f" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Transaction Log */}
        <View style={styles.logSection}>
          <TouchableOpacity
            style={styles.logHeader}
            onPress={() => {
              if (movimientos.length === 0) {
                speak('No hay movimientos registrados en esta comunidad.');
              } else {
                const resumen = movimientos.slice(0, 3).map(m => {
                  const tipoText = m.tipo === 'ahorro' ? 'ahorro' : m.tipo === 'prestamo' ? 'préstamo' : 'pago';
                  return `${m.socia_nombre || 'Miembro'}: ${tipoText} de ${Math.floor(m.monto)} dólares`;
                }).join('. ');
                speak(`Últimos movimientos. ${resumen}.`);
              }
            }}
            activeOpacity={0.7}
          >
            <Volume2 size={18} color="#42a5f5" />
            <Text style={styles.logTitle}>Registro de movimientos</Text>
            <Text style={styles.logCount}>{movimientos.length}</Text>
          </TouchableOpacity>

          {movimientos.length === 0 ? (
            <View style={styles.logEmpty}>
              <Text style={styles.logEmptyText}>Sin movimientos aún</Text>
            </View>
          ) : (
            movimientos.slice(0, 10).map((mov, idx) => {
              const isAhorro = mov.tipo === 'ahorro';
              const isPrestamo = mov.tipo === 'prestamo';
              const tipoLabel = isAhorro ? 'Ahorro' : isPrestamo ? 'Préstamo' : 'Pago';
              const tipoColor = isAhorro ? '#66bb6a' : isPrestamo ? '#ef5350' : '#42a5f5';
              const TipoIcon = isAhorro ? TrendingUp : isPrestamo ? TrendingDown : ArrowDownLeft;
              const fecha = mov.created_at ? new Date(mov.created_at).toLocaleDateString('es') : '';

              return (
                <TouchableOpacity
                  key={mov.id || idx}
                  style={styles.logItem}
                  onPress={() => {
                    const tipoVoz = isAhorro ? 'ahorro' : isPrestamo ? 'préstamo' : 'pago';
                    speak(`${mov.socia_nombre || 'Miembro'} hizo un ${tipoVoz} de ${Math.floor(mov.monto)} dólares.`);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.logDot, { backgroundColor: tipoColor }]}>
                    <TipoIcon size={14} color="#fff" />
                  </View>
                  <View style={styles.logItemText}>
                    <Text style={styles.logItemName} numberOfLines={1}>
                      {mov.socia_nombre || 'Miembro'}
                    </Text>
                    <Text style={styles.logItemDate}>{fecha}</Text>
                  </View>
                  <View style={styles.logItemRight}>
                    <Text style={[styles.logItemType, { color: tipoColor }]}>{tipoLabel}</Text>
                    <Text style={[styles.logItemAmount, { color: tipoColor }]}>
                      {isAhorro ? '+' : '-'}${mov.monto.toFixed(2)}
                    </Text>
                  </View>
                  <Volume2 size={16} color="#555" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Member Modal - VOICE BASED */}
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

            {/* Voice Recording Section */}
            <View style={styles.voiceSection}>
              {!recordedUri ? (
                // Recording controls
                <>
                  <Text style={styles.voiceLabel}>
                    {isRecording ? 'Grabando...' : 'Graba el nombre'}
                  </Text>

                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                      style={[
                        styles.micButton,
                        isRecording && styles.micButtonRecording,
                      ]}
                      onPress={isRecording ? stopRecording : startRecording}
                      activeOpacity={0.7}
                    >
                      {isRecording ? (
                        <Square size={36} color="#fff" fill="#fff" />
                      ) : (
                        <Mic size={48} color="#fff" strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  <Text style={styles.micHint}>
                    {isRecording
                      ? 'Habla ahora... se detiene solo'
                      : 'Toca para grabar el nombre'}
                  </Text>
                </>
              ) : (
                // Playback controls
                <>
                  <View style={styles.recordedBadge}>
                    <Mic size={20} color="#66bb6a" />
                    <Text style={styles.recordedText}>Nombre grabado</Text>
                  </View>

                  <View style={styles.playbackRow}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={playRecording}
                      activeOpacity={0.7}
                    >
                      <Play size={24} color="#42a5f5" fill="#42a5f5" />
                      <Text style={styles.playText}>Escuchar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rerecordButton}
                      onPress={() => {
                        setRecordedUri(null);
                        speak('Graba el nombre de nuevo.');
                      }}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={20} color="#ffa726" />
                      <Text style={styles.rerecordText}>Repetir</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setRecordedUri(null);
                  setIsRecording(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !recordedUri && styles.confirmButtonDisabled,
                ]}
                onPress={handleAddMember}
                disabled={!recordedUri}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instructionText: {
    color: '#8b949e',
    fontSize: 14,
    flex: 1,
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
    position: 'relative',
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
  hasAudioBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#66bb6a22',
    justifyContent: 'center',
    alignItems: 'center',
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
  // Voice section
  voiceSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  voiceLabel: {
    color: '#e6edf3',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  micButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#66bb6a',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#66bb6a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  micButtonRecording: {
    backgroundColor: '#ef5350',
    shadowColor: '#ef5350',
  },
  micHint: {
    color: '#8b949e',
    fontSize: 13,
    marginTop: 16,
  },
  recordedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#66bb6a22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  recordedText: {
    color: '#66bb6a',
    fontSize: 15,
    fontWeight: '600',
  },
  playbackRow: {
    flexDirection: 'row',
    gap: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#42a5f522',
    borderWidth: 1,
    borderColor: '#42a5f544',
  },
  playText: {
    color: '#42a5f5',
    fontSize: 14,
    fontWeight: '600',
  },
  rerecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#ffa72622',
    borderWidth: 1,
    borderColor: '#ffa72644',
  },
  rerecordText: {
    color: '#ffa726',
    fontSize: 14,
    fontWeight: '600',
  },
  // Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
  confirmButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Total section
  totalSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#66bb6a33',
  },
  totalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#66bb6a22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  totalLabel: {
    color: '#8b949e',
    fontSize: 13,
  },
  totalAmount: {
    color: '#66bb6a',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  speakTotalBtn: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#21253b',
  },
  // Log section
  logSection: {
    marginTop: 16,
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#21253b',
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#21253b',
    gap: 8,
  },
  logTitle: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  logCount: {
    color: '#8b949e',
    fontSize: 13,
    backgroundColor: '#21253b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  logEmptyText: {
    color: '#555',
    fontSize: 14,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#21253b11',
  },
  logDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logItemText: {
    flex: 1,
  },
  logItemName: {
    color: '#e6edf3',
    fontSize: 13,
    fontWeight: '500',
  },
  logItemDate: {
    color: '#555',
    fontSize: 11,
    marginTop: 1,
  },
  logItemRight: {
    alignItems: 'flex-end',
  },
  logItemType: {
    fontSize: 11,
    fontWeight: '600',
  },
  logItemAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
});
