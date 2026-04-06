import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Image, ScrollView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { beatApi, interactionApi } from '../api/services';
import { Star } from 'react-native-feather';

interface RatedBeat {
  _id: string;
  title: string;
  tags: string[];
  bpm: number;
  price: number;
  author_name: string;
  image_url?: string;
  userRating: number;
}

const RATING_FILTERS = [
  { label: 'All', value: 0 },
  { label: '5★', value: 5 },
  { label: '4★', value: 4 },
  { label: '3★', value: 3 },
  { label: '2★', value: 2 },
  { label: '1★', value: 1 },
];

const RatedBeatCard = ({ beat, onPress }: { beat: RatedBeat; onPress: () => void }) => (
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
          <Text style={styles.beatArtist} numberOfLines={1}>
            {beat.author_name || 'Unknown'}
          </Text>
        </View>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              width={14}
              height={14}
              fill={star <= beat.userRating ? '#FFD700' : 'transparent'}
              stroke={star <= beat.userRating ? '#FFD700' : '#666'}
            />
          ))}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${beat.price}</Text>
          <Text style={styles.bpm}>{beat.bpm} BPM</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

export default function RatedBeatsScreen({ navigation }: any) {
  const [ratedBeats, setRatedBeats] = useState<RatedBeat[]>([]);
  const [filteredBeats, setFilteredBeats] = useState<RatedBeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const authContext = useContext(AuthContext);

  const loadRatedBeats = async () => {
    try {
      const res = await beatApi.getAll();
      const allBeats = res.data ?? [];
      
      // Fetch user ratings for each beat
      const rated: RatedBeat[] = [];
      for (const beat of allBeats) {
        try {
          const ratingRes = await interactionApi.getUserRating(beat._id);
          const userRating = ratingRes.data?.value || 0;
          if (userRating > 0) {
            rated.push({ ...beat, userRating });
          }
        } catch {
          // Skip if no rating found
        }
      }
      setRatedBeats(rated);
    } catch (error) {
      console.error('Failed to load rated beats:', error);
      setRatedBeats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRatedBeats();
  }, []);

  useEffect(() => {
    if (selectedRating === 0) {
      setFilteredBeats(ratedBeats);
    } else {
      setFilteredBeats(ratedBeats.filter(b => b.userRating === selectedRating));
    }
  }, [ratedBeats, selectedRating]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRatedBeats();
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
        <Text style={styles.headerTitle}>My Ratings</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {RATING_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.value}
            onPress={() => setSelectedRating(filter.value)}
            style={[
              styles.filterChip,
              selectedRating === filter.value && styles.filterChipActive
            ]}
          >
            <Text style={[
              styles.filterText,
              selectedRating === filter.value && styles.filterTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredBeats}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <RatedBeatCard
            beat={item}
            onPress={() => navigation.navigate('BeatDetails', { beat: item })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⭐</Text>
            <Text style={styles.emptyText}>No rated beats yet</Text>
            <Text style={styles.emptySub}>Rate some beats to see them here!</Text>
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
  filterContainer: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.base,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  filterTextActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
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
  beatArtist: { fontSize: Typography.xs, color: Colors.textSecondary, flex: 1 },
  ratingRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  bpm: { fontSize: Typography.xs, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: Spacing['4xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.base },
  emptyText: { fontSize: Typography.md, color: Colors.textSecondary, fontWeight: Typography.medium },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: Spacing.xs },
});
