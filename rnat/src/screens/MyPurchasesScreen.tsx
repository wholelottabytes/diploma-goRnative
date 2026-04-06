import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Image,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { orderApi, beatApi } from '../api/services';
import { ShoppingBag, Download } from 'react-native-feather';

interface Purchase {
  _id: string;
  beatId: string;
  beatTitle: string;
  price: number;
  licenseType: string;
  imageUrl?: string;
  audioUrl?: string;
  purchasedAt: string;
}

const PurchaseCard = ({ purchase, onPress }: { purchase: Purchase; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.cardWrap}>
    <View style={styles.card}>
      <View style={styles.coverContainer}>
        {purchase.imageUrl ? (
          <Image source={{ uri: purchase.imageUrl }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>🎵</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.beatTitle} numberOfLines={1}>{purchase.beatTitle}</Text>
        <View style={styles.metaRow}>
          <View style={styles.licenseBadge}>
            <Text style={styles.licenseText}>{purchase.licenseType}</Text>
          </View>
          <Text style={styles.date}>{new Date(purchase.purchasedAt).toLocaleDateString()}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.price}>${purchase.price}</Text>
          <View style={styles.downloadBtn}>
            <Download width={16} height={16} color={Colors.primary} />
            <Text style={styles.downloadText}>Download</Text>
          </View>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

export default function MyPurchasesScreen({ navigation }: any) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const authContext = useContext(AuthContext);

  const loadPurchases = async () => {
    try {
      const ordersRes = await orderApi.getOrders();
      const orders = ordersRes?.data ?? [];
      
      // Fetch all beats to get details
      const beatsRes = await beatApi.getAll();
      const allBeats = beatsRes?.data ?? [];
      
      // Map orders to purchases with beat details
      const userPurchases: Purchase[] = orders.map((order: any) => {
        const beat = allBeats.find((b: any) => b._id === order.beatId || b._id === order.beat_id);
        return {
          _id: order._id,
          beatId: order.beatId || order.beat_id,
          beatTitle: beat?.title || 'Unknown Beat',
          price: order.price || 0,
          licenseType: order.licenseType || order.license_type || 'MP3',
          imageUrl: beat?.image_url,
          audioUrl: beat?.audio_url,
          purchasedAt: order.createdAt || order.created_at,
        };
      });
      
      setPurchases(userPurchases);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      setPurchases([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPurchases();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Purchases</Text>
        <Text style={styles.headerSub}>{purchases.length} beats purchased</Text>
      </View>

      <FlatList
        data={purchases}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <PurchaseCard
            beat={item}
            onPress={() => navigation.navigate('BeatDetails', { beat: item })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ShoppingBag width={64} height={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No purchases yet</Text>
            <Text style={styles.emptySub}>Explore beats and make your first purchase!</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Explore')}
              style={styles.exploreBtn}
            >
              <Text style={styles.exploreText}>Explore Beats</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 52,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.base,
  },
  headerTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  list: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['4xl'] },
  cardWrap: { marginBottom: Spacing.sm },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  coverContainer: { width: 80, height: 80 },
  cover: { width: 80, height: 80 },
  coverPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEmoji: { fontSize: 32 },
  cardInfo: { flex: 1, padding: Spacing.sm, justifyContent: 'space-between' },
  beatTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  licenseBadge: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  licenseText: { fontSize: 9, color: Colors.primary, fontWeight: Typography.medium },
  date: { fontSize: Typography.xs, color: Colors.textMuted },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  downloadText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.semibold },
  empty: { alignItems: 'center', paddingTop: Spacing['4xl'] },
  emptyText: { fontSize: Typography.md, color: Colors.textSecondary, fontWeight: Typography.medium, marginTop: Spacing.lg },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  exploreBtn: {
    marginTop: Spacing['2xl'],
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  exploreText: { color: '#fff', fontSize: Typography.base, fontWeight: Typography.semibold },
});
