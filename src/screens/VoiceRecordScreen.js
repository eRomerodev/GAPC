import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Mic, MicOff, Check, X, Banknote, Volume2 } from 'lucide-react-native';
import { 
  useAudioRecorder, 
  requestRecordingPermissionsAsync, 
  setAudioModeAsync,
  RecordingPresets
} from 'expo-audio';
import {
  speakOnPress,
  speakRecordGuide,
  confirmHaptic,
  errorHaptic,
  speak,
} from '../utils/audioGuide';
import {
  simulateTranscription,
  parseVoiceCommand,
  getCommandSummary,
} from '../utils/nlpService';
import { addAhorro } from '../database';

const { width } = Dimensions.get('window');

export default function VoiceRecordScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const recordingRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const confirmAnim = useRef(new Animated.Value(0)).current;
  const billsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    speakRecordGuide();
  }, []);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Pulse animation for mic button
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Ring expansion
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        errorHaptic();
        speak('Necesito permiso para usar el micrófono.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      
      setIsRecording(true);
      speakOnPress('Grabando. Habla ahora.');
    } catch (err) {
      console.log('[VoiceRecord] Failed to start recording:', err);
      errorHaptic();
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);

      if (recorder.isRecording) {
        await recorder.stop();
        const uri = recorder.uri;

        await setAudioModeAsync({ allowsRecording: false });

        // Simulate NLP transcription
        const transcription = simulateTranscription();
        const parsed = parseVoiceCommand(transcription);

        if (parsed) {
          setLastResult(parsed);
          setShowConfirmation(true);

          // Animate confirmation
          Animated.spring(confirmAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();

          const summary = getCommandSummary(parsed);
          speak(`Entendí: ${summary}. Toca el botón verde para confirmar.`);
          confirmHaptic();
        } else {
          speak('No entendí el comando. Intenta de nuevo.');
          errorHaptic();
        }
      }
    } catch (err) {
      console.log('[VoiceRecord] Failed to stop recording:', err);
      errorHaptic();
    }
  };

  const confirmSaving = async () => {
    if (!lastResult) return;
    try {
      // Default to socia 1, grupo 1 for demo
      await addAhorro(1, 1, lastResult.monto, lastResult.action);
      setSavedCount((c) => c + lastResult.monto);
      confirmHaptic();
      speak('Ahorro guardado correctamente.');

      // Animate bills
      billsAnim.setValue(0);
      Animated.spring(billsAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 5,
      }).start();

      // Reset after delay
      setTimeout(() => {
        setShowConfirmation(false);
        setLastResult(null);
        confirmAnim.setValue(0);
      }, 2000);
    } catch (err) {
      console.log('[VoiceRecord] Error saving:', err);
      errorHaptic();
      speak('Error al guardar. Intenta de nuevo.');
    }
  };

  const cancelSaving = () => {
    setShowConfirmation(false);
    setLastResult(null);
    confirmAnim.setValue(0);
    speak('Cancelado.');
    errorHaptic();
  };

  return (
    <View style={styles.container}>
      {/* Saved bills visual */}
      <View style={styles.savedArea}>
        {Array.from({ length: Math.min(savedCount, 15) }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.savedBill,
              {
                transform: [
                  {
                    rotate: `${(i * 15 - 30) % 360}deg`,
                  },
                ],
                top: Math.floor(i / 5) * 35 + 20,
                left: (i % 5) * 55 + 20,
              },
            ]}
          >
            <Banknote size={36} color="#43a047" strokeWidth={1.5} />
          </Animated.View>
        ))}
      </View>

      {/* Audio guide button */}
      <TouchableOpacity
        style={styles.guideButton}
        onPress={() => speakRecordGuide()}
      >
        <Volume2 size={28} color="#ffd54f" />
      </TouchableOpacity>

      {/* Recording rings animation */}
      {isRecording && (
        <>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ringAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
                transform: [
                  {
                    scale: ringAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              styles.ring2,
              {
                opacity: ringAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.4, 0],
                }),
                transform: [
                  {
                    scale: ringAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      )}

      {/* Main Mic Button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micButtonRecording,
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.8}
          accessibilityLabel="Botón de micrófono"
          accessibilityHint="Mantén presionado para grabar"
        >
          {isRecording ? (
            <MicOff size={56} color="#fff" strokeWidth={2} />
          ) : (
            <Mic size={56} color="#fff" strokeWidth={2} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Confirmation Panel */}
      {showConfirmation && lastResult && (
        <Animated.View
          style={[
            styles.confirmPanel,
            {
              opacity: confirmAnim,
              transform: [
                {
                  translateY: confirmAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Show bills for the amount */}
          <View style={styles.confirmBills}>
            {Array.from({ length: Math.min(lastResult.monto, 10) }).map(
              (_, i) => (
                <Animated.View
                  key={i}
                  style={{
                    transform: [
                      {
                        scale: billsAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <Banknote
                    size={32}
                    color={
                      lastResult.action === 'ahorro'
                        ? '#66bb6a'
                        : lastResult.action === 'pago'
                        ? '#42a5f5'
                        : '#ef5350'
                    }
                    strokeWidth={1.5}
                  />
                </Animated.View>
              )
            )}
          </View>

          {/* Confirm / Cancel buttons */}
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={confirmSaving}
            >
              <Check size={40} color="#fff" strokeWidth={3} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={cancelSaving}
            >
              <X size={40} color="#fff" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedArea: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 200,
  },
  savedBill: {
    position: 'absolute',
  },
  guideButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 12,
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#ef5350',
  },
  ring2: {
    borderColor: '#ff7043',
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1565c0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#1565c0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  micButtonRecording: {
    backgroundColor: '#d32f2f',
    shadowColor: '#d32f2f',
  },
  confirmPanel: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: '#161b22',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#21253b',
    elevation: 8,
  },
  confirmBills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  confirmButton: {
    backgroundColor: '#2e7d32',
  },
  cancelButton: {
    backgroundColor: '#c62828',
  },
});
