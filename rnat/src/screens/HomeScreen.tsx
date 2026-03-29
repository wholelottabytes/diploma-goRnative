import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { beatApi } from '../api/services';

const { width } = Dimensions.get('window');

interface Beat {
  _id: string;
  title: string;
  tags: string[];
  bpm: number;
  price: number;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  image_url?: string;
  rating?: number;
}

const BeatCard = ({ beat, onPress }: { beat: Beat; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.cardWrap}>
    <View style={styles.card}>
      <View style={styles.coverContainer}>
        {beat.image_url ? (
          <Image source={{ uri: beat.image_url }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>🎵</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.beatTitle} numberOfLines={1}>{beat.title}</Text>
        <View style={styles.artistRow}>
          {!!beat.author_avatar && (
            <Image source={{ uri: beat.author_avatar }} style={styles.authorMiniAvatar} />
          )}
          <Text style={styles.beatArtist} numberOfLines={1}>
            {beat.author_name || 'Unknown'}
          </Text>
        </View>
        <View style={styles.beatMeta}>
          {beat.tags && beat.tags.length > 0 ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{beat.tags[0]}</Text>
            </View>
          ) : (
            <View style={styles.tag}>
              <Text style={styles.tagText}>No tags</Text>
            </View>
          )}
          <Text style={styles.bpm}>{beat.bpm?.toString() || '—'} BPM</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${beat.price}</Text>
          {!!beat.rating && (
            <Text style={styles.rating}>⭐ {beat.rating.toFixed(1)}</Text>
          )}
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }: any) {
  const [trending, setTrending] = useState<Beat[]>([]);
  const [latest, setLatest] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const authContext = useContext(AuthContext);

  const loadBeats = async () => {
    try {
      const res = await beatApi.getAll();
      const allBeats = res.data ?? [];
      // Sort by rating for trending (top 5)
      const sorted = [...allBeats].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setTrending(sorted.slice(0, 5));
      // Latest (last 10)
      setLatest(allBeats.slice(-10).reverse());
    } catch {
      setTrending([]);
      setLatest([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBeats();
    setRefreshing(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (authContext?.user?.username) {
        setUserName(authContext.user.username);
      }
      await loadBeats();
      setLoading(false);
    };
    init();
  }, [authContext?.user]);

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
      <FlatList
        data={[]}
        keyExtractor={item => item}
        renderItem={null}
        ListHeaderComponent={
          <View>
            <View style={styles.headerGradient}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.greeting}>
                    {userName ? `Hey, ${userName} 👋` : 'Welcome 👋'}
                  </Text>
                  <Text style={styles.subGreeting}>Discover beats you'll love</Text>
                </View>
              </View>
            </View>

            {/* Trending */}
            <Text style={styles.sectionTitle}>🔥 Trending</Text>
            <FlatList
              horizontal
              data={trending}
              keyExtractor={item => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
              renderItem={({ item }) => (
                <BeatCard
                  beat={item}
                  onPress={() => navigation.navigate('BeatDetails', { beat: item })}
                />
              )}
            />

            {/* Latest */}
            <Text style={styles.sectionTitle}>🆕 Latest Drops</Text>
            <FlatList
              data={latest}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.latestList}
              renderItem={({ item }) => (
                <BeatCard
                  key={item._id}
                  beat={item}
                  onPress={() => navigation.navigate('BeatDetails', { beat: item })}
                />
              )}
            />
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
  headerGradient: { paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  subGreeting: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.base,
    marginTop: Spacing.xl,
  },
  trendingList: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.base,
    marginBottom: Spacing.lg,
  },
  latestList: {
    gap: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
  list: { 
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  cardWrap: { marginBottom: Spacing.sm },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  coverContainer: { width: 100, height: 100 },
  cover: { width: 100, height: 100 },
  coverPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEmoji: { fontSize: 36 },
  cardInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  beatTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  authorMiniAvatar: { width: 16, height: 16, borderRadius: 8 },
  beatArtist: { fontSize: Typography.xs, color: Colors.textSecondary, flex: 1 },
  beatMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tagsContainer: { flexDirection: 'row', gap: 4, flex: 1 },
  tag: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  tagText: { fontSize: 9, color: Colors.primary, fontWeight: Typography.medium },
  bpm: { fontSize: Typography.xs, color: Colors.textMuted },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  rating: { fontSize: Typography.xs, color: Colors.textSecondary },
});
