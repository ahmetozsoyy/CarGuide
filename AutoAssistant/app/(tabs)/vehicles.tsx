import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, FlatList, Modal, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import VehicleDataRaw from '../../constants/VehicleData.json';

const API_URL = 'http://172.24.246.41:5000';
const SCREEN_W = Dimensions.get('window').width;

interface VD { vites_tipi: string[]; yakit_tipi: string[]; marka: string[]; marka_to_seri: Record<string, string[]>; seri_to_model: Record<string, string[]>; }
const VD = VehicleDataRaw as VD;

interface Vehicle { id: number; marka: string; seri: string; model: string; yil: number; kilometre: number; yakit_tipi: string; vites_tipi: string; photos: string[]; }

export default function VehiclesScreen() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [damageResult, setDamageResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  // Form fields
  const [marka, setMarka] = useState(VD.marka[0] || '');
  const [seriList, setSeriList] = useState<string[]>([]);
  const [seri, setSeri] = useState('');
  const [modelList, setModelList] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [yakit, setYakit] = useState(VD.yakit_tipi[0] || '');
  const [vites, setVites] = useState(VD.vites_tipi[0] || '');
  const [yil, setYil] = useState('');
  const [km, setKm] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { const s = VD.marka_to_seri[marka] || []; setSeriList(s); setSeri(s[0] || ''); }, [marka]);
  useEffect(() => { const m = VD.seri_to_model[seri] || []; setModelList(m); setModel(m[0] || ''); }, [seri]);

  const fetchVehicles = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vehicles`, { headers: { 'Authorization': `Bearer ${token}` }, signal });
      const data = await res.json();
      if (data.success) setVehicles(data.vehicles);
    } catch (e: any) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    fetchVehicles(controller.signal);
    return () => controller.abort();
  }, [fetchVehicles]));

  const openForm = (v?: Vehicle) => {
    if (v) {
      setEditVehicle(v); setMarka(v.marka); setSeri(v.seri); setModel(v.model);
      setYakit(v.yakit_tipi); setVites(v.vites_tipi); setYil(String(v.yil)); setKm(String(v.kilometre));
      setPhotos(v.photos || []);
    } else {
      setEditVehicle(null); setMarka(VD.marka[0]); setYil(''); setKm(''); setPhotos([]);
    }
    setShowForm(true);
  };

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin Gerekli'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.4, base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newP = result.assets.slice(0, 5).map(a => a.base64 || '').filter(Boolean);
      setPhotos(prev => [...prev, ...newP].slice(0, 5));
    }
  };

  const handleSave = async () => {
    if (!yil || !km) { Alert.alert('Hata', 'Yıl ve Kilometre zorunlu.'); return; }
    setSaving(true);
    const body = { marka, seri, model, yil: parseInt(yil), kilometre: parseInt(km), yakit_tipi: yakit, vites_tipi: vites, photos };
    try {
      const url = editVehicle ? `${API_URL}/vehicles/${editVehicle.id}` : `${API_URL}/vehicles`;
      const method = editVehicle ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setShowForm(false); setPhotos([]); fetchVehicles(); if (editVehicle) setDetailVehicle({ ...editVehicle, ...body }); }
      else Alert.alert('Hata', data.error);
    } catch (e) { Alert.alert('Hata', 'Sunucuya bağlanılamadı.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Aracı Sil', 'Bu aracı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await fetch(`${API_URL}/vehicles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        setDetailVehicle(null); fetchVehicles();
      }},
    ]);
  };

  const quickPrice = async (v: Vehicle) => {
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ marka: v.marka, seri: v.seri, model: v.model, yil: v.yil, vites_tipi: v.vites_tipi, yakit_tipi: v.yakit_tipi, kilometre: v.kilometre }),
      });
      const data = await res.json();
      if (data.success) Alert.alert('💰 Tahmini Piyasa Değeri', data.formatted_price);
      else Alert.alert('Hata', data.error || 'Analiz yapılamadı.');
    } catch (e) { Alert.alert('Hata', 'Sunucuya bağlanılamadı.'); }
  };

  const quickDamage = async (v: Vehicle) => {
    if (!v.photos || v.photos.length === 0) { Alert.alert('Fotoğraf Yok', 'Hasar analizi için araç fotoğrafı ekleyin veya Hasar sekmesini kullanın.'); return; }
    setAnalyzing(true); setDamageResult(null);
    try {
      const allResults: any[] = [];
      for (let i = 0; i < v.photos.length; i++) {
        const res = await fetch(`${API_URL}/analyze-damage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({ images: [`data:image/jpeg;base64,${v.photos[i]}`] }),
        });
        const data = await res.json();
        if (data.success && data.sonuclar) {
          // Her sonuca fotoğraf index'ini ekle
          data.sonuclar.forEach((s: any) => { s.photoIndex = i; });
          allResults.push(...data.sonuclar);
        }
      }
      setDamageResult(allResults);
    } catch (e) { Alert.alert('Hata', 'Analiz sırasında bir sorun oluştu.'); }
    finally { setAnalyzing(false); }
  };

  // ── Vehicle Card ──
  const renderVehicle = ({ item: v }: { item: Vehicle }) => (
    <TouchableOpacity style={s.card} onPress={() => { setDetailVehicle(v); setPhotoIndex(0); setDamageResult(null); }}>
      {v.photos?.length > 0 && <Image source={{ uri: `data:image/jpeg;base64,${v.photos[0]}` }} style={s.cardImg} />}
      <View style={s.cardBody}>
        <Text style={s.cardName}>{v.marka} {v.seri}</Text>
        <Text style={s.cardModel}>{v.model}</Text>
        <Text style={s.cardInfo}>{v.yil} • {v.kilometre.toLocaleString('tr-TR')} km • {v.yakit_tipi} • {v.vites_tipi}</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Main List ──
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Araçlarım</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => openForm()}><Text style={s.addBtnTx}>+ Yeni Araç</Text></TouchableOpacity>
      </View>
      {loading ? <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
       : vehicles.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🚗</Text>
          <Text style={s.emptyTitle}>Araç eklenmemiş</Text>
          <Text style={s.emptyDesc}>Aracınızı ekleyerek hızlıca analiz yapın.</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => openForm()}><Text style={s.addBtnTx}>+ Araç Ekle</Text></TouchableOpacity>
        </View>
       ) : (
        <FlatList data={vehicles} keyExtractor={i => String(i.id)} renderItem={renderVehicle}
          contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false} />
       )}

      {/* ── Add/Edit Form Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => { setShowForm(false); setPhotos([]); }}><Text style={s.modalCancel}>İptal</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{editVehicle ? 'Düzenle' : 'Araç Ekle'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}><Text style={[s.modalSave, saving && { opacity: 0.5 }]}>{saving ? '...' : 'Kaydet'}</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            <Text style={s.lbl}>Marka</Text>
            <View style={s.pkBox}><Picker selectedValue={marka} onValueChange={setMarka} style={s.pk} dropdownIconColor={Colors.text}>{VD.marka.map(m => <Picker.Item key={m} label={m} value={m} />)}</Picker></View>
            <Text style={s.lbl}>Seri</Text>
            <View style={[s.pkBox, !seriList.length && s.pkDis]}><Picker selectedValue={seri} onValueChange={setSeri} style={s.pk} dropdownIconColor={Colors.text} enabled={seriList.length > 0}>{seriList.length ? seriList.map(x => <Picker.Item key={x} label={x} value={x} />) : <Picker.Item label="-" value="" />}</Picker></View>
            <Text style={s.lbl}>Model</Text>
            <View style={[s.pkBox, !modelList.length && s.pkDis]}><Picker selectedValue={model} onValueChange={setModel} style={s.pk} dropdownIconColor={Colors.text} enabled={modelList.length > 0}>{modelList.length ? modelList.map(x => <Picker.Item key={x} label={x} value={x} />) : <Picker.Item label="-" value="" />}</Picker></View>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}><Text style={s.lbl}>Yakıt</Text><View style={s.pkBox}><Picker selectedValue={yakit} onValueChange={setYakit} style={s.pk} dropdownIconColor={Colors.text}>{VD.yakit_tipi.map(y => <Picker.Item key={y} label={y} value={y} />)}</Picker></View></View>
              <View style={{ flex: 1, marginLeft: 8 }}><Text style={s.lbl}>Vites</Text><View style={s.pkBox}><Picker selectedValue={vites} onValueChange={setVites} style={s.pk} dropdownIconColor={Colors.text}>{VD.vites_tipi.map(v => <Picker.Item key={v} label={v} value={v} />)}</Picker></View></View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}><Text style={s.lbl}>Yıl</Text><TextInput style={s.inp} placeholder="2018" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={yil} onChangeText={setYil} /></View>
              <View style={{ flex: 1, marginLeft: 8 }}><Text style={s.lbl}>KM</Text><TextInput style={s.inp} placeholder="120000" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" value={km} onChangeText={setKm} /></View>
            </View>
            <Text style={s.lbl}>Fotoğraflar (max 5)</Text>
            <TouchableOpacity style={s.photoBtn} onPress={pickPhotos}><Text style={s.photoBtnTx}>📷 Fotoğraf Ekle ({photos.length}/5)</Text></TouchableOpacity>
            {photos.length > 0 && <ScrollView horizontal style={{ marginTop: 12 }}>{photos.map((p, i) => (
              <TouchableOpacity key={i} onPress={() => setPhotos(photos.filter((_, idx) => idx !== i))}>
                <Image source={{ uri: `data:image/jpeg;base64,${p}` }} style={s.thumb} />
              </TouchableOpacity>
            ))}</ScrollView>}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Vehicle Detail Modal ── */}
      <Modal visible={!!detailVehicle} animationType="slide" presentationStyle="pageSheet">
        {detailVehicle && (
          <View style={s.modal}>
            <View style={s.modalHead}>
              <TouchableOpacity onPress={() => { setDetailVehicle(null); setDamageResult(null); }}><Text style={s.modalCancel}>← Geri</Text></TouchableOpacity>
              <Text style={s.modalTitle} numberOfLines={1}>{detailVehicle.marka} {detailVehicle.seri}</Text>
              <TouchableOpacity onPress={() => openForm(detailVehicle)}><Text style={s.modalSave}>✏️</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
              {/* Photo Gallery */}
              {detailVehicle.photos?.length > 0 ? (
                <View>
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    onScroll={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}>
                    {detailVehicle.photos.map((p, i) => (
                      <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => setFullscreenPhoto(p)}>
                        <Image source={{ uri: `data:image/jpeg;base64,${p}` }} style={{ width: SCREEN_W, height: 240 }} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={s.dots}>
                    {detailVehicle.photos.map((_, i) => <View key={i} style={[s.dot, photoIndex === i && s.dotActive]} />)}
                  </View>
                </View>
              ) : <View style={{ height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}><Text style={{ fontSize: 40 }}>🚗</Text></View>}

              {/* Vehicle Info */}
              <View style={s.detailInfo}>
                <Text style={s.detailName}>{detailVehicle.marka} {detailVehicle.seri} {detailVehicle.model}</Text>
                <View style={s.detailGrid}>
                  {[['Yıl', String(detailVehicle.yil)], ['Kilometre', `${detailVehicle.kilometre.toLocaleString('tr-TR')} km`],
                    ['Yakıt', detailVehicle.yakit_tipi], ['Vites', detailVehicle.vites_tipi]].map(([l, v]) => (
                    <View key={l} style={s.detailItem}><Text style={s.detailLabel}>{l}</Text><Text style={s.detailValue}>{v}</Text></View>
                  ))}
                </View>
              </View>

              {/* Quick Actions */}
              <View style={s.detailActions}>
                <TouchableOpacity style={[s.bigAction, { backgroundColor: '#10B98118' }]} onPress={() => quickPrice(detailVehicle)}>
                  <Text style={{ fontSize: 28 }}>💰</Text><Text style={[s.bigActionTx, { color: '#10B981' }]}>Fiyat Analizi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.bigAction, { backgroundColor: '#3B82F618' }]} onPress={() => quickDamage(detailVehicle)}>
                  <Text style={{ fontSize: 28 }}>🔍</Text><Text style={[s.bigActionTx, { color: '#3B82F6' }]}>Hasar Analizi</Text>
                </TouchableOpacity>
              </View>

              {/* Damage Analysis Results */}
              {analyzing && <View style={{ padding: 30, alignItems: 'center' }}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textMuted, marginTop: 12 }}>Fotoğraflar analiz ediliyor...</Text></View>}
              {damageResult && (
                <View style={s.damageSection}>
                  <Text style={s.damageSectionTitle}>🔍 Hasar Analiz Sonuçları</Text>
                  {damageResult.map((r: any, i: number) => (
                    <View key={i} style={s.damageCard}>
                      {/* Çizimli görüntü (bounding box'lı) */}
                      {r.cizimli_goruntu ? (
                        <TouchableOpacity onPress={() => setFullscreenPhoto(r.cizimli_goruntu)}>
                          <Image source={{ uri: `data:image/jpeg;base64,${r.cizimli_goruntu}` }} style={s.damageFullImg} resizeMode="contain" />
                        </TouchableOpacity>
                      ) : r.photoIndex !== undefined && detailVehicle.photos ? (
                        <TouchableOpacity onPress={() => setFullscreenPhoto(detailVehicle.photos[r.photoIndex])}>
                          <Image source={{ uri: `data:image/jpeg;base64,${detailVehicle.photos[r.photoIndex]}` }} style={s.damageFullImg} resizeMode="contain" />
                        </TouchableOpacity>
                      ) : null}
                      <View style={{ padding: 14 }}>
                        <Text style={s.damagePhotoLabel}>Fotoğraf {(r.photoIndex ?? 0) + 1}</Text>
                        <Text style={s.damageCardTitle}>{r.hasar_var ? '⚠️ Hasar Tespit Edildi' : '✅ Hasar Yok'}</Text>
                        <Text style={s.damageCardMsg}>{r.mesaj}</Text>
                        {r.tespitler?.map((t: any, j: number) => (
                          <View key={j} style={s.tespitRow}>
                            <Text style={s.tespitLabel}>{t.etiket}</Text>
                            <Text style={[s.tespitBadge, { color: t.siddet === 'Yüksek' ? '#EF4444' : t.siddet === 'Orta' ? '#F59E0B' : '#10B981' }]}>
                              {t.siddet} • %{t.guven?.toFixed(0)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Delete */}
              <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(detailVehicle.id)}>
                <Text style={s.deleteBtnTx}>Aracı Sil</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── Fullscreen Photo Modal ── */}
      <Modal visible={!!fullscreenPhoto} transparent animationType="fade">
        <View style={s.fullscreenBg}>
          <TouchableOpacity style={s.fullscreenClose} onPress={() => setFullscreenPhoto(null)}>
            <Text style={s.fullscreenCloseTx}>✕</Text>
          </TouchableOpacity>
          {fullscreenPhoto && (
            <Image source={{ uri: `data:image/jpeg;base64,${fullscreenPhoto}` }} style={s.fullscreenImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnTx: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardImg: { width: '100%', height: 140 },
  cardBody: { padding: 14 },
  cardName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  cardModel: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  cardInfo: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  // Modal common
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalCancel: { color: Colors.textMuted, fontSize: 15 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: Colors.text, flex: 1, textAlign: 'center' },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  // Form
  lbl: { fontSize: 13, color: Colors.textMuted, marginBottom: 6, fontWeight: '600', marginTop: 12 },
  pkBox: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  pkDis: { opacity: 0.5 },
  pk: { color: Colors.text, height: 50 },
  row: { flexDirection: 'row' },
  inp: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border, fontSize: 16, height: 55 },
  photoBtn: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  photoBtnTx: { color: Colors.textMuted, fontWeight: '600' },
  thumb: { width: 80, height: 60, borderRadius: 8, marginRight: 8 },
  // Detail
  dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 20 },
  detailInfo: { padding: 20 },
  detailName: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, width: '48%' as any, borderWidth: 1, borderColor: Colors.border },
  detailLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  detailActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  bigAction: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8 },
  bigActionTx: { fontWeight: '700', fontSize: 14 },
  // Damage results
  damageSection: { padding: 20 },
  damageSectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  damageCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  damageCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  damageCardMsg: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  tespitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  tespitLabel: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  tespitBadge: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { margin: 20, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  deleteBtnTx: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 },
  // Damage photo link
  damageFullImg: { width: '100%', height: 200, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  damagePhotoLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  // Fullscreen
  fullscreenBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullscreenClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  fullscreenCloseTx: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  fullscreenImg: { width: '95%', height: '70%' },
});
