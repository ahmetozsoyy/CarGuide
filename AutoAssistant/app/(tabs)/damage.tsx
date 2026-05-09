import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function DamageAnalysisScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hasar Tespiti</Text>
      <Text style={styles.subtitle}>Görüntü işleme ile aracınızın hasarını otomatik tespit edin.</Text>

      <View style={styles.card}>
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>📷</Text>
        </View>
        <Text style={styles.cardTitle}>Fotoğraf Yükle veya Çek</Text>
        <Text style={styles.cardSubtitle}>Hasarlı bölgenin fotoğrafını sisteme yükleyerek yapay zekanın analiz etmesini sağlayın.</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Kamerayı Aç</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
