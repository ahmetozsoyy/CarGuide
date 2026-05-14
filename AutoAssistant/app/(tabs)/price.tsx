import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Platform, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';
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
      style={{ marginTop: 24, marginBottom: 120 }}
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
    if (!yil || !km) { alert("Lütfen Yıl ve Kilometre bilgilerini giriniz."); return; }
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
      } else { alert("Hata: " + (data.error || "Bir sorun oluştu")); }
    } catch (error) { alert("Sunucuya bağlanılamadı."); }
    finally { setLoading(false); }
  };

  const DarkPicker = ({ value, onValueChange, items, enabled = true, placeholder = '' }: any) => (
    <View style={[styles.pickerWrapper, !enabled && styles.pickerDisabled]}>
      <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blurContainer}>
        <Picker selectedValue={value} onValueChange={onValueChange} enabled={enabled}
          style={styles.picker} dropdownIconColor={Colors.textMuted}
          mode="dropdown"
          itemStyle={{ fontFamily: 'Poppins_500Medium', fontSize: 15, color: Colors.text }}>
          {items.length > 0
            ? items.map((item: string) => <Picker.Item key={item} label={item} value={item} color={Platform.OS === 'android' ? Colors.text : undefined} style={itemStyle} />)
            : <Picker.Item label={placeholder || '-'} value="" color={Platform.OS === 'android' ? Colors.textMuted : undefined} style={itemStyle} />}
        </Picker>
      </BlurView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background Blobs for Glassmorphism effect */}
      <View style={[styles.bgBlob, { top: -100, left: -50, backgroundColor: 'rgba(99, 102, 241, 0.25)' }]} />
      <View style={[styles.bgBlob, { top: 200, right: -100, backgroundColor: 'rgba(6, 214, 160, 0.15)' }]} />
      <View style={[styles.bgBlob, { bottom: -50, left: 100, backgroundColor: 'rgba(244, 114, 182, 0.15)' }]} />

      <ScrollView style={styles.scrollView} contentContainerStyle={{ padding: 24, paddingTop: Platform.OS === 'ios' ? 100 : 80 }}>
        {/* Header Card with Glassmorphism */}
        <BlurView intensity={50} tint="dark" style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconWrapper}>
              <Ionicons name="analytics" size={28} color={Colors.primaryLight} />
            </View>
            <Text style={styles.title}>Yapay Zeka{'\n'}Fiyat Analizi</Text>
            <Text style={styles.subtitle}>Aracınızın piyasa değerini yapay zeka algoritmalarıyla anında ve yüksek doğrulukla öğrenin.</Text>
          </View>
        </BlurView>

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          <Text style={styles.label}>Marka</Text>
          <DarkPicker value={marka} onValueChange={setMarka} items={VehicleData.marka} />

          <Text style={styles.label}>Seri</Text>
          <DarkPicker value={seri} onValueChange={setSeri} items={seriList} enabled={seriList.length > 0} placeholder="Seri bulunamadı" />

          <Text style={styles.label}>Model (Donanım)</Text>
          <DarkPicker value={model} onValueChange={setModel} items={modelList} enabled={modelList.length > 0} placeholder="Model bulunamadı" />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Yakıt Tipi</Text>
              <DarkPicker value={yakit} onValueChange={setYakit} items={VehicleData.yakit_tipi} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Vites Tipi</Text>
              <DarkPicker value={vites} onValueChange={setVites} items={VehicleData.vites_tipi} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Yıl</Text>
              <View style={styles.inputWrapper}>
                <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blurContainer}>
                  <TextInput style={styles.input} placeholder="Örn: 2018" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={yil} onChangeText={setYil} />
                </BlurView>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Kilometre</Text>
              <View style={styles.inputWrapper}>
                <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blurContainer}>
                  <TextInput style={styles.input} placeholder="Örn: 120000" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={km} onChangeText={setKm} />
                </BlurView>
              </View>
            </View>
          </View>
        </View>

        <PremiumButton onPress={handleAnalyze} loading={loading}>
          <Ionicons name="sparkles" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Değerlemeyi Başlat</Text>
        </PremiumButton>

        {result && (
          <Animated.View style={[styles.resultContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
            <BlurView intensity={70} tint="dark" style={styles.resultCard}>
              <View style={styles.resultIconGlow}>
                <Ionicons name="checkmark-circle" size={42} color={Colors.secondary} />
              </View>
              <Text style={styles.resultTitle}>Tahmini Piyasa Değeri</Text>
              <Text style={styles.resultValue}>{result}</Text>
            </BlurView>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070A10' }, // Deepest dark background
  bgBlob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, filter: 'blur(80px)' as any, opacity: 0.6 },
  scrollView: { flex: 1 },
  headerCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerContent: { padding: 28, backgroundColor: 'rgba(0,0,0,0.2)' },
  headerIconWrapper: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(99, 102, 241, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  title: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFF', marginBottom: 8, lineHeight: 34, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textSecondary, lineHeight: 22 },
  formContainer: { gap: 4 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.textSecondary, marginBottom: 8, marginTop: 12, letterSpacing: 0.3 },
  pickerWrapper: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pickerDisabled: { opacity: 0.5 },
  blurContainer: { backgroundColor: 'rgba(255,255,255,0.03)' },
  picker: { color: Colors.text, height: 56, backgroundColor: 'transparent', fontFamily: 'Poppins_500Medium' },
  row: { flexDirection: 'row' },
  inputWrapper: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { padding: 18, color: Colors.text, fontSize: 15, height: 56, fontFamily: 'Poppins_500Medium' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 20, paddingVertical: 20, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.5 },
  resultContainer: { position: 'absolute', bottom: 100, left: 24, right: 24 },
  resultCard: { borderRadius: 24, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(6, 214, 160, 0.3)', backgroundColor: 'rgba(6, 214, 160, 0.05)' },
  resultIconGlow: { shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10, marginBottom: 4 },
  resultTitle: { color: Colors.textSecondary, fontSize: 14, fontFamily: 'Poppins_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' },
  resultValue: { color: '#FFF', fontSize: 34, fontFamily: 'Poppins_700Bold', textShadowColor: 'rgba(6, 214, 160, 0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12 },
});
