import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';

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
  const avatarLetter = userName ? userName.charAt(0).toUpperCase() : '?';

  const fetchHistory = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const tp = tab === 'all' ? '' : `?type=${tab}`;
      const res = await fetch(`${API_URL}/history${tp}`, { headers: { 'Authorization': `Bearer ${token}` }, signal });
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch (e: any) { if (e.name !== 'AbortError') console.error(e); }
    finally { setLoading(false); }
  }, [token, tab]);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]));

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const cfg = TYPE_CONFIG[item.type] || { color: Colors.textMuted, icon: 'document' };
    return (
      <View style={styles.histCard}>
        <View style={[styles.histIconBg, { backgroundColor: cfg.color + '18' }]}>
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>
        <View style={styles.histContent}>
          <Text style={styles.histTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.histSummary} numberOfLines={2}>{item.summary}</Text>
          <Text style={styles.histDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <LinearGradient colors={[...Colors.gradientPrimary]} style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </LinearGradient>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{userName || 'Kullanıcı'}</Text>
          <Text style={styles.userSub}>AutoAssistant Kullanıcısı</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        {(['price', 'obd', 'damage'] as const).map(type => {
          const cfg = TYPE_CONFIG[type];
          const count = history.filter(h => tab === 'all' ? h.type === type : h.type === type).length;
          const allCount = tab === 'all' ? history.filter(h => h.type === type).length : (tab === type ? history.length : 0);
          return (
            <View key={type} style={styles.statCard}>
              <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
              <Text style={styles.statCount}>{allCount}</Text>
              <Text style={styles.statLabel}>{type === 'price' ? 'Fiyat' : type === 'obd' ? 'OBD' : 'Hasar'}</Text>
            </View>
          );
        })}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon as any} size={16} color={tab === t.key ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* History */}
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
       : history.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Henüz analiz yok</Text>
          <Text style={styles.emptySub}>Analiz yaptığınızda burada görünecek.</Text>
        </View>
       ) : (
        <FlatList data={history} keyExtractor={i => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false} />
       )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10, paddingBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, color: '#FFF', fontWeight: '800' },
  headerInfo: { marginLeft: 14, flex: 1 },
  userName: { fontSize: 20, fontWeight: '800', color: Colors.text },
  userSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.danger + '15', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4 },
  statCount: { fontSize: 24, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '50' },
  tabText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textMuted },
  histCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  histIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  histContent: { flex: 1, marginLeft: 12 },
  histTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  histSummary: { fontSize: 12, color: Colors.textMuted, marginTop: 2, lineHeight: 17 },
  histDate: { fontSize: 10, color: Colors.textMuted, marginTop: 4, opacity: 0.6 },
});
