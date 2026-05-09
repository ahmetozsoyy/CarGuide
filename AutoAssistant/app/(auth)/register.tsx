import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleRegister = () => {
    // Mock JWT Registration
    if (email && password && name) {
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI...mock.jwt.token";
      login(mockToken);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Kayıt Ol</Text>
        <Text style={styles.subtitle}>Yeni bir hesap oluşturun</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ad Soyad"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Kayıt Ol</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 48,
  },
  inputContainer: {
    gap: 16,
    marginBottom: 32,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  link: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
