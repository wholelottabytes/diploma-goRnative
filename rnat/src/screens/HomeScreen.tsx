import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme/theme';
import { beatApi } from '../api/services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search } from 'react-native-feather';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing['2xl'] * 2;

interface Beat {
  id: string;
  title: string;
  genre: string;
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
      {/* Cover */}
      <View style={styles.coverContainer}>
        {beat.image_url ? (
          <Image source={{ uri: beat.image_url }} style={styles.cover} />
        ) : (
          <LinearGradient colors={['#A855F7', '#06B6D4']} style={styles.cover}>
            <Text style={styles.coverEmoji}>🎵</Text>
          </LinearGradient>
        )}
        <View style={styles.playBtn}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.beatTitle} numberOfLines={1}>{beat.title}</Text>
        <View style={styles.artistRow}>
          {beat.author_avatar && <Image source={{ uri: beat.author_avatar }} style={styles.authorMiniAvatar} />}
          <Text style={styles.beatArtist} numberOfLines={1}>{beat.author_name || 'Unknown'}</Text>
        </View>
        <View style={styles.beatMeta}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{beat.genre}</Text>
          </View>
          <Text style={styles.bpm}>{beat.bpm} BPM</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${beat.price}</Text>
          {beat.rating && (
            <Text style={styles.rating}>⭐ {beat.rating.toFixed(1)}</Text>
          )}
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }: any) {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [userName, setUserName] = useState('');
  const authContext = useContext(AuthContext);

  const loadBeats = async () => {
    try {
      const res = await beatApi.getAll();
      setBeats(res.data ?? []);
    } catch {
      setBeats([]);
    }
  };

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length > 1) {
      try {
        const res = await beatApi.search(text);
        setBeats(res.data ?? []);
      } catch {
        setBeats([]);
      }
    } else if (text.length === 0) {
      loadBeats();
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

  const renderHeader = () => (
    <View>
      {/* Top header */}
      <LinearGradient
        colors={['rgba(168,85,247,0.15)', 'transparent']}
        style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {userName ? `Hey, ${userName} 👋` : 'Welcome 👋'}
            </Text>
            <Text style={styles.subGreeting}>Discover beats you'll love</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search color={Colors.textMuted} width={18} height={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search beats, artists..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            selectionColor={Colors.primary}
          />
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>🔥 Trending Beats</Text>
    </View>
  );

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
        data={beats}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <BeatCard
            beat={item}
            onPress={() => navigation.navigate('BeatDetails', { beatId: item.id })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No beats found</Text>
            <Text style={styles.emptySubText}>Try a different search term</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
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
    marginBottom: Spacing.base,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    paddingVertical: Spacing.sm + 2,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },
  list: { paddingBottom: Spacing['3xl'] },
  cardWrap: { paddingHorizontal: Spacing['2xl'], marginBottom: Spacing.base },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  coverContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  cover: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 36 },
  playBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(168,85,247,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: Colors.white, fontSize: 10, marginLeft: 2 },
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
  authorMiniAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  beatArtist: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  beatMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tag: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.medium },
  bpm: { fontSize: Typography.xs, color: Colors.textMuted },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  rating: { fontSize: Typography.xs, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: Spacing['4xl'] },
  emptyText: { fontSize: Typography.md, color: Colors.textSecondary, fontWeight: Typography.medium },
  emptySubText: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: Spacing.xs },
});