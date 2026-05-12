import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import VehicleDataRaw from '../../constants/VehicleData.json';

interface VehicleDataStructure { vites_tipi: string[]; yakit_tipi: string[]; marka: string[]; marka_to_seri: Record<string, string[]>; seri_to_model: Record<string, string[]>; }
const VehicleData = VehicleDataRaw as VehicleDataStructure;

const itemStyle = { color: Colors.text, backgroundColor: Colors.surface };

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
        Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true }).start();
      } else { alert("Hata: " + (data.error || "Bir sorun oluştu")); }
    } catch (error) { alert("Sunucuya bağlanılamadı."); }
    finally { setLoading(false); }
  };

  const DarkPicker = ({ value, onValueChange, items, enabled = true, placeholder = '' }: any) => (
    <View style={[styles.pickerContainer, !enabled && styles.pickerDisabled]}>
      <Picker selectedValue={value} onValueChange={onValueChange} enabled={enabled}
        style={styles.picker} dropdownIconColor={Colors.textMuted}
        mode="dropdown"
        itemStyle={{ backgroundColor: Colors.surface, color: Colors.text }}>
        {items.length > 0
          ? items.map((item: string) => <Picker.Item key={item} label={item} value={item} color={Platform.OS === 'android' ? Colors.text : undefined} style={itemStyle} />)
          : <Picker.Item label={placeholder || '-'} value="" color={Platform.OS === 'android' ? Colors.textMuted : undefined} style={itemStyle} />}
      </Picker>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <LinearGradient colors={['#1E293B', '#334155']} style={styles.headerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.headerIcon}>
            <Ionicons name="analytics" size={28} color={Colors.secondary} />
          </View>
          <Text style={styles.title}>Yapay Zeka Fiyat Analizi</Text>
          <Text style={styles.subtitle}>Aracınızın piyasa değerini yapay zeka ile anında öğrenin.</Text>
        </LinearGradient>
      </View>

      {/* Form */}
      <Text style={styles.label}>Marka</Text>
      <DarkPicker value={marka} onValueChange={setMarka} items={VehicleData.marka} />

      <Text style={styles.label}>Seri</Text>
      <DarkPicker value={seri} onValueChange={setSeri} items={seriList} enabled={seriList.length > 0} placeholder="Seri bulunamadı" />

      <Text style={styles.label}>Model (Donanım/Paket)</Text>
      <DarkPicker value={model} onValueChange={setModel} items={modelList} enabled={modelList.length > 0} placeholder="Model bulunamadı" />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Yakıt Tipi</Text>
          <DarkPicker value={yakit} onValueChange={setYakit} items={VehicleData.yakit_tipi} />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.label}>Vites Tipi</Text>
          <DarkPicker value={vites} onValueChange={setVites} items={VehicleData.vites_tipi} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Yıl</Text>
          <TextInput style={styles.input} placeholder="Örn: 2018" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={yil} onChangeText={setYil} />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.label}>Kilometre</Text>
          <TextInput style={styles.input} placeholder="Örn: 120000" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={km} onChangeText={setKm} />
        </View>
      </View>

      <TouchableOpacity onPress={handleAnalyze} disabled={loading} activeOpacity={0.8} style={{ marginTop: 20 }}>
        <LinearGradient colors={[...Colors.gradientPrimary]} style={styles.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <><Ionicons name="sparkles" size={20} color="#FFF" /><Text style={styles.buttonText}>Analiz Et</Text></>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {result && (
        <Animated.View style={[styles.resultCard, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          <LinearGradient colors={['#064E3B', '#065F46']} style={styles.resultGrad}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.secondary} />
            <Text style={styles.resultTitle}>Tahmini Piyasa Değeri</Text>
            <Text style={styles.resultValue}>{result}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  headerGrad: { padding: 24 },
  headerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.secondary + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  label: { fontSize: 13, color: Colors.textMuted, marginBottom: 6, fontWeight: '600', marginTop: 14 },
  pickerContainer: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  pickerDisabled: { opacity: 0.5 },
  picker: { color: Colors.text, height: 52, backgroundColor: Colors.surface },
  row: { flexDirection: 'row' },
  input: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border, fontSize: 16, height: 55 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 18 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultCard: { borderRadius: 20, overflow: 'hidden', marginTop: 24, marginBottom: 40 },
  resultGrad: { padding: 28, alignItems: 'center', gap: 8 },
  resultTitle: { color: Colors.textSecondary, fontSize: 15 },
  resultValue: { color: Colors.secondary, fontSize: 26, fontWeight: '800' },
});
