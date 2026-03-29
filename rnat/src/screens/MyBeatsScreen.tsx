import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Image, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { beatApi } from '../api/services';
import { Plus, Edit2, Trash2, Award } from 'react-native-feather';
import { AuthContext } from '../context/AuthContext';

interface Beat {
  _id: string;
  title: string;
  tags: string[];
  bpm: number;
  price: number;
  author_name: string;
  image_url?: string;
  audio_url?: string;
}

const MyBeatCard = ({
  beat, onEdit, onDelete, onPress,
}: { beat: Beat; onEdit: () => void; onDelete: () => void; onPress: () => void; }) => (
  <View style={styles.card}>
    <TouchableOpacity onPress={onPress} style={styles.cardLeft} activeOpacity={0.8}>
      <View style={styles.cover}>
        {beat.image_url ? (
          <Image source={{ uri: beat.image_url }} style={styles.coverImg} />
        ) : (
          <LinearGradient colors={['#A855F7', '#06B6D4']} style={styles.coverImg}>
            <Text style={{ fontSize: 22 }}>🎵</Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.title} numberOfLines={1}>{beat.title}</Text>
        <View style={styles.metaRow}>
          {beat.tags && beat.tags.length > 0 && (
            <Text style={styles.genre}>{beat.tags[0]}</Text>
          )}
          <Text style={styles.bpm}>{beat.bpm} BPM</Text>
        </View>
        <Text style={styles.price}>${beat.price}</Text>
      </View>
    </TouchableOpacity>
    <View style={styles.cardActions}>
      <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
        <Edit2 color={Colors.secondary} width={16} height={16} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, styles.deleteBtn]}>
        <Trash2 color={Colors.error} width={16} height={16} />
      </TouchableOpacity>
    </View>
  </View>
);

export default function MyBeatsScreen({ navigation }: any) {
  const authContext = useContext(AuthContext);
  const userRoles = authContext?.user?.roles || [];
  const isProducer = userRoles.includes('producer');
  
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await beatApi.getMyBeats();
      setBeats(res.data ?? []);
    } catch { setBeats([]); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Beat', 'Are you sure you want to delete this beat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await beatApi.delete(id);
            setBeats(prev => prev.filter(b => b.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete beat');
          }
        },
      },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, []);

  if (!isProducer) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <LinearGradient colors={['rgba(168,85,247,0.15)','transparent']} style={styles.topBar}>
          <Text style={styles.screenTitle}>My Beats</Text>
        </LinearGradient>
        
        <View style={styles.notProducerContainer}>
          <Award color={Colors.primary} width={64} height={64} strokeWidth={1.5} />
          <Text style={styles.notProducerTitle}>Become a Producer</Text>
          <Text style={styles.notProducerSub}>
            Start selling your beats on BeatMarket!{'\n'}Upload and manage your own beats.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.becomeProducerBtn}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.becomeProducerGradient}>
              <Text style={styles.becomeProducerText}>Go to Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <LinearGradient colors={['rgba(168,85,247,0.15)', 'transparent']} style={styles.topBar}>
        <Text style={styles.screenTitle}>My Beats</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddBeat')}
          activeOpacity={0.85}>
          <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.addBtn}>
            <Plus color="#fff" width={18} height={18} />
            <Text style={styles.addBtnText}>Upload</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={beats}
          keyExtractor={b => b._id}
          renderItem={({ item }) => (
            <MyBeatCard
              beat={item}
              onPress={() => navigation.navigate('BeatDetails', { beat: item })}
              onEdit={() => navigation.navigate('EditBeat', { beatId: item._id })}
              onDelete={() => handleDelete(item._id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎼</Text>
              <Text style={styles.emptyText}>No beats yet</Text>
              <Text style={styles.emptySub}>Upload your first beat to get started</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddBeat')} activeOpacity={0.85}>
                <LinearGradient colors={['#A855F7', '#7C3AED']} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>Upload Beat</Text>
                </LinearGradient>
              </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing.base,
  },
  screenTitle: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  addBtnText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.sm },
  list: { paddingHorizontal: Spacing['2xl'], paddingBottom: Spacing['3xl'], paddingTop: Spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: Spacing.sm, overflow: 'hidden',
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, gap: Spacing.md },
  cover: { width: 60, height: 60, borderRadius: BorderRadius.md, overflow: 'hidden' },
  coverImg: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  title: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  genre: { fontSize: Typography.xs, color: Colors.primary },
  bpm: { fontSize: Typography.xs, color: Colors.textMuted },
  price: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.primary, marginTop: 4 },
  cardActions: { flexDirection: 'column', gap: Spacing.xs, paddingHorizontal: Spacing.sm },
  actionBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.12)' },
  empty: { alignItems: 'center', paddingTop: Spacing['5xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.base },
  emptyText: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textSecondary },
  emptySub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  emptyBtn: { borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing['2xl'] },
  emptyBtnText: { color: '#fff', fontWeight: Typography.semibold },
  notProducerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: Spacing['4xl'],
  },
  notProducerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  notProducerSub: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
  },
  becomeProducerBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minWidth: 200,
  },
  becomeProducerGradient: {
    paddingVertical: Spacing.base + 2,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
  },
  becomeProducerText: { color: '#fff', fontWeight: Typography.semibold, fontSize: Typography.base },
});
