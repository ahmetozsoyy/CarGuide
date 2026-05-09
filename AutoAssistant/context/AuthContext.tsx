import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
        const storedToken = await SecureStore.getItemAsync('jwt_token');
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
    await SecureStore.setItemAsync('jwt_token', newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('jwt_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
