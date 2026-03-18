import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Users, Star, Volume2, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { getAllGrupos, getSociasByGrupo } from '../database';
import { speakOnPress, speakMapGuide } from '../utils/audioGuide';

// Default region: El Salvador
const DEFAULT_REGION = {
  latitude: 13.6929,
  longitude: -89.2182,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function CommunityMapScreen() {
  const [grupos, setGrupos] = useState([]);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [selectedSocias, setSelectedSocias] = useState([]);
  const [initialRegion, setInitialRegion] = useState(DEFAULT_REGION);
  const [locationReady, setLocationReady] = useState(false);
  const mapRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const g = await getAllGrupos();
      setGrupos(g);
    } catch (e) {
      console.log('[Map] Error loading groups:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const userRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          };
          setInitialRegion(userRegion);
        }
      } catch (e) {
        console.log('[Map] Location error:', e);
      } finally {
        setLocationReady(true);
      }
    })();

    speakMapGuide();
  }, []);

  const handleMarkerPress = async (grupo) => {
    setSelectedGrupo(grupo);
    speakOnPress(
      `Grupo ${grupo.nombre_audio}. ${grupo.miembros} miembros. Calificación: ${grupo.rating} estrellas.`
    );
    try {
      const socias = await getSociasByGrupo(grupo.id);
      setSelectedSocias(socias);
    } catch (e) {
      setSelectedSocias([]);
    }
  };

  const goToMyLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    } catch (e) {
      console.log('[Map] Error getting location:', e);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={16}
        color={i < Math.round(rating) ? '#ffd54f' : '#555'}
        fill={i < Math.round(rating) ? '#ffd54f' : 'transparent'}
      />
    ));
  };

  if (!locationReady) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* Real Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        mapType="standard"
      >
        {grupos.map((g) => {
          if (!g.ubicacion_lat || !g.ubicacion_lng) return null;
          return (
            <Marker
              key={g.id}
              coordinate={{
                latitude: g.ubicacion_lat,
                longitude: g.ubicacion_lng,
              }}
              onPress={() => handleMarkerPress(g)}
            >
              <View style={[
                styles.markerOuter,
                selectedGrupo?.id === g.id && styles.markerOuterSelected,
              ]}>
                <View style={[
                  styles.markerInner,
                  selectedGrupo?.id === g.id && styles.markerInnerSelected,
                ]}>
                  <Users size={18} color="#fff" strokeWidth={2.5} />
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top buttons */}
      <View style={styles.topButtons}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => speakMapGuide()}
        >
          <Volume2 size={22} color="#ffd54f" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.topBtn}
          onPress={goToMyLocation}
        >
          <Navigation size={22} color="#42a5f5" />
        </TouchableOpacity>
      </View>

      {/* Selected Group Info Panel */}
      {selectedGrupo && (
        <TouchableOpacity
          style={styles.infoPanel}
          onPress={() =>
            speakOnPress(
              `Grupo ${selectedGrupo.nombre_audio}. ${selectedGrupo.miembros} socias.`
            )
          }
          activeOpacity={0.8}
        >
          {/* Group icon */}
          <View style={styles.infoIcon}>
            <Users size={26} color="#ffd54f" strokeWidth={2} />
          </View>

          <View style={styles.infoTextArea}>
            <Text style={styles.infoName} numberOfLines={1}>
              {selectedGrupo.nombre_audio}
            </Text>

            <View style={styles.infoStars}>
              {renderStars(selectedGrupo.rating)}
            </View>

            <View style={styles.infoMembers}>
              {selectedSocias.slice(0, 6).map((s, i) => (
                <View
                  key={s.id}
                  style={[
                    styles.miniAvatar,
                    { backgroundColor: s.avatar_color, marginLeft: i > 0 ? -6 : 0 },
                  ]}
                />
              ))}
              <Text style={styles.infoMemberCount}>
                {selectedGrupo.miembros} miembros
              </Text>
            </View>
          </View>

          <View style={styles.speakBtn}>
            <Volume2 size={20} color="#ffd54f" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  topButtons: {
    position: 'absolute',
    top: 60,
    right: 16,
    gap: 10,
  },
  topBtn: {
    backgroundColor: 'rgba(22, 27, 34, 0.92)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#21253b',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerOuter: {
    padding: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 187, 106, 0.3)',
  },
  markerOuterSelected: {
    backgroundColor: 'rgba(255, 213, 79, 0.4)',
  },
  markerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#66bb6a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  markerInnerSelected: {
    backgroundColor: '#ffd54f',
    borderColor: '#ffd54f',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#21253b',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#21253b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextArea: {
    flex: 1,
  },
  infoName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e6edf3',
    marginBottom: 3,
  },
  infoStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 5,
  },
  infoMembers: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#161b22',
  },
  infoMemberCount: {
    color: '#8b949e',
    fontSize: 12,
    marginLeft: 6,
  },
  speakBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 10,
    marginLeft: 8,
  },
});
