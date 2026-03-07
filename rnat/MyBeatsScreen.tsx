import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './type';
import config from './config';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MyBeats'>;

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

const MyBeatsScreen = () => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBeats, setTotalBeats] = useState(0);

  const navigation = useNavigation<NavigationProp>();

  const fetchBeats = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authorization required');
        return;
      }

      if (isRefreshing) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      }

      const response = await axios.get<ApiResponse>(
        `${SERVER}/beats/my-beats`,
        {
          params: {
            search: searchQuery,
            page: pageNum,
            limit: 20
          },
          headers: { Authorization: `Bearer ${token}` }
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
      Alert.alert('Error', err.response?.data?.error || 'Failed to load beats');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);
useFocusEffect(
  useCallback(() => {
    fetchBeats(1);
  }, [fetchBeats])
);
  
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

  const deleteBeat = useCallback(async (beatId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.delete(`${SERVER}/beats/${beatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBeats(prev => prev.filter(b => b._id !== beatId));
      Alert.alert('Success', 'Beat deleted');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to delete beat');
    }
  }, []);

  const handleLongPress = useCallback((beat: Beat) => {
    Alert.alert('Actions', '', [
      {
        text: 'Edit',
        onPress: () => navigation.navigate('EditBeat', { beat }),
      },
      {
        text: 'Delete',
        onPress: () => deleteBeat(beat._id),
        style: 'destructive'
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  }, [deleteBeat, navigation]);

  const renderBeatItem = (item: Beat) => (
    <TouchableOpacity
      key={item._id}
      style={styles.beatCard}
      onPress={() => navigation.navigate('BeatDetails', { beat: item })}
      onLongPress={() => handleLongPress(item)}
    >
      <Image
        source={{ uri: item.imageUrl ? `${SERVER}/${item.imageUrl}` : 'https://via.placeholder.com/150' }}
        style={styles.beatImage}
      />
      <View style={styles.beatInfo}>
        <Text style={styles.beatTitle}>{item.title}</Text>
        <Text style={styles.beatPrice}>${item.price.toFixed(2)}</Text>
        <Text style={styles.beatDescription} numberOfLines={2}>
          {item.description}
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
          <Text style={styles.screenTitle}>My Beats</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name and description..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
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

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddBeat')}
          >
            <Text style={styles.addButtonText}>＋</Text>
          </TouchableOpacity>

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
    marginBottom: 12,
    padding: 12,
    elevation: 2,
  },
  beatImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  beatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  beatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  beatPrice: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  beatDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
  addButton: {
    backgroundColor: 'black',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
});

export default MyBeatsScreen;