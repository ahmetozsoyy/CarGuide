import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

export default function OBDAnalysisScreen() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ title: string; desc: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleSearch = async () => {
    if (!code) return;
    setLoading(true); setResult(null);
    try {
      const response = await fetch('http://172.24.246.41:5000/obd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      if (data.success) {
        setResult({ title: data.title, desc: data.desc });
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } else { alert("Hata: " + (data.error || "Bir sorun oluştu")); }
    } catch (error) { alert("Sunucuya bağlanılamadı."); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      {/* Background Blobs for Glassmorphism effect */}
      <View style={[styles.bgBlob, { top: -100, left: -50, backgroundColor: 'rgba(99, 102, 241, 0.25)' }]} />
      <View style={[styles.bgBlob, { top: 200, right: -100, backgroundColor: 'rgba(6, 214, 160, 0.15)' }]} />
      <View style={[styles.bgBlob, { bottom: -50, left: 100, backgroundColor: 'rgba(244, 114, 182, 0.15)' }]} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.minimalHeader}>
        <Text style={styles.title}>OBD Arıza Kodu</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput style={styles.input} placeholder="Kod girin (Örn: P0171)" placeholderTextColor={Colors.textMuted}
            value={code} onChangeText={setCode} autoCapitalize="characters" />
        </View>
        <TouchableOpacity onPress={handleSearch} disabled={loading} activeOpacity={0.8}>
          <LinearGradient colors={[...Colors.gradientPrimary]} style={styles.searchBtn}>
            <Ionicons name={loading ? 'hourglass' : 'arrow-forward'} size={22} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Result */}
      {result && (
        <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
          <View style={styles.resultHeader}>
            <View style={styles.codeChip}>
              <Text style={styles.codeChipText}>{code.toUpperCase()}</Text>
            </View>
            <Text style={styles.resultTitle}>{result.title}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.resultDesc}>{result.desc}</Text>
        </Animated.View>
      )}

      {/* Info */}
      {!result && (
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={22} color={Colors.info} />
          <Text style={styles.infoText}>
            P ile başlayan kodlar motor ve şanzıman, B ile başlayanlar gövde, C ile başlayanlar şasi ve U ile başlayanlar iletişim arızalarıdır.
          </Text>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  bgBlob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, filter: 'blur(80px)' as any, opacity: 0.8 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 130 },
  minimalHeader: { marginBottom: 24 },
  title: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: -0.3 },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  input: { flex: 1, color: '#FFF', fontSize: 16, paddingVertical: 18, fontFamily: 'Poppins_500Medium' },
  searchBtn: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  resultCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderLeftWidth: 4, borderLeftColor: Colors.danger },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  codeChip: { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  codeChipText: { color: Colors.danger, fontFamily: 'Poppins_800ExtraBold', fontSize: 14 },
  resultTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: '#FFF', flex: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 14 },
  resultDesc: { fontSize: 14, color: '#CBD5E1', lineHeight: 24, fontFamily: 'Poppins_400Regular' },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: 16, padding: 16, gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
  infoText: { flex: 1, fontSize: 13, color: '#38BDF8', lineHeight: 20, fontFamily: 'Poppins_400Regular' },
});
