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
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Araçlarım',
          tabBarIcon: ({ color }) => <TabIcon emoji="🚗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="damage"
        options={{
          title: 'Hasar',
          tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="obd"
        options={{
          title: 'OBD',
          tabBarIcon: ({ color }) => <TabIcon emoji="🔧" color={color} />,
        }}
      />
      <Tabs.Screen
        name="price"
        options={{
          title: 'Fiyat',
          tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} />,
        }}
      />
    </Tabs>
  );
}

// Simple emoji-based tab icon
import { Text } from 'react-native';
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}
