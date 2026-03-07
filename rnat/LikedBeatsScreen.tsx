import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import config from './config';
import { Beat, LikedBeatsScreenProps } from './type.ts';

interface ApiResponse {
  beats: Beat[];
  totalPages: number;
  currentPage: number;
  totalBeats: number;
}

const SERVER = `http://${config.serverIP}:5000`;

const LikedBeatsScreen: React.FC<LikedBeatsScreenProps> = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBeats, setTotalBeats] = useState(0);

  const fetchLikedBeats = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      if (!user?.token) {
        Alert.alert('Error', 'Authorization required');
        return;
      }

      if (isRefreshing) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      }

      const response = await axios.get<ApiResponse>(
        `${SERVER}/beats/liked`,
        {
          params: {
            search: searchQuery,
            score: scoreFilter,
            page: pageNum,
            limit: 20
          },
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );

      if (pageNum === 1) {
        setBeats(response.data.beats);
      } else {
        setBeats(prev => [...prev, ...response.data.beats]);
      }

      setTotalPages(response.data.totalPages);
      setTotalBeats(response.data.totalBeats);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Error:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || 'Failed to load beats');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, scoreFilter, user?.token]);

  useEffect(() => {
    fetchLikedBeats(1);
  }, [fetchLikedBeats]);

  const handleRefresh = useCallback(() => {
    fetchLikedBeats(1, true);
  }, [fetchLikedBeats]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages) {
      fetchLikedBeats(page + 1);
    }
  }, [fetchLikedBeats, page, totalPages]);

  const renderBeatItem = (item: Beat) => (
    <TouchableOpacity
      key={item._id}
      style={styles.beatCard}
      onPress={() => navigation.navigate('BeatDetails', { beat: item })}
    >
      <Image
        source={{ uri: item.imageUrl ? `${SERVER}/${item.imageUrl}` : 'https://via.placeholder.com/150' }}
        style={styles.beatImage}
      />
      <View style={styles.beatInfo}>
        <Text style={styles.beatTitle}>{item.title}</Text>
        <Text style={styles.beatAuthor}>{item.author}</Text>
        {item.averageRating && (
          <Text style={styles.beatRating}>★ {item.averageRating.toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (score: number) => (
    <TouchableOpacity
      key={score}
      style={[
        styles.filterButton,
        scoreFilter === score && styles.filterButtonActive
      ]}
      onPress={() => setScoreFilter(scoreFilter === score ? null : score)}
    >
      <Text style={scoreFilter === score ? styles.filterButtonTextActive : styles.filterButtonText}>
        {score}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#000"
          />
        }
        onScroll={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height >= nativeEvent.contentSize.height - 50) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View style={styles.container}>
          <Text style={styles.screenTitle}>Liked Beats</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title or author..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>

          <Text style={styles.sectionTitle}>Filter by rating:</Text>
          <View style={styles.filterContainer}>
            {[1, 2, 3, 4, 5].map(renderFilterButton)}
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#000" style={styles.loader} />
          ) : (
            <View style={styles.beatsList}>
              {beats.map(renderBeatItem)}
              {beats.length === 0 && (
                <Text style={styles.emptyText}>No beats found</Text>
              )}
            </View>
          )}

          {!isLoading && page < totalPages && (
            <TouchableOpacity 
              style={styles.loadMoreButton} 
              onPress={handleLoadMore}
            >
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.resultsText}>
            Showing {beats.length} of {totalBeats} beats
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    padding: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#000',
  },
  filterButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 40,
  },
  beatsList: {
    marginBottom: 16,
  },
  beatCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  beatImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  beatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  beatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  beatAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  beatRating: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
    fontSize: 16,
  },
  loadMoreButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  loadMoreText: {
    color: '#fff',
    fontWeight: '600',
  },
  resultsText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
});

export default LikedBeatsScreen;