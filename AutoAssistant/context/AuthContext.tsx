import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
interface AuthContextType {
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check secure storage for token on mount
    const loadToken = async () => {
      try {
        let storedToken = null;
        if (Platform.OS === 'web') {
          storedToken = localStorage.getItem('jwt_token');
        } else {
          storedToken = await SecureStore.getItemAsync('jwt_token');
        }
        if (storedToken) setToken(storedToken);
      } catch (e) {
        console.error("Error loading token", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      // Redirect to main tabs if authenticated and on auth screens
      router.replace('/(tabs)');
    }
  }, [token, segments, isLoading]);

  const login = async (newToken: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('jwt_token', newToken);
    } else {
      await SecureStore.setItemAsync('jwt_token', newToken);
    }
    setToken(newToken);
  };

  const logout = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('jwt_token');
    } else {
      await SecureStore.deleteItemAsync('jwt_token');
    }
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
