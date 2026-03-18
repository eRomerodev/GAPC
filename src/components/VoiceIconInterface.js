import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Home,
  Mic,
  Map,
  RefreshCw,
  Banknote,
  Users,
  Star,
  TrendingUp,
  Shield,
  Volume2,
  CircleDollarSign,
  HandCoins,
} from 'lucide-react-native';
import { speakOnPress, confirmHaptic } from '../utils/audioGuide';

/**
 * VoiceIconInterface - Demo component showing icon-based navigation without text.
 * 
 * This component demonstrates the accessibility-first design philosophy:
 * - Large, high-contrast icons on dark backgrounds
 * - Every icon triggers audio speech describing its function
 * - Haptic feedback on every interaction
 * - No text labels — purely visual + auditory navigation
 */

const ICON_ITEMS = [
  {
    id: 'home',
    Icon: Home,
    label: 'Inicio. Aquí puedes ver tu ahorro total.',
    color: '#66bb6a',
    bg: '#1b5e20',
  },
  {
    id: 'mic',
    Icon: Mic,
    label: 'Micrófono. Mantén presionado para grabar tu ahorro.',
    color: '#42a5f5',
    bg: '#0d47a1',
  },
  {
    id: 'map',
    Icon: Map,
    label: 'Mapa. Encuentra grupos de ahorro cercanos.',
    color: '#ab47bc',
    bg: '#4a148c',
  },
  {
    id: 'sync',
    Icon: RefreshCw,
    label: 'Sincronizar. Comparte tus datos con dispositivos cercanos.',
    color: '#ff7043',
    bg: '#bf360c',
  },
  {
    id: 'savings',
    Icon: Banknote,
    label: 'Billetes. Cada billete representa tu ahorro.',
    color: '#ffd54f',
    bg: '#f57f17',
  },
  {
    id: 'members',
    Icon: Users,
    label: 'Socias. Las personas de tu grupo de ahorro.',
    color: '#4dd0e1',
    bg: '#006064',
  },
  {
    id: 'rating',
    Icon: Star,
    label: 'Estrellas. La calificación de cada grupo.',
    color: '#ffd54f',
    bg: '#e65100',
  },
  {
    id: 'growth',
    Icon: TrendingUp,
    label: 'Crecimiento. Tu ahorro está subiendo.',
    color: '#a5d6a7',
    bg: '#2e7d32',
  },
  {
    id: 'security',
    Icon: Shield,
    label: 'Seguridad. Tus datos están protegidos.',
    color: '#90caf9',
    bg: '#1565c0',
  },
  {
    id: 'coins',
    Icon: CircleDollarSign,
    label: 'Monedas. Ahorro en monedas pequeñas.',
    color: '#ffcc02',
    bg: '#827717',
  },
  {
    id: 'deposit',
    Icon: HandCoins,
    label: 'Depositar. Agrega dinero a tu ahorro.',
    color: '#81c784',
    bg: '#33691e',
  },
  {
    id: 'audio',
    Icon: Volume2,
    label: 'Audio. Toca cualquier icono para escuchar qué significa.',
    color: '#ffd54f',
    bg: '#263238',
  },
];

export default function VoiceIconInterface({ onNavigate }) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.grid}
    >
      {ICON_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.iconButton, { backgroundColor: item.bg }]}
          onPress={() => {
            speakOnPress(item.label);
            confirmHaptic();
            if (onNavigate) onNavigate(item.id);
          }}
          activeOpacity={0.7}
          accessibilityLabel={item.label}
        >
          <item.Icon
            size={44}
            color={item.color}
            strokeWidth={2}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 60,
    gap: 16,
    justifyContent: 'center',
  },
  iconButton: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
