import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, FlatList, Modal,
  Dimensions, SafeAreaView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const API_URL = 'http://172.24.246.41:5000';

// ── Türkçe sabitler ──────────────────────────────────────────────────────
const SIDDET_RENK: Record<string, string> = {
  'Yüksek': '#EF4444',
  'Orta':   '#F59E0B',
  'Düşük':  '#10B981',
};

interface Tespit {
  etiket: string;
  guven: number;
  siddet: string;
}
interface GoruntuSonucu {
  goruntu_no: number;
  tespit_sayisi: number;
  tespitler: Tespit[];
  hasar_var: boolean;
  ai_ozet: string | null;
  mesaj: string;
  hata?: string;
  cizimli_goruntu?: string;
}
interface AnalyzedImage {
  uri: string;
  base64?: string;
  sonuc?: GoruntuSonucu;
}

// ── Yardımcı bileşenler ───────────────────────────────────────────────────

function TespitKarti({ t }: { t: Tespit }) {
  const renk = SIDDET_RENK[t.siddet] ?? Colors.textMuted;
  return (
    <View style={[styles.tespitKarti, { borderLeftColor: renk }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.tespitEtiket}>{t.etiket}</Text>
        <Text style={[styles.tespitSiddet, { color: renk }]}>{t.siddet} şiddet</Text>
      </View>
      <View style={[styles.guvenBadge, { backgroundColor: renk + '22' }]}>
        <Text style={[styles.guvenText, { color: renk }]}>%{t.guven.toFixed(0)}</Text>
      </View>
    </View>
  );
}

function SonucKarti({ item, index }: { item: AnalyzedImage; index: number }) {
  const s = item.sonuc;
  if (!s) return null;
  return (
    <View style={styles.sonucKarti}>
      <Image 
        source={{ uri: s.cizimli_goruntu ? `data:image/jpeg;base64,${s.cizimli_goruntu}` : item.uri }} 
        style={styles.sonucGoruntu} 
        resizeMode="contain" 
      />
      <View style={styles.sonucIcerik}>
        <Text style={styles.sonucBaslik}>
          {s.hasar_var ? '⚠️ Hasar Tespit Edildi' : '✅ Hasar Bulunamadı'}
        </Text>
        <Text style={styles.sonucMesaj}>{s.mesaj}</Text>
        {s.tespitler.map((t, i) => <TespitKarti key={i} t={t} />)}
        {s.ai_ozet ? (
          <View style={styles.aiOzetKutu}>
            <Text style={styles.aiOzetBaslik}>🤖 Yapay Zeka Değerlendirmesi</Text>
            <Text style={styles.aiOzetMetin}>{s.ai_ozet}</Text>
          </View>
        ) : null}
        {s.hata ? (
          <Text style={styles.hataMetin}>⚠️ Hata: {s.hata}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────
export default function DamageAnalysisScreen() {
  const [mod, setMod] = useState<'menu' | 'kamera' | 'sonuc'>('menu');
  const [kameraYon, setKameraYon] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [goruntular, setGoruntular] = useState<AnalyzedImage[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const kameraRef = useRef<CameraView>(null);
  const { token } = useAuth();

  // Galeri - tek fotoğraf
  const galeridenSec = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Galeri erişim izni verilmedi.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setGoruntular([{ uri: asset.uri, base64: asset.base64 ?? undefined }]);
      setMod('sonuc');
      analizeGonder([{ uri: asset.uri, base64: asset.base64 ?? undefined }]);
    }
  };

  // Galeri - toplu
  const topluSec = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Galeri erişim izni verilmedi.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const liste = result.assets.map(a => ({ uri: a.uri, base64: a.base64 ?? undefined }));
      setGoruntular(liste);
      setMod('sonuc');
      analizeGonder(liste);
    }
  };

  // Kamera çek
  const fotografCek = async () => {
    if (!kameraRef.current) return;
    try {
      const foto = await kameraRef.current.takePictureAsync({ base64: true, quality: 0.85 });
      if (foto) {
        const liste = [{ uri: foto.uri, base64: foto.base64 ?? undefined }];
        setGoruntular(liste);
        setMod('sonuc');
        analizeGonder(liste);
      }
    } catch (e) { Alert.alert('Hata', 'Fotoğraf çekilemedi.'); }
  };

  // API'ye gönder
  const analizeGonder = async (liste: AnalyzedImage[]) => {
    setYukleniyor(true);
    try {
      const base64Listesi = liste.map(g => g.base64 ? `data:image/jpeg;base64,${g.base64}` : '').filter(Boolean);
      const resp = await fetch(`${API_URL}/analyze-damage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ images: base64Listesi }),
      });
      const data = await resp.json();
      if (data.success) {
        const guncellenmis = liste.map((g, i) => ({ ...g, sonuc: data.sonuclar[i] }));
        setGoruntular(guncellenmis);
      } else {
        Alert.alert('Sunucu Hatası', data.error ?? 'Bilinmeyen hata.');
      }
    } catch (e) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya ulaşılamadı. Python API çalışıyor mu?');
    } finally {
      setYukleniyor(false);
    }
  };

  const sifirla = () => { setGoruntular([]); setMod('menu'); };

  // ── Menü Ekranı ──────────────────────────────────────────────────────
  if (mod === 'menu') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.menuIcerik}>
          <Text style={styles.baslik}>Hasar Tespiti</Text>
          <Text style={styles.altBaslik}>Yapay zeka ile aracınızın hasarını analiz edin.</Text>



          {/* Tekli galeri */}
          <TouchableOpacity style={styles.buyukKart} onPress={galeridenSec}>
            <View style={[styles.ikonDaire, { backgroundColor: '#10B98122' }]}>
              <Text style={styles.ikonEmoji}>🖼️</Text>
            </View>
            <Text style={styles.kartBaslik}>Galeriden Tek Fotoğraf</Text>
            <Text style={styles.kartAciklama}>Galerinizden tek bir fotoğraf seçerek analiz başlatın.</Text>
          </TouchableOpacity>

          {/* Toplu galeri */}
          <TouchableOpacity style={styles.buyukKart} onPress={topluSec}>
            <View style={[styles.ikonDaire, { backgroundColor: '#F59E0B22' }]}>
              <Text style={styles.ikonEmoji}>📂</Text>
            </View>
            <Text style={styles.kartBaslik}>Toplu Fotoğraf Yükle</Text>
            <Text style={styles.kartAciklama}>Birden fazla fotoğraf seçerek hepsini birlikte analiz edin.</Text>
          </TouchableOpacity>

          <View style={styles.bilgiKutu}>
            <Text style={styles.bilgiMetin}>
              ℹ️ Sistem; ezik, çizik, çatlak, cam kırığı, lamba ve lastik hasarını tespit edebilir.
              Tüm analizler Türkçe olarak sunulur.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }



  // ── Sonuç Ekranı ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sonucHeader}>
        <TouchableOpacity onPress={sifirla} style={styles.geriLinkBtn}>
          <Text style={styles.geriLinkMetin}>← Yeni Analiz</Text>
        </TouchableOpacity>
        <Text style={styles.sonucHeaderBaslik}>
          {goruntular.length} Fotoğraf{goruntular.length > 1 ? ' (Toplu)' : ''}
        </Text>
      </View>

      {yukleniyor ? (
        <View style={styles.yukleniyorKonteyner}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.yukleniyorMetin}>Yapay zeka analiz ediyor...</Text>
          <Text style={styles.yukleniyorAlt}>{goruntular.length} fotoğraf işleniyor</Text>
        </View>
      ) : (
        <FlatList
          data={goruntular}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => <SonucKarti item={item} index={index} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
          ListHeaderComponent={
            goruntular.some(g => g.sonuc) ? (
              <View style={styles.ozetSatiri}>
                <Text style={styles.ozetMetin}>
                  Toplam hasar: {goruntular.reduce((acc, g) => acc + (g.sonuc?.tespit_sayisi ?? 0), 0)} adet
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  menuIcerik:      { padding: 20, paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingBottom: 130 },
  baslik:          { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 6 },
  altBaslik:       { fontSize: 14, color: Colors.textMuted, marginBottom: 28 },

  buyukKart: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 22,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  ikonDaire:   { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  ikonEmoji:   { fontSize: 26 },
  kartBaslik:  { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  kartAciklama:{ fontSize: 13, color: Colors.textMuted, lineHeight: 19 },

  bilgiKutu:   { backgroundColor: '#1E3A5F', borderRadius: 12, padding: 14, marginTop: 8 },
  bilgiMetin:  { color: '#93C5FD', fontSize: 13, lineHeight: 20 },

  // Kamera
  kameraKonteyner: { flex: 1, backgroundColor: '#000' },
  kameraUst:       { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  geriBtn:         { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  geriBtnMetin:    { color: '#FFF', fontWeight: '600' },
  donBtn:          { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  donBtnMetin:     { fontSize: 22 },
  cerceve: {
    position: 'absolute', top: '25%', left: '10%', width: '80%', height: '50%',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 12,
  },
  kameraAlt:  { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 40 },
  cekBtn:     { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  cekBtnIc:   { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF' },

  // Sonuç
  sonucHeader:      { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 16 : 40, borderBottomWidth: 1, borderBottomColor: Colors.border },
  geriLinkBtn:      { marginRight: 12 },
  geriLinkMetin:    { color: Colors.primary, fontWeight: '600', fontSize: 15 },
  sonucHeaderBaslik:{ color: Colors.text, fontWeight: '700', fontSize: 16 },

  yukleniyorKonteyner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  yukleniyorMetin:     { color: Colors.text, fontSize: 17, fontWeight: '600', marginTop: 18 },
  yukleniyorAlt:       { color: Colors.textMuted, fontSize: 13, marginTop: 6 },

  ozetSatiri:  { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  ozetMetin:   { color: Colors.text, fontWeight: '600', fontSize: 14 },

  sonucKarti:  { backgroundColor: Colors.surface, borderRadius: 18, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  sonucGoruntu:{ width: '100%', height: 220 },
  sonucIcerik: { padding: 18 },
  sonucBaslik: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  sonucMesaj:  { fontSize: 13, color: Colors.textMuted, marginBottom: 14 },

  tespitKarti: { backgroundColor: '#252525', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4 },
  tespitEtiket:{ color: Colors.text, fontWeight: '600', fontSize: 14 },
  tespitSiddet:{ fontSize: 12, marginTop: 2 },
  guvenBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  guvenText:   { fontWeight: '700', fontSize: 13 },

  aiOzetKutu:  { backgroundColor: '#1A2744', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#3B82F640' },
  aiOzetBaslik:{ color: '#93C5FD', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  aiOzetMetin: { color: '#BFDBFE', fontSize: 13, lineHeight: 20 },

  hataMetin:   { color: Colors.danger, fontSize: 13, marginTop: 8 },
});
