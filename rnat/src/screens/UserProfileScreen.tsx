import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Image, FlatList,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { beatApi, userApi, interactionApi } from '../api/services';
import { Star, Music, TrendingUp, Award } from 'react-native-feather';

interface Beat {
  _id: string;
  title: string;
  tags: string[];
  bpm: number;
  price: number;
  author_name: string;
  author_id: string;
  image_url?: string;
  rating?: number;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  rating: number;
  avatar?: string;
}

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId, userName, username } = route.params || {};
  const displayName = userName || username || 'Unknown Producer';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      console.log('Loading profile for:', displayName, 'ID:', userId);
      
      // Fetch all beats and filter by author
      const res = await beatApi.getAll();
      const allBeats = res?.data ?? [];
      
      console.log('Total beats fetched:', allBeats?.length || 0);
      
      if (!allBeats || !Array.isArray(allBeats)) {
        console.warn('No beats data available');
        setBeats([]);
        setProfile({
          _id: userId || '',
          name: displayName,
          email: '',
          roles: ['producer'],
          rating: 0,
        });
        return;
      }
      
      const userBeats = allBeats.filter((b: Beat) => {
        const matchesId = userId && b.author_id === userId;
        const matchesName = b.author_name === displayName;
        return matchesId || matchesName;
      });
      
      console.log('User beats found:', userBeats?.length || 0);
      setBeats(userBeats || []);
      
      // Calculate REAL average rating from interaction-service
      let totalRating = 0;
      let ratedBeatsCount = 0;
      
      for (const beat of userBeats) {
        try {
          const ratingRes = await interactionApi.getRating(beat._id);
          if (ratingRes?.data?.average && ratingRes.data.average > 0) {
            totalRating += ratingRes.data.average;
            ratedBeatsCount++;
          }
        } catch {
          // Beat has no ratings yet
        }
      }
      
      const avgRating = ratedBeatsCount > 0 ? totalRating / ratedBeatsCount : 0;
      
      console.log('REAL Average rating:', avgRating, 'from', ratedBeatsCount, 'beats with ratings');
      
      // Create profile object
      const userProfile: UserProfile = {
        _id: userId || '',
        name: displayName,
        email: '',
        roles: ['producer'],
        rating: avgRating,
        avatar: userBeats?.[0]?.author_avatar,
      };
      
      console.log('Profile set:', userProfile.name, 'Rating:', userProfile.rating);
      setProfile(userProfile);
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      // Set profile anyway with empty beats
      setProfile({
        _id: userId || '',
        name: displayName,
        email: '',
        roles: ['producer'],
        rating: 0,
      });
      setBeats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId, userName]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const totalSales = beats.length; // Placeholder
  const totalRevenue = beats.reduce((sum, b) => sum + b.price, 0); // Placeholder

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      
      <FlatList
        data={beats}
        keyExtractor={item => item._id}
        ListHeaderComponent={
          <View>
            {/* Profile Header */}
            <View style={styles.headerGradient}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarWrap}>
                  {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {profile?.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.profileName}>{profile?.name || 'Unknown'}</Text>
                <Text style={styles.producerBadge}>🎵 Producer</Text>
                
                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={styles.statIconWrap}>
                      <Music width={18} height={18} color={Colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{beats.length}</Text>
                    <Text style={styles.statLabel}>Beats</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={styles.statIconWrap}>
                      <Star width={18} height={18} color="#FFD700" fill="#FFD700" />
                    </View>
                    <Text style={styles.statValue}>
                      {profile?.rating ? profile.rating.toFixed(1) : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Rating</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={styles.statIconWrap}>
                      <TrendingUp width={18} height={18} color="#10B981" />
                    </View>
                    <Text style={styles.statValue}>{totalSales}</Text>
                    <Text style={styles.statLabel}>Sales</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Beats Section */}
            <Text style={styles.sectionTitle}>Beats by {displayName.split(' ')[0]}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.beatCard}
            onPress={() => navigation.navigate('BeatDetails', { beat: item })}
            activeOpacity={0.85}
          >
            <View style={styles.beatCover}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.beatImage} />
              ) : (
                <View style={styles.beatImagePlaceholder}>
                  <Text style={styles.beatImageEmoji}>🎵</Text>
                </View>
              )}
            </View>
            <View style={styles.beatInfo}>
              <Text style={styles.beatTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.beatMeta}>
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.tags[0]}</Text>
                  </View>
                )}
                <Text style={styles.bpm}>{item.bpm} BPM</Text>
              </View>
              <View style={styles.beatBottom}>
                <Text style={styles.price}>${item.price}</Text>
                {!!item.rating && (
                  <Text style={styles.rating}>⭐ {item.rating.toFixed(1)}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎵</Text>
            <Text style={styles.emptyText}>No beats yet</Text>
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
  headerGradient: {
    paddingTop: 52,
    paddingBottom: Spacing['2xl'],
    backgroundColor: 'rgba(168,85,247,0.1)',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  avatarWrap: { marginBottom: Spacing.base },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(168,85,247,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: '#fff',
  },
  producerBadge: {
    fontSize: Typography.sm,
    color: Colors.primary,
    backgroundColor: 'rgba(168,85,247,0.15)',
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.base,
  },
  profileName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing['2xl'],
    marginTop: Spacing.base,
  },
  statItem: { alignItems: 'center' },
  statIconWrap: { marginBottom: 4 },
  statValue: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
  },
  list: { paddingBottom: Spacing['4xl'] },
  beatCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: Spacing['2xl'],
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  beatCover: { width: 80, height: 80 },
  beatImage: { width: 80, height: 80 },
  beatImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  beatImageEmoji: { fontSize: 32 },
  beatInfo: { flex: 1, padding: Spacing.sm, justifyContent: 'space-between' },
  beatTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  beatMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
  tag: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  tagText: { fontSize: 9, color: Colors.primary, fontWeight: Typography.medium },
  bpm: { fontSize: Typography.xs, color: Colors.textMuted },
  beatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  rating: { fontSize: Typography.xs, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: Spacing['4xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.base },
  emptyText: { fontSize: Typography.md, color: Colors.textSecondary, fontWeight: Typography.medium },
});
