import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ArrowLeft,
  Camera,
  Check,
  X,
} from 'lucide-react-native';
import { updateSociaFoto } from '../database';
import { confirmHaptic, speak } from '../utils/audioGuide';

export default function FaceVerifyScreen({ navigation, route }) {
  const { grupoId, sociaId, sociaName, fotoUri } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef(null);

  const isFirstTime = !fotoUri;

  // Voice guidance on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isFirstTime) {
        speak('Toma tu foto para registrarte. Presiona el botón de la cámara.');
      } else {
        speak('Muestra tu rostro a la cámara y toma la foto.');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      confirmHaptic();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      setCapturedPhoto(photo.uri);

      // Voice guidance with big buttons
      setTimeout(() => {
        speak('Selecciona el botón verde si eres el mismo de la foto. Selecciona el botón rojo si no eres el de la foto.');
      }, 500);
    } catch (e) {
      console.log('[FaceVerify] Error taking photo:', e);
      speak('No se pudo tomar la foto. Intenta de nuevo.');
    }
  };

  // GREEN button - confirm identity
  const handleConfirm = async () => {
    try {
      setIsSaving(true);
      confirmHaptic();

      const fileName = `socia_${sociaId}_${Date.now()}.jpg`;
      const permanentUri = FileSystem.documentDirectory + fileName;

      await FileSystem.copyAsync({
        from: capturedPhoto,
        to: permanentUri,
      });

      await updateSociaFoto(sociaId, permanentUri);

      speak(`Bienvenida, ${sociaName}.`);

      navigation.replace('MainTabs', {
        grupoId,
        sociaId,
        sociaName,
      });
    } catch (e) {
      console.log('[FaceVerify] Error saving photo:', e);
      speak('Error al guardar la foto. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // GREEN button for existing members (no save needed)
  const handleVerifyConfirm = () => {
    confirmHaptic();
    speak(`Bienvenida, ${sociaName}.`);
    navigation.replace('MainTabs', {
      grupoId,
      sociaId,
      sociaName,
    });
  };

  // RED button - not me
  const handleDeny = () => {
    confirmHaptic();
    speak('Regresando. Selecciona tu foto correcta.');
    navigation.goBack();
  };

  // Retry
  const handleRetry = () => {
    setCapturedPhoto(null);
    speak('Intenta de nuevo. Toma otra foto.');
  };

  // Permission loading
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#66bb6a" />
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Camera size={64} color="#66bb6a" strokeWidth={1.5} />
          <Text style={styles.permissionTitle}>Acceso a la Cámara</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Permitir Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Photo taken - show comparison with BIG GREEN/RED buttons
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        {/* Photos */}
        <View style={styles.compareContainer}>
          {/* Show both photos if existing member */}
          {!isFirstTime && fotoUri ? (
            <View style={styles.photoRow}>
              <View style={styles.photoCard}>
                <Image source={{ uri: fotoUri }} style={styles.comparePhoto} />
              </View>
              <View style={styles.photoCard}>
                <Image source={{ uri: capturedPhoto }} style={styles.comparePhoto} />
              </View>
            </View>
          ) : (
            <View style={styles.singlePhotoCard}>
              <Image source={{ uri: capturedPhoto }} style={styles.singlePhoto} />
            </View>
          )}
        </View>

        {isSaving ? (
          <ActivityIndicator size="large" color="#66bb6a" style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.bigButtonContainer}>
            {/* BIG GREEN BUTTON - Yes, it's me */}
            <TouchableOpacity
              style={styles.bigGreenButton}
              onPress={isFirstTime ? handleConfirm : handleVerifyConfirm}
              activeOpacity={0.7}
            >
              <Check size={60} color="#fff" strokeWidth={3} />
            </TouchableOpacity>

            {/* BIG RED BUTTON - No, not me */}
            <TouchableOpacity
              style={styles.bigRedButton}
              onPress={handleDeny}
              activeOpacity={0.7}
            >
              <X size={60} color="#fff" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      >
        {/* Top bar */}
        <View style={styles.cameraTopBar}>
          <TouchableOpacity style={styles.cameraBackBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cameraName}>{sociaName}</Text>
        </View>

        {/* Face guide */}
        <View style={styles.faceGuide}>
          <View style={styles.faceOval} />
        </View>

        {/* Capture button */}
        <View style={styles.cameraBottomBar}>
          <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
            <View style={styles.captureInner}>
              <Camera size={36} color="#fff" strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>
      </CameraView>
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
  // Permission
  permissionCard: {
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e6edf3',
    marginTop: 20,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#66bb6a',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backLink: { marginTop: 16 },
  backLinkText: { color: '#8b949e', fontSize: 14 },
  // Camera
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  cameraBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cameraName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  faceGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: 220,
    height: 300,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(102, 187, 106, 0.6)',
    borderStyle: 'dashed',
  },
  cameraBottomBar: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(102, 187, 106, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#66bb6a',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#66bb6a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Compare
  compareContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  photoCard: {
    flex: 1,
  },
  comparePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#21253b',
  },
  singlePhotoCard: {
    alignItems: 'center',
  },
  singlePhoto: {
    width: 220,
    height: 280,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#66bb6a44',
  },
  // BIG BUTTONS
  bigButtonContainer: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 40,
    paddingHorizontal: 32,
  },
  bigGreenButton: {
    flex: 1,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#43a047',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#43a047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  bigRedButton: {
    flex: 1,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
