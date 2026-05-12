import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

function RootNavigator() {
  const { token, isLoading } = useAuth();

  // Show loading screen while checking stored token
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {token ? (
        // User is authenticated - show main app
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        // User is NOT authenticated - show auth screens
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <StatusBar style="light" />
        <RootNavigator />
      </View>
    </AuthProvider>
  );
}
