import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomPicker from '../../components/CustomPicker';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://172.24.246.41:5000';

interface Rec { marka: string; seri: string; model?: string; puan: number; neden: string; guclu: string; zayif: string; fiyat: string; yil?: string; }

export default function RecommendScreen() {
  const { token } = useAuth();
  const [minFiyat, setMinFiyat] = useState('');
  const [maxFiyat, setMaxFiyat] = useState('');
  const [maxKm, setMaxKm] = useState('');
  const [minYil, setMinYil] = useState('');
  const [yakit, setYakit] = useState('Farketmez');
  const [vites, setVites] = useState('Farketmez');
  const [tercihler, setTercihler] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Rec[] | null>(null);
  const [message, setMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleRecommend = async () => {
    if (!tercihler && !maxFiyat) { alert('Lütfen en az bütçe veya tercih belirtin.'); return; }
    setLoading(true); setResults(null);
    try {
      const body: any = { tercihler };
      if (minFiyat) body.min_fiyat = parseInt(minFiyat);
      if (maxFiyat) body.max_fiyat = parseInt(maxFiyat);
      if (maxKm) body.max_km = parseInt(maxKm);
      if (minYil) body.min_yil = parseInt(minYil);
      if (yakit !== 'Farketmez') body.yakit_tipi = yakit;
      if (vites !== 'Farketmez') body.vites_tipi = vites;

      const res = await fetch(`${API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.recommendations || []);
        setMessage(data.message || '');
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      } else {
        alert(data.error || 'Bir sorun oluştu.');
      }
    } catch (e) { alert('Sunucuya bağlanılamadı.'); }
    finally { setLoading(false); }
  };

  const puanColor = (p: number) => p >= 80 ? Colors.success : p >= 60 ? Colors.warning : Colors.danger;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={s.minimalHeader}>
        <Text style={s.title}>Araç Tavsiye</Text>
      </View>

      {/* Budget Row */}
      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.label}>Min Bütçe (₺)</Text>
          <TextInput style={s.input} placeholder="500000" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={minFiyat} onChangeText={setMinFiyat} />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.label}>Max Bütçe (₺)</Text>
          <TextInput style={s.input} placeholder="1500000" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={maxFiyat} onChangeText={setMaxFiyat} />
        </View>
      </View>

      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.label}>Max KM</Text>
          <TextInput style={s.input} placeholder="150000" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={maxKm} onChangeText={setMaxKm} />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.label}>Min Yıl</Text>
          <TextInput style={s.input} placeholder="2015" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={minYil} onChangeText={setMinYil} />
        </View>
      </View>

      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.label}>Yakıt</Text>
          <CustomPicker 
            value={yakit} 
            onValueChange={setYakit} 
            items={['Farketmez', 'Benzin', 'Dizel', 'LPG & Benzin', 'Hibrit', 'Elektrik']} 
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.label}>Vites</Text>
          <CustomPicker 
            value={vites} 
            onValueChange={setVites} 
            items={['Farketmez', 'Otomatik', 'Düz', 'Yarı Otomatik']} 
          />
        </View>
      </View>

      {/* Preferences */}
      <Text style={s.label}>Tercih ve Beklentileriniz</Text>
      <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Örn: Performanslı, az arızalı, konforlu, aileme uygun, yakıt cimrisi..." placeholderTextColor={Colors.textMuted} value={tercihler} onChangeText={setTercihler} multiline />

      {/* Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 6 }}>
        {['Performanslı', 'Konforlu', 'Az Arızalı', 'Yakıt Tasarruflu', 'Ailece Kullanım', 'Şehir İçi', 'Uzun Yol'].map(chip => (
          <TouchableOpacity key={chip} style={[s.chip, tercihler.includes(chip) && s.chipActive]}
            onPress={() => setTercihler(prev => prev.includes(chip) ? prev.replace(chip, '').trim() : `${prev} ${chip}`.trim())}>
            <Text style={[s.chipText, tercihler.includes(chip) && s.chipTextActive]}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Button */}
      <TouchableOpacity onPress={handleRecommend} disabled={loading} activeOpacity={0.8} style={{ marginTop: 16 }}>
        <LinearGradient colors={[...Colors.gradientPrimary]} style={s.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <><Ionicons name="sparkles" size={20} color="#FFF" /><Text style={s.buttonText}>Tavsiye Al</Text></>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Results */}
      {results !== null && (
        <Animated.View style={{ opacity: fadeAnim, marginTop: 24 }}>
          {message ? <Text style={s.resultMsg}>{message}</Text> : null}
          {results.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.textMuted} />
              <Text style={s.emptyText}>Uygun araç bulunamadı</Text>
            </View>
          ) : results.map((rec, i) => (
            <View key={i} style={s.recCard}>
              <View style={s.recHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.recRank}>#{i + 1}</Text>
                  <Text style={s.recName}>{rec.marka} {rec.seri}</Text>
                  <Text style={s.recModel}>{rec.model ? `${rec.model} • ` : ''}{rec.yil || 'Yıl Belirtilmemiş'}</Text>
                </View>
                <View style={[s.puanCircle, { borderColor: puanColor(rec.puan) }]}>
                  <Text style={[s.puanText, { color: puanColor(rec.puan) }]}>{rec.puan}</Text>
                </View>
              </View>
              {rec.fiyat && <Text style={s.recFiyat}>💰 {rec.fiyat} ₺</Text>}
              <Text style={s.recNeden}>{rec.neden}</Text>
              <View style={s.prosConsRow}>
                <View style={[s.prosConsBox, { backgroundColor: Colors.success + '12' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={[s.prosConsText, { color: Colors.success }]}>{rec.guclu}</Text>
                </View>
                <View style={[s.prosConsBox, { backgroundColor: Colors.warning + '12' }]}>
                  <Ionicons name="warning" size={16} color={Colors.warning} />
                  <Text style={[s.prosConsText, { color: Colors.warning }]}>{rec.zayif}</Text>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  minimalHeader: { marginBottom: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: -0.3 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#CBD5E1', marginBottom: 8, marginTop: 12, letterSpacing: 0.3 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 15, height: 56, fontFamily: 'Poppins_500Medium' },

  chip: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary + '25', borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 18 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultMsg: { color: Colors.textMuted, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 40, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  recCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recRank: { fontSize: 12, color: Colors.primary, fontWeight: '800' },
  recName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  recModel: { fontSize: 13, color: Colors.primaryLight, marginTop: 2 },
  recFiyat: { fontSize: 14, color: Colors.secondary, fontWeight: '700', marginBottom: 8 },
  puanCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  puanText: { fontSize: 18, fontWeight: '900' },
  recNeden: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 12 },
  prosConsRow: { gap: 8 },
  prosConsBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12 },
  prosConsText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
