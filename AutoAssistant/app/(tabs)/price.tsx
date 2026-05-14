import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Platform, Pressable, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CustomPicker from '../../components/CustomPicker';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import VehicleDataRaw from '../../constants/VehicleData.json';

interface VehicleDataStructure { vites_tipi: string[]; yakit_tipi: string[]; marka: string[]; marka_to_seri: Record<string, string[]>; seri_to_model: Record<string, string[]>; }
const VehicleData = VehicleDataRaw as VehicleDataStructure;

const itemStyle = { color: Colors.text, backgroundColor: 'transparent' };

// Custom Premium Button with Scale Animation
const PremiumButton = ({ onPress, disabled, loading, children }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ marginTop: 24, marginBottom: 20 }}
    >
      <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading ? <ActivityIndicator color="#FFF" /> : children}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

export default function PriceAnalysisScreen() {
  const [marka, setMarka] = useState(VehicleData.marka[0] || '');
  const [seriList, setSeriList] = useState<string[]>([]);
  const [seri, setSeri] = useState('');
  const [modelList, setModelList] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [yakit, setYakit] = useState(VehicleData.yakit_tipi[0] || '');
  const [vites, setVites] = useState(VehicleData.vites_tipi[0] || '');
  const [yil, setYil] = useState('');
  const [km, setKm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { token } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { const s = VehicleData.marka_to_seri[marka] || []; setSeriList(s); setSeri(s[0] || ''); }, [marka]);
  useEffect(() => { const m = VehicleData.seri_to_model[seri] || []; setModelList(m); setModel(m[0] || ''); }, [seri]);

  const handleAnalyze = async () => {
    if (!yil || !km) { Alert.alert("Uyarı", "Lütfen Yıl ve Kilometre bilgilerini giriniz."); return; }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('http://172.24.246.41:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ marka, seri, model, yil, vites_tipi: vites, yakit_tipi: yakit, kilometre: km }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.formatted_price);
        fadeAnim.setValue(0);
        Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }).start();
      } else { Alert.alert("Hata", data.error || "Bir sorun oluştu"); }
    } catch (error) { Alert.alert("Hata", "Sunucuya bağlanılamadı."); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      {/* Background Blobs for Glassmorphism effect */}
      <View style={[styles.bgBlob, { top: -100, left: -50, backgroundColor: 'rgba(99, 102, 241, 0.25)' }]} />
      <View style={[styles.bgBlob, { top: 200, right: -100, backgroundColor: 'rgba(6, 214, 160, 0.15)' }]} />
      <View style={[styles.bgBlob, { bottom: -50, left: 100, backgroundColor: 'rgba(244, 114, 182, 0.15)' }]} />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        {/* Minimal Header */}
        <View style={styles.minimalHeader}>
          <Text style={styles.title}>Fiyat Analizi</Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Marka</Text>
          <CustomPicker value={marka} onValueChange={setMarka} items={VehicleData.marka} />

          <Text style={styles.label}>Seri</Text>
          <CustomPicker value={seri} onValueChange={setSeri} items={seriList} enabled={seriList.length > 0} placeholder="Seçiniz" />

          <Text style={styles.label}>Model (Donanım)</Text>
          <CustomPicker value={model} onValueChange={setModel} items={modelList} enabled={modelList.length > 0} placeholder="Seçiniz" />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Yakıt Tipi</Text>
              <CustomPicker value={yakit} onValueChange={setYakit} items={VehicleData.yakit_tipi} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Vites Tipi</Text>
              <CustomPicker value={vites} onValueChange={setVites} items={VehicleData.vites_tipi} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Yıl</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputBackground}>
                  <TextInput style={styles.input} placeholder="Örn: 2018" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={yil} onChangeText={setYil} />
                </View>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Kilometre</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputBackground}>
                  <TextInput style={styles.input} placeholder="Örn: 120000" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={km} onChangeText={setKm} />
                </View>
              </View>
            </View>
          </View>
        </View>

        <PremiumButton onPress={handleAnalyze} loading={loading}>
          <Ionicons name="sparkles" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Değerlemeyi Başlat</Text>
        </PremiumButton>
      </ScrollView>

      {/* Result Modal */}
      <Modal visible={!!result} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultIconGlow}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.secondary} />
            </View>
            <Text style={styles.resultTitle}>Tahmini Piyasa Değeri</Text>
            <Text style={styles.resultValue} adjustsFontSizeToFit numberOfLines={1}>
              {result}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setResult(null)}>
              <Text style={styles.closeButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  bgBlob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, filter: 'blur(80px)' as any, opacity: 0.8 },
  scrollView: { flex: 1 },
  minimalHeader: { marginBottom: 20 },
  title: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: -0.3 },
  formContainer: { gap: 4 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary, marginBottom: 8, marginTop: 12, letterSpacing: 0.3 },
  inputBackground: { backgroundColor: 'rgba(255,255,255,0.05)' },
  row: { flexDirection: 'row' },
  inputWrapper: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  input: { padding: 18, color: '#FFF', fontSize: 15, height: 56, fontFamily: 'Poppins_500Medium' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 20, paddingVertical: 20, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  resultCard: { width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.95)', borderRadius: 28, padding: 32, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: 'rgba(6, 214, 160, 0.3)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
  resultIconGlow: { shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10, marginBottom: 4 },
  resultTitle: { color: Colors.textSecondary, fontSize: 15, fontFamily: 'Poppins_500Medium', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' },
  resultValue: { color: '#FFF', fontSize: 40, fontFamily: 'Poppins_700Bold', textShadowColor: 'rgba(6, 214, 160, 0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12, textAlign: 'center', width: '100%' },
  closeButton: { marginTop: 12, backgroundColor: 'rgba(6, 214, 160, 0.15)', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(6, 214, 160, 0.3)' },
  closeButtonText: { color: Colors.secondary, fontSize: 16, fontFamily: 'Poppins_700Bold' },
});
