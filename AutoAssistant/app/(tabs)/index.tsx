import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';

const API_URL = 'http://172.24.246.41:5000';

interface HistoryItem {
  id: number;
  type: 'price' | 'obd' | 'damage';
  title: string;
  summary: string;
  created_at: string;
}

const TAB_CONFIG = {
  all:    { label: 'Tümü',   icon: '📋' },
  price:  { label: 'Fiyat',  icon: '💰' },
  obd:    { label: 'OBD',    icon: '🔧' },
  damage: { label: 'Hasar',  icon: '🔍' },
};

const TYPE_COLORS: Record<string, string> = {
  price:  '#10B981',
  obd:    '#F59E0B',
  damage: '#EF4444',
};

const TYPE_ICONS: Record<string, string> = {
  price:  '💰',
  obd:    '🔧',
  damage: '🔍',
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function ProfileScreen() {
  const { logout, userName, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'price' | 'obd' | 'damage'>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const avatarLetter = userName ? userName.charAt(0).toUpperCase() : '?';

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const typeParam = activeTab === 'all' ? '' : `?type=${activeTab}`;
      const response = await fetch(`${API_URL}/history${typeParam}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error('History fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab]);

  // Refresh history when screen is focused or tab changes
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    const color = TYPE_COLORS[item.type] || Colors.textMuted;
    const icon = TYPE_ICONS[item.type] || '📋';
    return (
      <View style={styles.historyCard}>
        <View style={[styles.historyIconBg, { backgroundColor: color + '18' }]}>
          <Text style={styles.historyIcon}>{icon}</Text>
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.historySummary} numberOfLines={2}>{item.summary}</Text>
          <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.typeBadgeText, { color }]}>
            {item.type === 'price' ? 'Fiyat' : item.type === 'obd' ? 'OBD' : 'Hasar'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{userName || 'Kullanıcı'}</Text>
          <Text style={styles.userSubtitle}>AutoAssistant Kullanıcısı</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {['price', 'obd', 'damage'].map((type) => {
          const count = history.filter(h => activeTab === 'all' ? h.type === type : h.type === type).length;
          return (
            <View key={type} style={styles.statCard}>
              <Text style={styles.statIcon}>{TYPE_ICONS[type]}</Text>
              <Text style={styles.statCount}>
                {activeTab === 'all' ? history.filter(h => h.type === type).length : (activeTab === type ? history.length : '-')}
              </Text>
              <Text style={styles.statLabel}>
                {type === 'price' ? 'Fiyat' : type === 'obd' ? 'OBD' : 'Hasar'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(Object.keys(TAB_CONFIG) as Array<keyof typeof TAB_CONFIG>).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {TAB_CONFIG[tab].icon} {TAB_CONFIG[tab].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* History List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>Henüz analiz yok</Text>
          <Text style={styles.emptySubtitle}>
            Fiyat tahmini, OBD sorgusu veya hasar analizi yaptığınızda burada görünecek.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderHistoryItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Logout Button */}
      <View style={styles.logoutWrapper}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary + '22',
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIcon: {
    fontSize: 20,
  },
  historyContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  historySummary: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  historyDate: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    opacity: 0.7,
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logoutWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background,
  },
  logoutButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutButtonText: {
    color: Colors.danger,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
