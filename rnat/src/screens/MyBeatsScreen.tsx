import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Image, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/theme';
import { beatApi } from '../api/services';
import { Plus, Edit2, Trash2 } from 'react-native-feather';

interface Beat {
  id: string; title: string; genre: string; bpm: number;
  price: number; artistName: string; coverUrl?: string;
}

const MyBeatCard = ({
  beat, onEdit, onDelete, onPress,
}: { beat: Beat; onEdit: () => void; onDelete: () => void; onPress: () => void; }) => (
  <View style={styles.card}>
    <TouchableOpacity onPress={onPress} style={styles.cardLeft} activeOpacity={0.8}>
      <View style={styles.cover}>
        {beat.coverUrl ? (
          <Image source={{ uri: beat.coverUrl }} style={styles.coverImg} />
        ) : (
          <LinearGradient colors={['#A855F7', '#06B6D4']} style={styles.coverImg}>
            <Text style={{ fontSize: 22 }}>🎵</Text>
          </LinearGradient>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.title} numberOfLines={1}>{beat.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.genre}>{beat.genre}</Text>
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
          keyExtractor={b => b.id}
          renderItem={({ item }) => (
            <MyBeatCard
              beat={item}
              onPress={() => navigation.navigate('BeatDetails', { beatId: item.id })}
              onEdit={() => navigation.navigate('EditBeat', { beatId: item.id })}
              onDelete={() => handleDelete(item.id)}
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
});