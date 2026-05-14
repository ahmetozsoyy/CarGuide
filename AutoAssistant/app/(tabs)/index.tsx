import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Animated, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import CustomAlert from '../../components/CustomAlert';

const API_URL = 'http://172.24.246.41:5000';

interface HistoryItem { id: number; type: 'price' | 'obd' | 'damage'; title: string; summary: string; created_at: string; }

const TABS = [
  { key: 'all', label: 'Tümü', icon: 'layers-outline' },
  { key: 'price', label: 'Fiyat', icon: 'analytics-outline' },
  { key: 'obd', label: 'OBD', icon: 'hardware-chip-outline' },
  { key: 'damage', label: 'Hasar', icon: 'scan-outline' },
] as const;

const TYPE_CONFIG: Record<string, { color: string; icon: string }> = {
  price: { color: Colors.secondary, icon: 'analytics' },
  obd: { color: Colors.warning, icon: 'hardware-chip' },
  damage: { color: Colors.danger, icon: 'scan' },
};

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
}

export default function ProfileScreen() {
  const { logout, userName, token } = useAuth();
  const [tab, setTab] = useState<string>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const avatarLetter = userName ? userName.charAt(0).toUpperCase() : '?';

  const fetchHistory = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/history`, { headers: { 'Authorization': `Bearer ${token}` }, signal });
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch (e: any) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  const filteredHistory = tab === 'all' ? history : history.filter(h => h.type === tab);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]));

  const confirmClearHistory = async () => {
    setAlertVisible(false);
    try {
      await fetch(`${API_URL}/history`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setHistory([]);
    } catch (e) { console.error(e); }
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const cfg = TYPE_CONFIG[item.type] || { color: Colors.textMuted, icon: 'document' };
    return (
      <BlurView intensity={50} tint="dark" style={styles.histCard}>
        <View style={styles.histCardContent}>
          <View style={[styles.histIconBg, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
          </View>
          <View style={styles.histContent}>
            <Text style={styles.histTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.histSummary} numberOfLines={2}>{item.summary}</Text>
            <Text style={styles.histDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </BlurView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Blobs for Glassmorphism effect */}
      <View style={[styles.bgBlob, { top: -100, right: -50, backgroundColor: 'rgba(99, 102, 241, 0.20)' }]} />
      <View style={[styles.bgBlob, { top: 300, left: -100, backgroundColor: 'rgba(244, 114, 182, 0.12)' }]} />
      
      {/* Profile Header */}
      <View style={styles.headerContainer}>
        <BlurView intensity={50} tint="prominent" style={styles.header}>
          <View style={styles.logoFrame}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{userName || 'Kullanıcı'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {(['price', 'obd', 'damage'] as const).map(type => {
          const cfg = TYPE_CONFIG[type];
          const allCount = history.filter(h => h.type === type).length;
          return (
            <BlurView key={type} intensity={40} tint="prominent" style={styles.statCard}>
              <View style={styles.statInner}>
                <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
                <Text style={styles.statCount}>{allCount}</Text>
                <Text style={styles.statLabel}>{type === 'price' ? 'Fiyat' : type === 'obd' ? 'OBD' : 'Hasar'}</Text>
              </View>
            </BlurView>
          );
        })}
      </View>

      {/* Tab Bar + Clear Button */}
      <View style={styles.tabRow}>
        <BlurView intensity={50} tint="dark" style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Ionicons name={t.icon as any} size={16} color={tab === t.key ? '#FFF' : Colors.textMuted} />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </BlurView>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setAlertVisible(true)}>
            <BlurView intensity={50} tint="dark" style={styles.clearBtnInner}>
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            </BlurView>
          </TouchableOpacity>
        )}
      </View>

      {/* History */}
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>
       : filteredHistory.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color={Colors.textMuted} style={{ opacity: 0.5 }} />
          <Text style={styles.emptyTitle}>Henüz analiz yok</Text>
          <Text style={styles.emptySub}>Analiz yaptığınızda detaylar burada listelenecek.</Text>
        </View>
       ) : (
        <FlatList data={filteredHistory} keyExtractor={i => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false} />
       )}

      <CustomAlert
        visible={alertVisible}
        title="Geçmişi Temizle"
        message="Tüm analiz geçmişiniz kalıcı olarak silinecek. Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        type="danger"
        onCancel={() => setAlertVisible(false)}
        onConfirm={confirmClearHistory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  bgBlob: { position: 'absolute', width: 350, height: 350, borderRadius: 175, filter: 'blur(90px)' as any, opacity: 0.8 },
  headerContainer: { marginTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  logoFrame: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: 36, height: 36 },
  headerInfo: { marginLeft: 16, flex: 1 },
  userName: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFF', letterSpacing: -0.3 },
  logoutBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(244, 63, 94, 0.1)', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statInner: { padding: 12, alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  statCount: { fontSize: 22, fontFamily: 'Poppins_700Bold', color: '#FFF', marginTop: 4 },
  statLabel: { fontSize: 11, fontFamily: 'Poppins_500Medium', color: '#CBD5E1' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 10, alignItems: 'center' },
  tabBar: { flexDirection: 'row', flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tab: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  tabActive: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  tabText: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Poppins_600SemiBold' },
  tabTextActive: { color: '#FFF' },
  clearBtn: { borderRadius: 16, overflow: 'hidden' },
  clearBtnInner: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)', borderRadius: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFF' },
  emptySub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.textMuted },
  histCard: { borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  histCardContent: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)' },
  histIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  histContent: { flex: 1, marginLeft: 14 },
  histTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFF', marginBottom: 2 },
  histSummary: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: '#CBD5E1', lineHeight: 18 },
  histDate: { fontSize: 10, fontFamily: 'Poppins_500Medium', color: '#94A3B8', marginTop: 4 },
});
