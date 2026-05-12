import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{
        title: 'Profil',
        tabBarIcon: ({ color, focused }) => (
          <View style={focused ? styles.activeIcon : undefined}>
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          </View>
        ),
      }} />
      <Tabs.Screen name="vehicles" options={{
        title: 'Araçlarım',
        tabBarIcon: ({ color, focused }) => (
          <View style={focused ? styles.activeIcon : undefined}>
            <Ionicons name={focused ? 'car-sport' : 'car-sport-outline'} size={22} color={color} />
          </View>
        ),
      }} />
      <Tabs.Screen name="damage" options={{
        title: 'Hasar',
        tabBarIcon: ({ color, focused }) => (
          <View style={focused ? styles.activeIcon : undefined}>
            <Ionicons name={focused ? 'scan' : 'scan-outline'} size={22} color={color} />
          </View>
        ),
      }} />
      <Tabs.Screen name="obd" options={{
        title: 'OBD',
        tabBarIcon: ({ color, focused }) => (
          <View style={focused ? styles.activeIcon : undefined}>
            <Ionicons name={focused ? 'hardware-chip' : 'hardware-chip-outline'} size={22} color={color} />
          </View>
        ),
      }} />
      <Tabs.Screen name="price" options={{
        title: 'Fiyat',
        tabBarIcon: ({ color, focused }) => (
          <View style={focused ? styles.activeIcon : undefined}>
            <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={22} color={color} />
          </View>
        ),
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    backgroundColor: Colors.primary + '18',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 12,
  },
});
