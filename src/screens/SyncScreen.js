import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Check,
  Smartphone,
  ArrowUpDown,
  Volume2,
  Shield,
} from 'lucide-react-native';
import { getUnsyncedLogs, markLogsSynced } from '../database';
import {
  speakOnPress,
  speakSyncGuide,
  confirmHaptic,
  warningHaptic,
  speak,
} from '../utils/audioGuide';

const MOCK_DEVICES = [
  { id: 1, name: 'Dispositivo de María', distance: '~5m', color: '#66bb6a' },
  { id: 2, name: 'Dispositivo de Rosa', distance: '~12m', color: '#42a5f5' },
  { id: 3, name: 'Dispositivo de Carmen', distance: '~20m', color: '#ab47bc' },
];

export default function SyncScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [syncingDevice, setSyncingDevice] = useState(null);
  const [syncedDevices, setSyncedDevices] = useState(new Set());
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const radarAnim = useRef(new Animated.Value(0)).current;
  const scanRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    speakSyncGuide();
    loadUnsyncedCount();
  }, []);

  const loadUnsyncedCount = async () => {
    try {
      const logs = await getUnsyncedLogs();
      setUnsyncedCount(logs.length);
    } catch (e) {
      console.log('[Sync] Error loading count:', e);
    }
  };

  const startScan = () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    setSyncedDevices(new Set());
    speak('Buscando dispositivos cercanos.');

    // Radar animation
    Animated.loop(
      Animated.timing(scanRotation, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Radar pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(radarAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulate finding devices over time
    setTimeout(() => {
      setDiscoveredDevices([MOCK_DEVICES[0]]);
      speakOnPress('Dispositivo encontrado.');
    }, 2000);

    setTimeout(() => {
      setDiscoveredDevices((prev) => [...prev, MOCK_DEVICES[1]]);
      speakOnPress('Otro dispositivo encontrado.');
    }, 4000);

    setTimeout(() => {
      setDiscoveredDevices((prev) => [...prev, MOCK_DEVICES[2]]);
      setIsScanning(false);
      scanRotation.setValue(0);
      radarAnim.setValue(0);
      speak('Búsqueda completa. Encontré 3 dispositivos.');
      confirmHaptic();
    }, 6000);
  };

  const syncWithDevice = async (device) => {
    setSyncingDevice(device.id);
    speak(`Sincronizando con ${device.name}.`);

    // Simulate sync delay
    setTimeout(async () => {
      try {
        const logs = await getUnsyncedLogs();
        if (logs.length > 0) {
          const ids = logs.map((l) => l.id);
          await markLogsSynced(ids);
        }

        setSyncedDevices((prev) => new Set([...prev, device.id]));
        setSyncingDevice(null);
        confirmHaptic();
        speak('Sincronización completa.');
        loadUnsyncedCount();
      } catch (e) {
        console.log('[Sync] Error:', e);
        warningHaptic();
        speak('Error en la sincronización.');
        setSyncingDevice(null);
      }
    }, 3000);
  };

  const spin = scanRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Audio guide */}
      <TouchableOpacity
        style={styles.guideButton}
        onPress={() => speakSyncGuide()}
      >
        <Volume2 size={28} color="#ffd54f" />
      </TouchableOpacity>

      {/* Radar visualization */}
      <View style={styles.radarContainer}>
        {/* Radar rings */}
        {[1, 2, 3].map((ring) => (
          <View
            key={ring}
            style={[
              styles.radarRing,
              {
                width: ring * 80,
                height: ring * 80,
                borderRadius: ring * 40,
              },
            ]}
          />
        ))}

        {/* Radar sweep */}
        {isScanning && (
          <Animated.View
            style={[styles.radarSweep, { transform: [{ rotate: spin }] }]}
          >
            <View style={styles.sweepLine} />
          </Animated.View>
        )}

        {/* Pulse animation */}
        {isScanning && (
          <Animated.View
            style={[
              styles.radarPulse,
              {
                opacity: radarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 0],
                }),
                transform: [
                  {
                    scale: radarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
        )}

        {/* Center icon */}
        <View style={styles.radarCenter}>
          <Smartphone size={32} color="#ffd54f" strokeWidth={2} />
        </View>

        {/* Discovered device icons on radar */}
        {discoveredDevices.map((d, i) => {
          const angle = (i * 120 + 30) * (Math.PI / 180);
          const dist = 60 + i * 20;
          return (
            <View
              key={d.id}
              style={[
                styles.radarDevice,
                {
                  top: '50%',
                  left: '50%',
                  marginTop: Math.sin(angle) * dist - 16,
                  marginLeft: Math.cos(angle) * dist - 16,
                },
              ]}
            >
              <Smartphone
                size={20}
                color={syncedDevices.has(d.id) ? '#66bb6a' : d.color}
              />
            </View>
          );
        })}
      </View>

      {/* Scan button */}
      <TouchableOpacity
        style={[styles.scanButton, isScanning && styles.scanButtonActive]}
        onPress={isScanning ? null : startScan}
        activeOpacity={0.7}
        disabled={isScanning}
      >
        {isScanning ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw size={40} color="#fff" strokeWidth={2} />
          </Animated.View>
        ) : (
          <Wifi size={40} color="#fff" strokeWidth={2} />
        )}
      </TouchableOpacity>

      {/* Unsynced logs indicator */}
      {unsyncedCount > 0 && (
        <TouchableOpacity
          style={styles.unsyncedBadge}
          onPress={() =>
            speakOnPress(
              `Tienes ${unsyncedCount} registros pendientes de sincronizar.`
            )
          }
        >
          <Shield size={24} color="#ffa726" />
          <View style={styles.badgeDots}>
            {Array.from({ length: Math.min(unsyncedCount, 8) }).map((_, i) => (
              <View key={i} style={styles.badgeDot} />
            ))}
          </View>
        </TouchableOpacity>
      )}

      {/* Discovered devices list */}
      <ScrollView
        style={styles.deviceList}
        contentContainerStyle={styles.deviceListContent}
      >
        {discoveredDevices.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[
              styles.deviceCard,
              syncedDevices.has(d.id) && styles.deviceCardSynced,
            ]}
            onPress={() => {
              if (!syncedDevices.has(d.id) && syncingDevice !== d.id) {
                syncWithDevice(d);
              } else if (syncedDevices.has(d.id)) {
                speakOnPress('Ya está sincronizado.');
              }
            }}
            activeOpacity={0.7}
          >
            <View
              style={[styles.deviceIcon, { backgroundColor: d.color + '33' }]}
            >
              <Smartphone size={28} color={d.color} />
            </View>

            {syncingDevice === d.id ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={28} color="#ffa726" />
              </Animated.View>
            ) : syncedDevices.has(d.id) ? (
              <Check size={28} color="#66bb6a" strokeWidth={3} />
            ) : (
              <ArrowUpDown size={28} color="#888" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    alignItems: 'center',
    paddingTop: 60,
  },
  guideButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 12,
    zIndex: 10,
  },
  radarContainer: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  radarSweep: {
    position: 'absolute',
    width: 260,
    height: 260,
    justifyContent: 'center',
  },
  sweepLine: {
    width: '50%',
    height: 2,
    backgroundColor: '#66bb6a',
    opacity: 0.6,
    alignSelf: 'flex-end',
  },
  radarPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#66bb6a',
  },
  radarCenter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffd54f',
    zIndex: 5,
  },
  radarDevice: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1565c0',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    elevation: 8,
    shadowColor: '#1565c0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanButtonActive: {
    backgroundColor: '#43a047',
    shadowColor: '#43a047',
  },
  unsyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ffa726',
    gap: 8,
  },
  badgeDots: {
    flexDirection: 'row',
    gap: 3,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffa726',
  },
  deviceList: {
    flex: 1,
    width: '100%',
    marginTop: 16,
  },
  deviceListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  deviceCard: {
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#21253b',
  },
  deviceCardSynced: {
    borderColor: '#2e7d32',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
