import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { beatApi } from '../api/services';
import { Heart } from 'react-native-feather';

interface Beat {
  id: string; title: string; genre: string; bpm: number;
  price: number; artistName: string; coverUrl?: string; rating?: number;
}

export default function LikedBeatsScreen({ navigation }: any) {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await beatApi.getLiked();
      setBeats(res.data ?? []);
    } catch { setBeats([]); }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <LinearGradient colors={['rgba(168,85,247,0.15)', 'transparent']} style={styles.topBar}>
        <View style={styles.titleRow}>
          <Heart color={Colors.error} width={22} height={22} fill={Colors.error} />
          <Text style={styles.screenTitle}>Liked Beats</Text>
        </View>
        <Text style={styles.count}>{beats.length} {beats.length === 1 ? 'beat' : 'beats'} saved</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={beats}
          keyExtractor={b => b.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('BeatDetails', { beatId: item.id })}
              activeOpacity={0.8}
              style={styles.row}>
              <View style={styles.cover}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.coverImg} />
                ) : (
                  <LinearGradient colors={['#A855F7', '#06B6D4']} style={styles.coverImg}>
                    <Text style={{ fontSize: 22 }}>🎵</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.beatTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.beatArtist}>{item.artistName}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.genre}>{item.genre}</Text>
                  <Text style={styles.bpm}>{item.bpm} BPM</Text>
                </View>
              </View>
              <View style={styles.right}>
                <Text style={styles.price}>${item.price}</Text>
                {item.rating && <Text style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Heart color={Colors.textMuted} width={48} height={48} />
              <Text style={styles.emptyText}>No liked beats yet</Text>
              <Text style={styles.emptySub}>Explore and save beats you love</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingTop: 52, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.base },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  screenTitle: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary },
  count: { fontSize: Typography.sm, color: Colors.textMuted },
  list: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['3xl'], paddingTop: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  cover: { width: 60, height: 60, borderRadius: BorderRadius.md, overflow: 'hidden' },
  coverImg: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  beatTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  beatArtist: { fontSize: Typography.sm, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  genre: { fontSize: Typography.xs, color: Colors.primary },
  bpm: { fontSize: Typography.xs, color: Colors.textMuted },
  right: { alignItems: 'flex-end' },
  price: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  rating: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: Spacing['5xl'], gap: Spacing.base },
  emptyText: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textSecondary },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted },
});