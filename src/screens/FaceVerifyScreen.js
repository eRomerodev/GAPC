import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ArrowLeft,
  Camera,
  Check,
  X,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';
import { updateSociaFoto } from '../database';
import { speakOnPress, confirmHaptic } from '../utils/audioGuide';

export default function FaceVerifyScreen({ navigation, route }) {
  const { grupoId, sociaId, sociaName, sociaFotoUri } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef(null);

  const isFirstTime = !sociaFotoUri;

  // Take photo
  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      confirmHaptic();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      setCapturedPhoto(photo.uri);

      if (isFirstTime) {
        speakOnPress('Foto tomada. Confirma para guardar tu foto de registro.');
      } else {
        setIsComparing(true);
        speakOnPress('Foto tomada. Confirma que eres tú para continuar.');
      }
    } catch (e) {
      console.log('[FaceVerify] Error taking photo:', e);
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  // Save photo and proceed
  const handleConfirm = async () => {
    try {
      setIsSaving(true);
      confirmHaptic();

      // Save photo permanently
      const fileName = `socia_${sociaId}_${Date.now()}.jpg`;
      const permanentUri = FileSystem.documentDirectory + fileName;

      await FileSystem.copyAsync({
        from: capturedPhoto,
        to: permanentUri,
      });

      // Update database with photo URI
      await updateSociaFoto(sociaId, permanentUri);

      speakOnPress(`Bienvenida, ${sociaName}.`);

      // Navigate to main tabs
      navigation.replace('MainTabs', {
        grupoId,
        sociaId,
        sociaName,
      });
    } catch (e) {
      console.log('[FaceVerify] Error saving photo:', e);
      Alert.alert('Error', 'No se pudo guardar la foto.');
    } finally {
      setIsSaving(false);
    }
  };

  // Skip photo and proceed (for existing members)
  const handleVerifyConfirm = () => {
    confirmHaptic();
    speakOnPress(`Bienvenida, ${sociaName}.`);
    navigation.replace('MainTabs', {
      grupoId,
      sociaId,
      sociaName,
    });
  };

  // Retry taking photo
  const handleRetry = () => {
    setCapturedPhoto(null);
    setIsComparing(false);
  };

  // Permission not granted yet
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#66bb6a" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Camera size={64} color="#66bb6a" strokeWidth={1.5} />
          <Text style={styles.permissionTitle}>Acceso a la Cámara</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a tu cámara para verificar tu identidad.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Permitir Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Comparison view (captured photo vs stored photo)
  if (capturedPhoto && isComparing && !isFirstTime) {
    return (
      <View style={styles.container}>
        <View style={styles.compareHeader}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#e6edf3" />
          </TouchableOpacity>
          <Text style={styles.compareTitle}>Verificación</Text>
        </View>

        <View style={styles.compareContainer}>
          <Text style={styles.compareLabel}>¿Eres {sociaName}?</Text>

          <View style={styles.photoComparison}>
            {/* Stored Photo */}
            <View style={styles.comparePhotoCard}>
              <Text style={styles.comparePhotoLabel}>Registrada</Text>
              <Image
                source={{ uri: sociaFotoUri }}
                style={styles.comparePhoto}
              />
            </View>

            {/* Captured Photo */}
            <View style={styles.comparePhotoCard}>
              <Text style={styles.comparePhotoLabel}>Actual</Text>
              <Image
                source={{ uri: capturedPhoto }}
                style={styles.comparePhoto}
              />
            </View>
          </View>

          <View style={styles.compareActions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <RefreshCw size={20} color="#8b949e" />
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.denyButton}
              onPress={() => navigation.goBack()}
            >
              <X size={20} color="#ef5350" />
              <Text style={styles.denyText}>No soy yo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifyConfirm}
            >
              <ShieldCheck size={20} color="#fff" />
              <Text style={styles.verifyText}>Soy yo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // First time registration confirmation
  if (capturedPhoto && isFirstTime) {
    return (
      <View style={styles.container}>
        <View style={styles.compareHeader}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#e6edf3" />
          </TouchableOpacity>
          <Text style={styles.compareTitle}>Registro</Text>
        </View>

        <View style={styles.registerContainer}>
          <ShieldCheck size={48} color="#66bb6a" strokeWidth={1.5} />
          <Text style={styles.registerTitle}>
            Registrar foto de {sociaName}
          </Text>
          <Text style={styles.registerSubtitle}>
            Esta foto se usará para verificar tu identidad en el futuro.
          </Text>

          <Image source={{ uri: capturedPhoto }} style={styles.registerPhoto} />

          {isSaving ? (
            <ActivityIndicator
              size="large"
              color="#66bb6a"
              style={{ marginTop: 24 }}
            />
          ) : (
            <View style={styles.registerActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <RefreshCw size={20} color="#8b949e" />
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerConfirmButton}
                onPress={handleConfirm}
              >
                <Check size={20} color="#fff" />
                <Text style={styles.verifyText}>Confirmar y Entrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      >
        {/* Top bar */}
        <View style={styles.cameraTopBar}>
          <TouchableOpacity
            style={styles.cameraBackBtn}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cameraName}>{sociaName}</Text>
        </View>

        {/* Face guide overlay */}
        <View style={styles.faceGuide}>
          <View style={styles.faceOval} />
        </View>

        {/* Bottom controls */}
        <View style={styles.cameraBottomBar}>
          <Text style={styles.cameraInstruction}>
            {isFirstTime
              ? 'Toma tu foto de registro'
              : 'Muestra tu rostro para verificar'}
          </Text>
          <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
            <View style={styles.captureInner}>
              <Camera size={32} color="#fff" strokeWidth={2} />
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
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: '#8b949e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#66bb6a',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    color: '#8b949e',
    fontSize: 14,
  },
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  cameraInstruction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 187, 106, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#66bb6a',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#66bb6a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Compare
  compareHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerBackBtn: {
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
  compareTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e6edf3',
  },
  compareContainer: {
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  compareLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e6edf3',
    marginBottom: 24,
  },
  photoComparison: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  comparePhotoCard: {
    alignItems: 'center',
  },
  comparePhotoLabel: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  comparePhoto: {
    width: 140,
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#21253b',
  },
  compareActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21253b',
  },
  retryText: {
    color: '#8b949e',
    fontSize: 14,
    fontWeight: '600',
  },
  denyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#ef535015',
    borderWidth: 1,
    borderColor: '#ef535044',
  },
  denyText: {
    color: '#ef5350',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#66bb6a',
  },
  verifyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Register
  registerContainer: {
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  registerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e6edf3',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  registerSubtitle: {
    fontSize: 14,
    color: '#8b949e',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  registerPhoto: {
    width: 200,
    height: 260,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#66bb6a44',
  },
  registerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  registerConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#66bb6a',
  },
});
