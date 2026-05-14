import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        headerStyle: { 
          backgroundColor: 'transparent',
        },
        headerTransparent: true,
        headerTintColor: Colors.text,
        headerTitleStyle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(10, 14, 23, 0.85)',
          borderTopWidth: 0,
          elevation: 0,
          height: 65,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null
        ),
        tabBarActiveTintColor: Colors.primaryLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontFamily: 'Poppins_500Medium', fontSize: 10, marginTop: 4 },
      }}>
      <Tabs.Screen name="index" options={{
        title: 'Profil',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="vehicles" options={{
        title: 'Araçlarım',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'car-sport' : 'car-sport-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="damage" options={{
        title: 'Hasar',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'scan' : 'scan-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="obd" options={{
        title: 'OBD',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'hardware-chip' : 'hardware-chip-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="recommend" options={{
        title: 'Tavsiye',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'bulb' : 'bulb-outline'} size={24} color={color} />,
      }} />
      <Tabs.Screen name="price" options={{
        title: 'Fiyat',
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={24} color={color} />,
      }} />
    </Tabs>
  );
}
