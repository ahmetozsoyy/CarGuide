import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function OBDAnalysisScreen() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ title: string, desc: string } | null>(null);

  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!code) return;
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://192.168.10.140:5000/obd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          title: data.title,
          desc: data.desc
        });
      } else {
        alert("Hata: " + (data.error || "Bir sorun oluştu"));
      }
    } catch (error) {
      console.error(error);
      alert("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OBD Arıza Kodu Yorumlama</Text>
      <Text style={styles.subtitle}>Aracınızın verdiği hata kodunun ne anlama geldiğini öğrenin.</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Arıza Kodunu Girin (Örn: P0171)"
          placeholderTextColor={Colors.textMuted}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "..." : "Sorgula"}</Text>
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{result.title}</Text>
          <Text style={styles.resultDesc}>{result.desc}</Text>
        </View>
      )}
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
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  resultDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
  },
});
