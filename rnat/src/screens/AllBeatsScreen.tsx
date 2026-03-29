import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, RefreshControl, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { beatApi } from '../api/services';
import { Search } from 'react-native-feather';

interface Beat {
  _id: string;
  title: string;
  tags: string[];
  bpm: number;
  price: number;
  description: string;
  author_name: string;
  author_id: string;
  image_url?: string;
  audio_url?: string;
  rating?: number;
}

const BeatRow = ({ beat, onPress }: { beat: Beat; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.row}>
    <View style={styles.rowCover}>
      {beat.image_url ? (
        <Image source={{ uri: beat.image_url }} style={styles.coverImg} />
      ) : (
        <LinearGradient colors={['#A855F7', '#06B6D4']} style={styles.coverImg}>
          <Text style={{ fontSize: 20 }}>🎵</Text>
        </LinearGradient>
      )}
    </View>
    <View style={styles.rowInfo}>
      <Text style={styles.rowTitle} numberOfLines={1}>{beat.title}</Text>
      <Text style={styles.rowArtist}>{beat.author_name || 'Unknown'}</Text>
      <View style={styles.rowMeta}>
        {beat.tags && beat.tags.length > 0 && (
          <View style={styles.metaChipContainer}>
            <Text style={styles.metaChip}>{beat.tags[0]}</Text>
          </View>
        )}
        <Text style={styles.metaBpm}>{beat.bpm} BPM</Text>
      </View>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowPrice}>${beat.price}</Text>
      {!!beat.rating && (
        <Text style={styles.rowRating}>⭐ {beat.rating.toFixed(1)}</Text>
      )}
    </View>
  </TouchableOpacity>
);

export default function AllBeatsScreen({ navigation }: any) {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [filtered, setFiltered] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const res = await beatApi.getAll();
      const beatsData = res.data ?? [];
      // Map backend fields to frontend interface
      const mappedBeats: Beat[] = beatsData.map((b: any) => ({
        _id: b._id || b.id,
        title: b.title,
        tags: b.tags || [],
        bpm: b.bpm,
        price: b.price,
        description: b.description || '',
        author_name: b.author_name || b.authorName || 'Unknown',
        author_id: b.author_id || b.authorId,
        image_url: b.image_url || b.imageUrl,
        audio_url: b.audio_url || b.audioUrl,
        rating: b.rating,
      }));
      setBeats(mappedBeats);
    } catch (error) {
      console.error('Failed to load beats:', error);
      setBeats([]);
    }
  };

  useEffect(() => {
    let result = beats;
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author_name.toLowerCase().includes(query) ||
        (b.description && b.description.toLowerCase().includes(query)) ||
        (b.tags && b.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    setFiltered(result);
  }, [beats, search]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      <LinearGradient colors={['rgba(168,85,247,0.15)','transparent']} style={styles.topBar}>
        <Text style={styles.screenTitle}>Explore</Text>
        <View style={styles.searchBar}>
          <Search color={Colors.textMuted} width={16} height={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, tags, description..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            selectionColor={Colors.primary}
          />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <BeatRow beat={item} onPress={() => navigation.navigate('BeatDetails', { beat: item })} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No beats found</Text>
              <Text style={styles.emptySub}>Try a different search term</Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingTop: 52, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.base },
  screenTitle: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary, marginBottom: Spacing.base },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.base,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.base, paddingVertical: Spacing.sm },
  list: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['3xl'], paddingTop: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.base,
  },
  rowCover: { width: 56, height: 56, borderRadius: BorderRadius.md, overflow: 'hidden' },
  coverImg: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  rowArtist: { fontSize: Typography.sm, color: Colors.textSecondary },
  rowMeta: { flexDirection: 'row', gap: Spacing.xs, marginTop: 4, alignItems: 'center' },
  metaChipContainer: {
    backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
  },
  metaChip: { fontSize: Typography.xs, color: Colors.primary },
  metaBpm: { fontSize: Typography.xs, color: Colors.textMuted },
  rowRight: { alignItems: 'flex-end' },
  rowPrice: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  rowRating: { fontSize: Typography.xs, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: Spacing['4xl'] },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.md, fontWeight: Typography.medium },
  emptySub: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: Spacing.xs },
});
