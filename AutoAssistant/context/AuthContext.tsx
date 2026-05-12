import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  token: string | null;
  userName: string | null;
  login: (token: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  userName: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

// Helper functions for cross-platform storage
async function storageSet(key: string, value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

async function storageDelete(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await storageGet('jwt_token');
        const storedName = await storageGet('user_name');
        if (storedToken) {
          setToken(storedToken);
          setUserName(storedName);
        }
      } catch (e) {
        console.error("Error loading token", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (newToken: string, name: string) => {
    await storageSet('jwt_token', newToken);
    await storageSet('user_name', name);
    setUserName(name);
    setToken(newToken);
  };

  const logout = async () => {
    await storageDelete('jwt_token');
    await storageDelete('user_name');
    setToken(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ token, userName, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
