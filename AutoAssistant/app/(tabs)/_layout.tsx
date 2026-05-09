import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Profil',
        }}
      />
      <Tabs.Screen
        name="damage"
        options={{
          title: 'Hasar Analizi',
        }}
      />
      <Tabs.Screen
        name="obd"
        options={{
          title: 'OBD',
        }}
      />
      <Tabs.Screen
        name="price"
        options={{
          title: 'Fiyat Analizi',
        }}
      />
    </Tabs>
  );
}
