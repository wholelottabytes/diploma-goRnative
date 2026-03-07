import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { HomeScreenNavigationProp } from './type.ts';
import config from './config';

interface Beat {
  _id: string;
  imageUrl: string | null;
  audioUrl: string | null;
  title: string;
  author: string;
  price: number;
  description: string;
  tags: string[];
  user: {
    _id: string;
    username: string;
  };
  createdAt: string;
  averageRating?: number | null;
  ratingsCount?: number | null;
}

interface ApiResponse {
  beats: Beat[];
  totalPages: number;
  currentPage: number;
  totalBeats: number;
}

const SERVER = `http://${config.serverIP}:5000`;

const AllBeatsScreen = () => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('0');
  const [maxPrice, setMaxPrice] = useState('1000');
  const [tagsQuery, setTagsQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBeats, setTotalBeats] = useState(0);

  const navigation = useNavigation<HomeScreenNavigationProp>();

  const fetchBeats = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      }

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (tagsQuery) params.append('tags', tagsQuery);
      params.append('page', pageNum.toString());

      const response = await fetch(`${SERVER}/beats/?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (pageNum === 1) {
        setBeats(data.beats);
      } else {
        setBeats(prev => [...prev, ...data.beats]);
      }

      setTotalPages(data.totalPages);
      setTotalBeats(data.totalBeats);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching beats:', error);
      Alert.alert('Error', 'Failed to load beats. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, minPrice, maxPrice, tagsQuery]);

  useEffect(() => {
    fetchBeats(1);
  }, [fetchBeats]);

  const handleRefresh = useCallback(() => {
    fetchBeats(1, true);
  }, [fetchBeats]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages) {
      fetchBeats(page + 1);
    }
  }, [fetchBeats, page, totalPages]);

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
        <Text style={styles.beatAuthor}>by {item.user?.username || 'Unknown'}</Text>
        <View style={styles.beatStats}>
          <Text style={styles.beatRating}>
            ⭐ {item.averageRating?.toFixed(1) || 'N/A'} ({item.ratingsCount || 0})
          </Text>
          <Text style={styles.beatPrice}>${item.price.toFixed(2)}</Text>
        </View>
        <Text style={styles.beatTags}>
          {item.tags?.join(', ') || 'No tags'}
        </Text>
      </View>
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
          <Text style={styles.screenTitle}>All Beats</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search in title, description, author..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filtersContainer}>
            <TextInput
              style={styles.filterInput}
              placeholder="Min price"
              placeholderTextColor="#888"
              value={minPrice}
              onChangeText={setMinPrice}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.filterInput}
              placeholder="Max price"
              placeholderTextColor="#888"
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.filterInput}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#888"
              value={tagsQuery}
              onChangeText={setTagsQuery}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#000" style={styles.loader} />
          ) : (
            <View style={styles.beatsList}>
              {beats.map(renderBeatItem)}
              {beats.length === 0 && (
                <Text style={styles.emptyText}>No beats found. Try different search criteria.</Text>
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
    marginBottom: 10,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  filterInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 10,
    fontSize: 14,
    color: '#333',
    marginHorizontal: 5,
  },
  loader: {
    marginVertical: 40,
  },
  beatsList: {
    marginBottom: 16,
  },
  beatCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    alignItems: 'center',
    elevation: 2,
    height: 110,
  },
  beatImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    margin: 15,
  },
  beatInfo: {
    flex: 1,
    padding: 15,
    paddingLeft: 0,
  },
  beatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  beatAuthor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  beatStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  beatRating: {
    fontSize: 14,
    color: '#FFD700',
  },
  beatPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'black',
  },
  beatTags: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
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
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
});

export default AllBeatsScreen;