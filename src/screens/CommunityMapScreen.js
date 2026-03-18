import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Users, Star, Volume2, MapPin } from 'lucide-react-native';
import { Text } from 'react-native';
import { getAllGrupos } from '../database';
import { speakOnPress, speakMapGuide } from '../utils/audioGuide';

const { width, height } = Dimensions.get('window');

// We'll use a simplified map view that works reliably in Expo Go
// react-native-maps requires additional native setup; for Expo Go compatibility,
// we simulate a visual map with positioned community markers

const MOCK_COMMUNITIES = [
  {
    id: 1,
    nombre: 'Las Flores',
    lat: 0.3,
    lng: 0.4,
    rating: 4.5,
    miembros: 8,
    color: '#66bb6a',
  },
  {
    id: 2,
    nombre: 'Esperanza',
    lat: 0.55,
    lng: 0.6,
    rating: 5.0,
    miembros: 12,
    color: '#42a5f5',
  },
  {
    id: 3,
    nombre: 'Nuevo Amanecer',
    lat: 0.7,
    lng: 0.25,
    rating: 3.5,
    miembros: 6,
    color: '#ab47bc',
  },
  {
    id: 4,
    nombre: 'Sol Naciente',
    lat: 0.2,
    lng: 0.7,
    rating: 4.0,
    miembros: 10,
    color: '#ff7043',
  },
  {
    id: 5,
    nombre: 'Monte Verde',
    lat: 0.8,
    lng: 0.65,
    rating: 4.8,
    miembros: 15,
    color: '#ffa726',
  },
];

export default function CommunityMapScreen() {
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  useEffect(() => {
    speakMapGuide();
  }, []);

  const handleCommunityPress = (community) => {
    setSelectedCommunity(community);
    speakOnPress(
      `Grupo ${community.nombre}. ${community.miembros} miembros. Calificación: ${community.rating} estrellas.`
    );
  };

  return (
    <View style={styles.container}>
      {/* Audio guide button */}
      <TouchableOpacity
        style={styles.guideButton}
        onPress={() => speakMapGuide()}
      >
        <Volume2 size={28} color="#ffd54f" />
      </TouchableOpacity>

      {/* Visual Map Area */}
      <View style={styles.mapArea}>
        {/* Grid lines to simulate map */}
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`h-${i}`}
            style={[
              styles.gridLine,
              styles.gridLineH,
              { top: `${(i + 1) * 15}%` },
            ]}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={[
              styles.gridLine,
              styles.gridLineV,
              { left: `${(i + 1) * 15}%` },
            ]}
          />
        ))}

        {/* Community markers */}
        {MOCK_COMMUNITIES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.marker,
              {
                top: `${c.lat * 80 + 5}%`,
                left: `${c.lng * 80 + 5}%`,
                backgroundColor: c.color,
                borderColor:
                  selectedCommunity?.id === c.id ? '#ffd54f' : c.color,
                borderWidth: selectedCommunity?.id === c.id ? 4 : 2,
                transform: [
                  { scale: selectedCommunity?.id === c.id ? 1.3 : 1 },
                ],
              },
            ]}
            onPress={() => handleCommunityPress(c)}
            activeOpacity={0.7}
          >
            <Users size={24} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        ))}

        {/* "You are here" pin */}
        <View style={styles.youAreHere}>
          <MapPin size={32} color="#ffd54f" fill="#ffd54f" strokeWidth={2} />
        </View>
      </View>

      {/* Selected Community Info */}
      {selectedCommunity && (
        <View style={styles.infoPanel}>
          <View
            style={[
              styles.infoDot,
              { backgroundColor: selectedCommunity.color },
            ]}
          />
          <View style={styles.infoContent}>
            {/* Member dots */}
            <View style={styles.memberDots}>
              {Array.from({
                length: Math.min(selectedCommunity.miembros, 12),
              }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.memberDot,
                    { backgroundColor: selectedCommunity.color },
                  ]}
                />
              ))}
            </View>
            {/* Star rating */}
            <View style={styles.starRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={24}
                  color={
                    i < Math.round(selectedCommunity.rating)
                      ? '#ffd54f'
                      : '#333'
                  }
                  fill={
                    i < Math.round(selectedCommunity.rating)
                      ? '#ffd54f'
                      : 'transparent'
                  }
                />
              ))}
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              speakOnPress(
                `Grupo ${selectedCommunity.nombre}. ${selectedCommunity.miembros} socias. Calificación: ${selectedCommunity.rating} estrellas.`
              )
            }
            style={styles.speakBtn}
          >
            <Volume2 size={28} color="#ffd54f" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
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
  mapArea: {
    flex: 1,
    marginTop: 50,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#161b22',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#21253b',
    overflow: 'hidden',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  marker: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  youAreHere: {
    position: 'absolute',
    top: '45%',
    left: '45%',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#161b22',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#21253b',
    elevation: 8,
  },
  infoDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  memberDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  memberDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
  },
  speakBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 12,
    marginLeft: 12,
  },
});
