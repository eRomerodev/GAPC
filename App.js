import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CircleDollarSign, Map, RefreshCw } from 'lucide-react-native';

import { initDB } from './src/database';
import DashboardScreen from './src/screens/DashboardScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import CommunityMapScreen from './src/screens/CommunityMapScreen';
import SyncScreen from './src/screens/SyncScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: Home,
  Transaction: CircleDollarSign,
  Map: Map,
  Sync: RefreshCw,
};

const ACTIVE_COLORS = {
  Dashboard: '#66bb6a',
  Transaction: '#42a5f5',
  Map: '#ab47bc',
  Sync: '#ff7043',
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDB();
        setDbReady(true);
        console.log('[GAPC] App ready');
      } catch (err) {
        console.error('[GAPC] DB initialization error:', err);
      }
    }
    setup();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1117" />
        <ActivityIndicator size="large" color="#66bb6a" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: styles.tabBar,
            tabBarIcon: ({ focused }) => {
              const IconComponent = TAB_ICONS[route.name];
              const activeColor = ACTIVE_COLORS[route.name];
              return (
                <View
                  style={[
                    styles.tabIconContainer,
                    focused && {
                      backgroundColor: activeColor + '22',
                      borderColor: activeColor,
                    },
                  ]}
                >
                  <IconComponent
                    size={focused ? 32 : 26}
                    color={focused ? activeColor : '#555'}
                    strokeWidth={focused ? 2.5 : 1.5}
                  />
                </View>
              );
            },
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Transaction" component={TransactionScreen} />
          <Tab.Screen name="Map" component={CommunityMapScreen} />
          <Tab.Screen name="Sync" component={SyncScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    backgroundColor: '#161b22',
    borderTopColor: '#21253b',
    borderTopWidth: 1,
    height: 80,
    paddingTop: 8,
    paddingBottom: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
