import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Image, FlatList, Modal, Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import VehicleDataRaw from '../../constants/VehicleData.json';

const API_URL = 'http://172.24.246.41:5000';

interface VehicleDataStructure {
  vites_tipi: string[];
  yakit_tipi: string[];
  marka: string[];
  marka_to_seri: Record<string, string[]>;
  seri_to_model: Record<string, string[]>;
}
const VehicleData = VehicleDataRaw as VehicleDataStructure;

interface Vehicle {
  id: number;
  marka: string;
  seri: string;
  model: string;
  yil: number;
  kilometre: number;
  yakit_tipi: string;
  vites_tipi: string;
  photos: string[];
}

export default function VehiclesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [marka, setMarka] = useState(VehicleData.marka[0] || '');
  const [seriList, setSeriList] = useState<string[]>([]);
  const [seri, setSeri] = useState('');
  const [modelList, setModelList] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [yakit, setYakit] = useState(VehicleData.yakit_tipi[0] || '');
  const [vites, setVites] = useState(VehicleData.vites_tipi[0] || '');
  const [yil, setYil] = useState('');
  const [km, setKm] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Cascade dropdowns
  useEffect(() => {
    const seriesForMarka = VehicleData.marka_to_seri[marka] || [];
    setSeriList(seriesForMarka);
    setSeri(seriesForMarka[0] || '');
  }, [marka]);

  useEffect(() => {
    const modelsForSeri = VehicleData.seri_to_model[seri] || [];
    setModelList(modelsForSeri);
    setModel(modelsForSeri[0] || '');
  }, [seri]);

  const fetchVehicles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setVehicles(data.vehicles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchVehicles(); }, [fetchVehicles]));

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin Gerekli'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newPhotos = result.assets.slice(0, 5).map(a => a.base64 || '').filter(Boolean);
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
    }
  };

  const handleSave = async () => {
    if (!yil || !km) { Alert.alert('Hata', 'Yıl ve Kilometre zorunludur.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ marka, seri, model, yil: parseInt(yil), kilometre: parseInt(km), yakit_tipi: yakit, vites_tipi: vites, photos }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setPhotos([]);
        setYil('');
        setKm('');
        fetchVehicles();
      } else {
        Alert.alert('Hata', data.error);
      }
    } catch (e) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Aracı Sil', 'Bu aracı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${API_URL}/vehicles/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            fetchVehicles();
          } catch (e) { console.error(e); }
        }
      },
    ]);
  };

  const quickPriceAnalysis = (v: Vehicle) => {
    // Navigate to price tab - the data will be pre-filled via URL params isn't ideal with expo-router tabs
    // Instead, alert with the result directly
    Alert.alert('Fiyat Analizi Başlatılıyor...', `${v.marka} ${v.seri} ${v.model}`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Analiz Et', onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/predict`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                marka: v.marka, seri: v.seri, model: v.model,
                yil: v.yil, vites_tipi: v.vites_tipi, yakit_tipi: v.yakit_tipi,
                kilometre: v.kilometre,
              }),
            });
            const data = await res.json();
            if (data.success) {
              Alert.alert('💰 Tahmini Piyasa Değeri', data.formatted_price);
            } else {
              Alert.alert('Hata', data.error || 'Analiz yapılamadı.');
            }
          } catch (e) {
            Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
          }
        }
      },
    ]);
  };

  const quickDamageAnalysis = (v: Vehicle) => {
    if (v.photos.length === 0) {
      Alert.alert('Fotoğraf Yok', 'Bu araç için fotoğraf eklenmemiş. Hasar analizi için Hasar Analizi sekmesini kullanın.');
      return;
    }
    Alert.alert('Hasar Analizi Başlatılıyor...', `${v.photos.length} fotoğraf analiz edilecek.`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Analiz Et', onPress: async () => {
          try {
            const images = v.photos.map(p => `data:image/jpeg;base64,${p}`);
            const res = await fetch(`${API_URL}/analyze-damage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ images }),
            });
            const data = await res.json();
            if (data.success) {
              const totalDamage = data.toplam_hasar;
              if (totalDamage > 0) {
                const damages = data.sonuclar.flatMap((s: any) =>
                  s.tespitler.map((t: any) => `• ${t.etiket} (%${t.guven.toFixed(0)})`)
                ).join('\n');
                Alert.alert(`🔍 ${totalDamage} Hasar Tespit Edildi`, damages);
              } else {
                Alert.alert('✅ Hasar Bulunamadı', 'Araçta herhangi bir hasar tespit edilmedi.');
              }
            } else {
              Alert.alert('Hata', data.error || 'Analiz yapılamadı.');
            }
          } catch (e) {
            Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
          }
        }
      },
    ]);
  };

  const renderVehicle = ({ item: v }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
      {/* Thumbnail Row */}
      {v.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {v.photos.map((p, i) => (
            <Image key={i} source={{ uri: `data:image/jpeg;base64,${p}` }} style={styles.thumbnail} />
          ))}
        </ScrollView>
      )}
      {/* Info */}
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>{v.marka} {v.seri}</Text>
        <Text style={styles.vehicleModel}>{v.model}</Text>
        <Text style={styles.vehicleDetails}>
          {v.yil} • {v.kilometre.toLocaleString('tr-TR')} km • {v.yakit_tipi} • {v.vites_tipi}
        </Text>
      </View>
      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B98118' }]} onPress={() => quickPriceAnalysis(v)}>
          <Text style={[styles.actionBtnText, { color: '#10B981' }]}>💰 Fiyat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F618' }]} onPress={() => quickDamageAnalysis(v)}>
          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>🔍 Hasar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF444418' }]} onPress={() => handleDelete(v.id)}>
          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Araçlarım</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ Yeni Araç</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : vehicles.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>Araç eklenmemiş</Text>
          <Text style={styles.emptySubtitle}>Aracınızı ekleyerek hızlıca fiyat ve hasar analizi yapabilirsiniz.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.emptyBtnText}>+ Araç Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderVehicle}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Vehicle Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); setPhotos([]); }}>
              <Text style={styles.modalCancel}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Araç Ekle</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? '...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            {/* Marka */}
            <Text style={styles.label}>Marka</Text>
            <View style={styles.pickerBox}>
              <Picker selectedValue={marka} onValueChange={setMarka} style={styles.picker} dropdownIconColor={Colors.text}>
                {VehicleData.marka.map(m => <Picker.Item key={m} label={m} value={m} />)}
              </Picker>
            </View>

            {/* Seri */}
            <Text style={styles.label}>Seri</Text>
            <View style={[styles.pickerBox, seriList.length === 0 && styles.pickerDisabled]}>
              <Picker selectedValue={seri} onValueChange={setSeri} style={styles.picker} dropdownIconColor={Colors.text} enabled={seriList.length > 0}>
                {seriList.length > 0
                  ? seriList.map(s => <Picker.Item key={s} label={s} value={s} />)
                  : <Picker.Item label="Seri bulunamadı" value="" />}
              </Picker>
            </View>

            {/* Model */}
            <Text style={styles.label}>Model (Donanım)</Text>
            <View style={[styles.pickerBox, modelList.length === 0 && styles.pickerDisabled]}>
              <Picker selectedValue={model} onValueChange={setModel} style={styles.picker} dropdownIconColor={Colors.text} enabled={modelList.length > 0}>
                {modelList.length > 0
                  ? modelList.map(m => <Picker.Item key={m} label={m} value={m} />)
                  : <Picker.Item label="Model bulunamadı" value="" />}
              </Picker>
            </View>

            {/* Yakıt & Vites */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Yakıt</Text>
                <View style={styles.pickerBox}>
                  <Picker selectedValue={yakit} onValueChange={setYakit} style={styles.picker} dropdownIconColor={Colors.text}>
                    {VehicleData.yakit_tipi.map(y => <Picker.Item key={y} label={y} value={y} />)}
                  </Picker>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Vites</Text>
                <View style={styles.pickerBox}>
                  <Picker selectedValue={vites} onValueChange={setVites} style={styles.picker} dropdownIconColor={Colors.text}>
                    {VehicleData.vites_tipi.map(v => <Picker.Item key={v} label={v} value={v} />)}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Yıl & KM */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Yıl</Text>
                <TextInput style={styles.input} placeholder="Örn: 2018" placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad" value={yil} onChangeText={setYil} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Kilometre</Text>
                <TextInput style={styles.input} placeholder="Örn: 120000" placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad" value={km} onChangeText={setKm} />
              </View>
            </View>

            {/* Photos */}
            <Text style={styles.label}>Fotoğraflar (isteğe bağlı, max 5)</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos}>
              <Text style={styles.photoBtnText}>📷 Fotoğraf Ekle ({photos.length}/5)</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {photos.map((p, i) => (
                  <TouchableOpacity key={i} onPress={() => setPhotos(photos.filter((_, idx) => idx !== i))}>
                    <Image source={{ uri: `data:image/jpeg;base64,${p}` }} style={styles.previewImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Text style={styles.hint}>Fotoğrafa dokunarak silebilirsiniz.</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  vehicleCard: { backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  photoRow: { paddingHorizontal: 12, paddingTop: 12 },
  thumbnail: { width: 80, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: Colors.border },
  vehicleInfo: { padding: 14, paddingBottom: 8 },
  vehicleName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  vehicleModel: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  vehicleDetails: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  actionRow: { flexDirection: 'row', padding: 12, paddingTop: 4, gap: 8 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontWeight: '700', fontSize: 13 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalCancel: { color: Colors.textMuted, fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  formContent: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, color: Colors.textMuted, marginBottom: 6, fontWeight: '600', marginTop: 12 },
  pickerBox: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  pickerDisabled: { opacity: 0.5 },
  picker: { color: Colors.text, height: 50 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border, fontSize: 16, height: 55 },
  photoBtn: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  photoBtnText: { color: Colors.textMuted, fontWeight: '600' },
  previewImg: { width: 80, height: 60, borderRadius: 8, marginRight: 8, backgroundColor: Colors.border },
  hint: { fontSize: 11, color: Colors.textMuted, marginTop: 6, opacity: 0.7 },
});
